import { jsonError, jsonOk, limitRequest } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  markOrderPaid,
  markPaymentFailed,
  OrderError,
} from "@/lib/orders";
import {
  getYooKassaProvider,
  isAllowedWebhookIp,
} from "@/lib/payments";
import { clientIp, safeEqual } from "@/lib/secure";

interface YooKassaNotification {
  type?: string;
  event?: string;
  object?: {
    id?: string;
    status?: string;
    paid?: boolean;
    amount?: { value?: string; currency?: string };
    metadata?: Record<string, string>;
  };
}

function markProcessed(id: string) {
  getDb()
    .prepare("UPDATE webhook_events SET processed_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

export async function POST(request: Request) {
  const limited = limitRequest(request, "yookassa-webhook", 120, 60_000);
  if (limited) return limited;

  const secret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
  if (secret) {
    const supplied = new URL(request.url).searchParams.get("secret") ?? "";
    if (!safeEqual(supplied, secret)) {
      return jsonError("unauthorized", "Неверный секрет уведомления.", 401);
    }
  }

  if (!isAllowedWebhookIp(clientIp(request))) {
    return jsonError("forbidden", "IP-адрес не разрешён.", 403);
  }

  let body: YooKassaNotification;
  try {
    body = (await request.json()) as YooKassaNotification;
  } catch {
    return jsonError("bad_json", "Некорректное уведомление.", 400);
  }

  const event = body.event ?? "";
  const objectId = body.object?.id;
  if (!event.startsWith("payment.") || !objectId) {
    return jsonError("bad_notification", "Некорректное уведомление.", 400);
  }

  const eventKey = `yookassa:${event}:${objectId}`;
  const db = getDb();
  const existing = db
    .prepare("SELECT processed_at FROM webhook_events WHERE id = ?")
    .get(eventKey) as { processed_at: string | null } | undefined;

  if (existing?.processed_at) {
    return jsonOk({ ok: true, duplicate: true });
  }

  if (!existing) {
    db.prepare(
      `INSERT INTO webhook_events
        (id, provider, event_type, received_at, processed_at, payload_json)
       VALUES (?, ?, ?, ?, NULL, ?)`,
    ).run(
      eventKey,
      "yookassa",
      event,
      new Date().toISOString(),
      JSON.stringify(body),
    );
  }

  let provider;
  try {
    provider = getYooKassaProvider();
  } catch {
    return jsonError(
      "not_configured",
      "Платёжный провайдер не настроен.",
      503,
    );
  }

  let payment;
  try {
    payment = await provider.fetchPayment(objectId);
  } catch {
    // Leave processed_at empty so YooKassa can retry the notification.
    return jsonError(
      "provider_unavailable",
      "Не удалось проверить платёж. Повторите позже.",
      503,
    );
  }

  const orderId = payment.metadata.orderId;
  if (!orderId) {
    markProcessed(eventKey);
    return jsonOk({ ok: true, ignored: "no_order" });
  }

  if (
    payment.id !== objectId ||
    (body.object?.metadata?.orderId &&
      body.object.metadata.orderId !== orderId)
  ) {
    markProcessed(eventKey);
    return jsonOk({ ok: true, ignored: "mismatch" });
  }

  if (event === "payment.succeeded") {
    const amount = Math.round(Number(payment.amount));
    if (
      payment.status !== "succeeded" ||
      !payment.paid ||
      !Number.isFinite(amount)
    ) {
      markProcessed(eventKey);
      return jsonOk({ ok: true, ignored: "not_succeeded" });
    }

    try {
      markOrderPaid({
        orderId,
        providerPaymentId: payment.id,
        amount,
        currency: payment.currency,
        provider: "yookassa",
        eventType: event,
      });
      markProcessed(eventKey);
      return jsonOk({ ok: true });
    } catch (error) {
      markProcessed(eventKey);
      if (error instanceof OrderError) {
        return jsonOk({ ok: false, ignored: error.code });
      }
      return jsonOk({ ok: false, ignored: "processing_error" });
    }
  }

  if (event === "payment.canceled") {
    try {
      markPaymentFailed({
        orderId,
        providerPaymentId: payment.id,
        provider: "yookassa",
        eventType: event,
        status: "cancelled",
      });
    } catch {
      // The event is stored for the owner; do not make the provider retry a
      // terminal notification forever.
    }
    markProcessed(eventKey);
    return jsonOk({ ok: true });
  }

  markProcessed(eventKey);
  return jsonOk({ ok: true, ignored: "event" });
}
