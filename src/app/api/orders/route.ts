import { jsonError, jsonOk, limitRequest, contentLengthTooLarge } from "@/lib/api";
import {
  createOrder,
  OrderError,
  toPublicOrder,
  type CreateOrderInput,
} from "@/lib/orders";
import { createOrderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const limited = limitRequest(request, "order", 10, 60_000);
  if (limited) return limited;

  if (contentLengthTooLarge(request, 512_000)) {
    return jsonError("too_large", "Слишком большой запрос.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_json", "Некорректный запрос.", 400);
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(
      "invalid_input",
      issue?.message ?? "Проверьте данные заказа.",
      400,
      { path: issue?.path },
    );
  }

  const input: CreateOrderInput = {
    idempotencyKey: parsed.data.idempotencyKey,
    customer: parsed.data.customer,
    items: parsed.data.items,
    promoCode: parsed.data.promoCode,
    consent: true,
    consentVersion: parsed.data.consentVersion,
  };

  try {
    const result = await createOrder(input);
    return jsonOk(
      {
        order: toPublicOrder(result.order),
        orderToken: result.order.access_token,
        created: result.created,
        payment: result.payment,
      },
      result.created ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof OrderError) {
      return jsonError(error.code, error.message, error.status, error.details);
    }
    return jsonError(
      "order_failed",
      "Не удалось создать заказ. Попробуйте позже.",
      500,
    );
  }
}
