import { randomBytes, randomUUID } from "node:crypto";
import { boxById } from "@/config/boxes";
import { kitById, optionById } from "@/config/kits";
import { siteConfig } from "@/config/site";
import { getDb, withTransaction } from "@/lib/db";
import {
  calculateCartTotals,
  calculatePrice,
  PricingError,
  type PromoContext,
} from "@/lib/pricing";
import {
  getPaymentConfig,
  getPaymentProvider,
} from "@/lib/payments";
import { PaymentError } from "@/lib/payments/types";
import { yookassaDescription } from "@/lib/payments/yookassa";
import { safeEqual } from "@/lib/secure";
import { getUpload } from "@/lib/uploads";
import type {
  OrderStatus,
  PaymentStatus,
  PriceInput,
  PublicOrder,
  PublicOrderItem,
} from "@/types";

export interface OrderItemInput {
  kind: "design" | "custom" | "box";
  designId?: string;
  boxId?: string;
  uploadId?: string;
  uploadToken?: string;
  widthCm?: number;
  heightCm?: number;
  kitId?: string;
  optionIds?: string[];
  quantity: number;
  comment?: string;
}

export interface CreateOrderInput {
  idempotencyKey?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    contactMethod: string;
    deliveryMethod: string;
    comment?: string;
  };
  items: OrderItemInput[];
  promoCode?: string;
  consent: true;
  consentVersion?: string;
}

export class OrderError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface OrderRow {
  id: string;
  number: number;
  access_token: string;
  idempotency_key: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_provider: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  contact_method: string;
  delivery_method: string;
  comment: string | null;
  promo_code: string | null;
  items_total: number;
  discount: number;
  total: number;
  currency: string;
  consent_at: string;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  id: number;
  order_id: string;
  kind: "design" | "custom" | "box";
  ref_id: string | null;
  title: string;
  subtitle: string;
  width_cm: number | null;
  height_cm: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  options_json: string;
  upload_id: string | null;
}

interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  status: string;
  amount: number;
  currency: string;
  confirmation_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAttempt {
  mode: "test" | "live" | "none";
  configured: boolean;
  confirmationUrl?: string | null;
  error?: string;
  notice?: string;
}

export interface CreateOrderResult {
  order: OrderRow;
  items: OrderItemRow[];
  created: boolean;
  payment: PaymentAttempt;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getOrderRow(id: string): OrderRow | undefined {
  return getDb()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(id) as OrderRow | undefined;
}

function getOrderItems(orderId: string): OrderItemRow[] {
  return getDb()
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC")
    .all(orderId) as unknown as OrderItemRow[];
}

function getLatestPayment(orderId: string): PaymentRow | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(orderId) as PaymentRow | undefined;
}

function countPriorOrders(email: string): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM orders WHERE lower(customer_email) = lower(?) AND status != 'cancelled'",
    )
    .get(email) as { count: number };
  return row.count;
}

function countPriorPromoUse(email: string, code: string): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM orders WHERE lower(customer_email) = lower(?) AND upper(promo_code) = upper(?) AND status != 'cancelled'",
    )
    .get(email, code) as { count: number };
  return row.count;
}

function addEvent(
  orderId: string,
  type: string,
  payload: Record<string, unknown> = {},
) {
  getDb()
    .prepare(
      "INSERT INTO order_events (order_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(orderId, type, JSON.stringify(payload), nowIso());
}

function buildSubtitle(input: OrderItemInput, width?: number, height?: number) {
  const kit = input.kitId ? kitById.get(input.kitId) : undefined;
  const optionTitles = (input.optionIds ?? [])
    .map((id) => optionById.get(id)?.title)
    .filter(Boolean);

  if (input.kind === "box") {
    const box = boxById.get(input.boxId!);
    return [box?.sizeLabel, "фиксированный состав"].filter(Boolean).join(" · ");
  }

  const parts = [
    `${width} × ${height} см`,
    input.kind === "custom" ? "по фото" : undefined,
    kit?.title,
    ...optionTitles,
  ].filter(Boolean);

  return parts.join(" · ");
}

function toPriceInput(input: OrderItemInput): PriceInput {
  if (input.kind === "box") {
    return {
      kind: "box",
      boxId: input.boxId ?? "",
      quantity: input.quantity,
    };
  }

  if (input.kind === "custom") {
    return {
      kind: "custom",
      widthCm: input.widthCm ?? 0,
      heightCm: input.heightCm ?? 0,
      kitId: input.kitId ?? "",
      optionIds: input.optionIds ?? [],
      quantity: input.quantity,
    };
  }

  return {
    kind: "design",
    designId: input.designId ?? "",
    widthCm: input.widthCm ?? 0,
    heightCm: input.heightCm ?? 0,
    kitId: input.kitId ?? "",
    optionIds: input.optionIds ?? [],
    quantity: input.quantity,
  };
}

function validateCustomUploads(items: OrderItemInput[]) {
  for (const item of items) {
    if (item.kind !== "custom") continue;
    if (!item.uploadId || !item.uploadToken) {
      throw new OrderError(
        "upload_required",
        "Для индивидуального заказа нужно загрузить фотографию.",
      );
    }
    const upload = getUpload(item.uploadId, item.uploadToken);
    if (!upload) {
      throw new OrderError(
        "upload_not_found",
        "Фотография не найдена или ссылка на неё устарела. Загрузите её ещё раз.",
      );
    }
  }
}

function buildItemRow(
  input: OrderItemInput,
  breakdown: ReturnType<typeof calculatePrice>,
): Omit<OrderItemRow, "id" | "order_id"> {
  const optionSnapshot = [...new Set(input.optionIds ?? [])]
    .map((id) => optionById.get(id))
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .map((option) => ({
      id: option.id,
      title: option.title,
      price: option.price,
    }));

  const refId =
    input.kind === "design"
      ? input.designId ?? null
      : input.kind === "box"
        ? input.boxId ?? null
        : null;

  return {
    kind: input.kind,
    ref_id: refId,
    title: breakdown.title,
    subtitle: buildSubtitle(
      input,
      breakdown.widthCm,
      breakdown.heightCm,
    ),
    width_cm: breakdown.widthCm ?? null,
    height_cm: breakdown.heightCm ?? null,
    quantity: input.quantity,
    unit_price: breakdown.subtotal,
    total_price: breakdown.itemsTotal,
    options_json: JSON.stringify(optionSnapshot),
    upload_id: input.kind === "custom" ? input.uploadId ?? null : null,
  };
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (!input.consent) {
    throw new OrderError(
      "consent_required",
      "Нужно согласие на обработку персональных данных.",
    );
  }

  if (input.idempotencyKey) {
    const existing = getDb()
      .prepare("SELECT * FROM orders WHERE idempotency_key = ?")
      .get(input.idempotencyKey) as OrderRow | undefined;
    if (existing) {
      const payment = getLatestPayment(existing.id);
      return {
        order: existing,
        items: getOrderItems(existing.id),
        created: false,
        payment: {
          mode: getPaymentConfig().mode,
          configured: getPaymentConfig().configured,
          confirmationUrl: payment?.confirmation_url ?? null,
        },
      };
    }
  }

  validateCustomUploads(input.items);

  const priceInputs = input.items.map(toPriceInput);
  const promoContext: PromoContext = {
    priorOrders: countPriorOrders(input.customer.email),
    priorPromoRedemptions: input.promoCode
      ? countPriorPromoUse(input.customer.email, input.promoCode)
      : 0,
  };

  let totals: ReturnType<typeof calculateCartTotals>;
  try {
    totals = calculateCartTotals(priceInputs, input.promoCode, promoContext);
  } catch (error) {
    if (error instanceof PricingError) {
      throw new OrderError(error.code, error.message, 422);
    }
    throw error;
  }

  if (input.promoCode && !totals.promo?.valid) {
    throw new OrderError(
      "promo_invalid",
      totals.promo?.message ?? "Промокод недействителен.",
      422,
      { reason: totals.promo?.reason },
    );
  }

  const paymentConfig = getPaymentConfig();
  const id = randomUUID();
  const accessToken = randomBytes(32).toString("hex");
  const idempotencyKey = input.idempotencyKey ?? randomUUID();
  const createdAt = nowIso();

  const row = withTransaction(getDb(), () => {
    const next = getDb()
      .prepare("SELECT COALESCE(MAX(number), 1000) + 1 AS next FROM orders")
      .get() as { next: number };

    getDb()
      .prepare(
        `INSERT INTO orders (
          id, number, access_token, idempotency_key, status, payment_status,
          payment_provider, customer_name, customer_email, customer_phone,
          contact_method, delivery_method, comment, promo_code,
          items_total, discount, total, currency, consent_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        next.next,
        accessToken,
        idempotencyKey,
        "awaiting_payment",
        paymentConfig.configured ? "pending" : "not_configured",
        paymentConfig.provider,
        input.customer.name,
        input.customer.email,
        input.customer.phone ?? null,
        input.customer.contactMethod,
        input.customer.deliveryMethod,
        input.customer.comment ?? null,
        totals.promo?.valid ? totals.promo.code : null,
        totals.itemsTotal,
        totals.discount,
        totals.total,
        "RUB",
        createdAt,
        createdAt,
        createdAt,
      );

    const insertItem = getDb().prepare(
      `INSERT INTO order_items (
        order_id, kind, ref_id, title, subtitle, width_cm, height_cm,
        quantity, unit_price, total_price, options_json, upload_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    input.items.forEach((item, index) => {
      const itemRow = buildItemRow(item, totals.lines[index]!);
      insertItem.run(
        id,
        itemRow.kind,
        itemRow.ref_id,
        itemRow.title,
        itemRow.subtitle,
        itemRow.width_cm,
        itemRow.height_cm,
        itemRow.quantity,
        itemRow.unit_price,
        itemRow.total_price,
        itemRow.options_json,
        itemRow.upload_id,
      );
    });

    getDb()
      .prepare(
        "INSERT INTO order_events (order_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(
        id,
        "order_created",
        JSON.stringify({
          itemsTotal: totals.itemsTotal,
          discount: totals.discount,
          total: totals.total,
          promoCode: totals.promo?.valid ? totals.promo.code : null,
          itemCount: input.items.length,
        }),
        createdAt,
      );

    return getOrderRow(id)!;
  });

  let payment: PaymentAttempt = {
    mode: paymentConfig.mode,
    configured: paymentConfig.configured,
    notice: paymentConfig.notice,
  };

  if (paymentConfig.configured) {
    payment = await startPayment(row);
  } else {
    addEvent(id, "payment_not_configured", { provider: paymentConfig.provider });
  }

  return {
    order: getOrderRow(id)!,
    items: getOrderItems(id),
    created: true,
    payment,
  };
}

export async function startPayment(order: OrderRow): Promise<PaymentAttempt> {
  if (order.status === "paid" || order.payment_status === "paid") {
    throw new OrderError("already_paid", "Заказ уже оплачен.", 409);
  }

  const existing = getLatestPayment(order.id);
  if (
    existing &&
    existing.status === "pending" &&
    existing.confirmation_url
  ) {
    return {
      mode: getPaymentConfig().mode,
      configured: true,
      confirmationUrl: existing.confirmation_url,
    };
  }

  const provider = getPaymentProvider();
  const config = getPaymentConfig();
  if (!provider.configured) {
    return {
      mode: "none",
      configured: false,
      notice: config.notice,
    };
  }

  const paymentId = randomUUID();
  const idempotenceKey = randomUUID();
  const returnUrl = `${siteConfig.url.replace(/\/$/, "")}/order/${order.id}?token=${order.access_token}`;

  try {
    const session = await provider.createPayment({
      orderId: order.id,
      orderNumber: order.number,
      total: order.total,
      currency: order.currency,
      description: yookassaDescription(order.number),
      returnUrl,
      idempotenceKey,
    });

    const timestamp = nowIso();
    getDb()
      .prepare(
        `INSERT INTO payments (
          id, order_id, provider, provider_payment_id, status, amount,
          currency, confirmation_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        paymentId,
        order.id,
        provider.id,
        session.providerPaymentId,
        session.status || "pending",
        order.total,
        order.currency,
        session.confirmationUrl,
        timestamp,
        timestamp,
      );

    getDb()
      .prepare(
        "UPDATE orders SET payment_status = ?, payment_provider = ?, updated_at = ? WHERE id = ?",
      )
      .run("pending", provider.id, timestamp, order.id);

    addEvent(order.id, "payment_created", {
      provider: provider.id,
      paymentId: session.providerPaymentId,
      amount: order.total,
    });

    return {
      mode: provider.mode,
      configured: true,
      confirmationUrl: session.confirmationUrl,
    };
  } catch (error) {
    const message =
      error instanceof PaymentError
        ? error.message
        : "Не удалось создать платёжную сессию.";
    getDb()
      .prepare(
        "UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?",
      )
      .run("failed", nowIso(), order.id);
    addEvent(order.id, "payment_failed", { message });
    return {
      mode: config.mode,
      configured: true,
      error: message,
    };
  }
}

export function getOrder(id: string): OrderRow | undefined {
  return getOrderRow(id);
}

export function getOrderWithItems(
  id: string,
): { order: OrderRow; items: OrderItemRow[] } | undefined {
  const order = getOrderRow(id);
  if (!order) return undefined;
  return { order, items: getOrderItems(id) };
}

export function getOrderByToken(
  id: string,
  token: string,
): { order: OrderRow; items: OrderItemRow[] } | undefined {
  const order = getOrderRow(id);
  if (!order || !token) return undefined;
  if (!safeEqual(order.access_token, token)) return undefined;
  return { order, items: getOrderItems(id) };
}

export function getOrderByItemAndToken(
  orderId: string,
  itemId: number,
  token: string,
): { order: OrderRow; item: OrderItemRow } | undefined {
  const result = getOrderByToken(orderId, token);
  if (!result) return undefined;
  const item = result.items.find((entry) => entry.id === itemId);
  if (!item) return undefined;
  return { order: result.order, item };
}

export function toPublicOrder(order: OrderRow): PublicOrder {
  const items = getOrderItems(order.id);
  const payment = getLatestPayment(order.id);
  const config = getPaymentConfig();

  const publicItems: PublicOrderItem[] = items.map((item) => ({
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    widthCm: item.width_cm ?? undefined,
    heightCm: item.height_cm ?? undefined,
    previewUrl:
      item.kind === "custom" && item.upload_id
        ? `/api/orders/${order.id}/photo/${item.id}?token=${order.access_token}`
        : undefined,
  }));

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentProvider: order.payment_provider,
    subtotal: order.items_total,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    createdAt: order.created_at,
    promoCode: order.promo_code,
    items: publicItems,
    paymentConfigured: config.configured,
    paymentUrl:
      payment?.status === "pending" ? payment.confirmation_url : null,
  };
}

export function markOrderPaid(input: {
  orderId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  provider: string;
  eventType: string;
}): { changed: boolean } {
  const order = getOrderRow(input.orderId);
  if (!order) {
    throw new OrderError("order_not_found", "Заказ не найден.", 404);
  }

  if (order.payment_status === "paid") {
    return { changed: false };
  }

  if (input.amount !== order.total || input.currency !== order.currency) {
    addEvent(order.id, "payment_amount_mismatch", {
      expected: order.total,
      received: input.amount,
      currency: input.currency,
      providerPaymentId: input.providerPaymentId,
    });
    throw new OrderError(
      "amount_mismatch",
      "Сумма платежа не совпадает с суммой заказа.",
      409,
    );
  }

  withTransaction(getDb(), () => {
    const timestamp = nowIso();
    getDb()
      .prepare(
        "UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?",
      )
      .run("paid", "paid", timestamp, order.id);
    getDb()
      .prepare(
        "UPDATE payments SET status = ?, updated_at = ? WHERE provider_payment_id = ?",
      )
      .run("paid", timestamp, input.providerPaymentId);
    getDb()
      .prepare(
        "INSERT INTO order_events (order_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(
        order.id,
        "payment_succeeded",
        JSON.stringify({
          provider: input.provider,
          providerPaymentId: input.providerPaymentId,
          eventType: input.eventType,
          amount: input.amount,
        }),
        timestamp,
      );
  });

  return { changed: true };
}

export function markPaymentFailed(input: {
  orderId: string;
  providerPaymentId: string;
  provider: string;
  eventType: string;
  status: "failed" | "cancelled";
}): { changed: boolean } {
  const order = getOrderRow(input.orderId);
  if (!order) {
    throw new OrderError("order_not_found", "Заказ не найден.", 404);
  }
  if (order.payment_status === "paid") return { changed: false };

  const timestamp = nowIso();
  withTransaction(getDb(), () => {
    getDb()
      .prepare(
        "UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?",
      )
      .run("payment_failed", input.status, timestamp, order.id);
    getDb()
      .prepare(
        "UPDATE payments SET status = ?, updated_at = ? WHERE provider_payment_id = ?",
      )
      .run(input.status, timestamp, input.providerPaymentId);
    getDb()
      .prepare(
        "INSERT INTO order_events (order_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(
        order.id,
        "payment_failed",
        JSON.stringify({
          provider: input.provider,
          providerPaymentId: input.providerPaymentId,
          eventType: input.eventType,
          status: input.status,
        }),
        timestamp,
      );
  });

  return { changed: true };
}

export function listOrders(limit = 100): Array<Omit<OrderRow, "access_token">> {
  const rows = getDb()
    .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?")
    .all(Math.min(Math.max(limit, 1), 500)) as unknown as OrderRow[];
  return rows.map((row) => {
    const order = { ...row } as Partial<OrderRow>;
    delete order.access_token;
    return order as Omit<OrderRow, "access_token">;
  });
}

export function orderItemPreviewPath(
  orderId: string,
  itemId: number,
  token: string,
): string {
  return `/api/orders/${orderId}/photo/${itemId}?token=${token}`;
}

export type { OrderItemRow, OrderRow, PaymentRow };

export function promoContextForEmail(
  email: string,
  code?: string,
): PromoContext {
  return {
    priorOrders: countPriorOrders(email),
    priorPromoRedemptions: code ? countPriorPromoUse(email, code) : 0,
  };
}
