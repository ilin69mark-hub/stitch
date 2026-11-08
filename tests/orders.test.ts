import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "stezhok-test-"));
process.env.PAYMENT_PROVIDER = "none";
process.env.ADMIN_TOKEN = "test-admin-token";

import { getDb } from "@/lib/db";
import {
  createOrder,
  getOrderByItemAndToken,
  getOrderByToken,
  markOrderPaid,
  OrderError,
  type CreateOrderInput,
} from "@/lib/orders";

const uploadToken = "b".repeat(64);
const uploadId = "11111111-1111-4111-8111-111111111111";

function seedUpload() {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO uploads
        (id, token, file_path, mime, size_bytes, original_name, width_px, height_px, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      uploadId,
      uploadToken,
      "/tmp/does-not-need-to-exist.webp",
      "image/webp",
      1024,
      "photo.jpg",
      1200,
      1200,
      new Date().toISOString(),
    );
}

function baseInput(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    customer: {
      name: "Анна Тестова",
      email: "anna@example.com",
      contactMethod: "Email",
      deliveryMethod: "pickup",
    },
    items: [
      {
        kind: "design",
        designId: "teply-vzglyad",
        widthCm: 20,
        heightCm: 20,
        kitId: "gift",
        optionIds: ["gift-wrap"],
        quantity: 1,
      },
    ],
    consent: true,
    ...overrides,
  };
}

beforeAll(() => {
  seedUpload();
});

describe("order creation", () => {
  it("recomputes the price on the server and ignores any client price", async () => {
    const result = await createOrder(baseInput());
    expect(result.created).toBe(true);
    expect(result.order.items_total).toBe(2000 + 990 + 390);
    expect(result.order.total).toBe(2000 + 990 + 390);
    expect(result.order.payment_status).toBe("not_configured");
    expect(result.order.status).toBe("awaiting_payment");
  });

  it("applies a valid promo on the server", async () => {
    const result = await createOrder(
      baseInput({
        customer: {
          name: "Иван Промо",
          email: "promo@example.com",
          contactMethod: "Email",
          deliveryMethod: "pickup",
        },
        promoCode: "FIRST10",
      }),
    );
    expect(result.order.discount).toBe(338);
    expect(result.order.total).toBe(3380 - 338);
    expect(result.order.promo_code).toBe("FIRST10");
  });

  it("rejects an unknown promo without creating an order", async () => {
    const before = (
      getDb().prepare("SELECT COUNT(*) AS count FROM orders").get() as {
        count: number;
      }
    ).count;
    await expect(
      createOrder(
        baseInput({
          customer: {
            name: "Пётр Неверный",
            email: "bad-promo@example.com",
            contactMethod: "Email",
            deliveryMethod: "pickup",
          },
          promoCode: "NOPE",
        }),
      ),
    ).rejects.toBeInstanceOf(OrderError);
    const after = (
      getDb().prepare("SELECT COUNT(*) AS count FROM orders").get() as {
        count: number;
      }
    ).count;
    expect(after).toBe(before);
  });

  it("enforces the first-order-only rule for the same email", async () => {
    const first = baseInput({
      customer: {
        name: "Мария Первая",
        email: "first@example.com",
        contactMethod: "Email",
        deliveryMethod: "pickup",
      },
      promoCode: "FIRST10",
    });
    await createOrder(first);

    await expect(
      createOrder({
        ...first,
        items: [
          {
            kind: "design",
            designId: "ulybka",
            widthCm: 20,
            heightCm: 20,
            kitId: "base",
            optionIds: [],
            quantity: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "promo_invalid" });
  });

  it("creates a custom order tied to a verified upload", async () => {
    const result = await createOrder(
      baseInput({
        customer: {
          name: "Ольга Фото",
          email: "photo@example.com",
          contactMethod: "Email",
          deliveryMethod: "pickup",
        },
        items: [
          {
            kind: "custom",
            uploadId,
            uploadToken,
            widthCm: 20,
            heightCm: 20,
            kitId: "base",
            optionIds: [],
            quantity: 1,
          },
        ],
      }),
    );
    expect(result.items[0]!.kind).toBe("custom");
    expect(result.items[0]!.upload_id).toBe(uploadId);
    expect(result.order.total).toBe(2699);
  });

  it("rejects a custom order with a wrong upload token", async () => {
    await expect(
      createOrder(
        baseInput({
          items: [
            {
              kind: "custom",
              uploadId,
              uploadToken: "c".repeat(64),
              widthCm: 10,
              heightCm: 10,
              kitId: "base",
              optionIds: [],
              quantity: 1,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "upload_not_found" });
  });

  it("is idempotent for the same key", async () => {
    const input = baseInput({
      idempotencyKey: "idem-key-123",
      customer: {
        name: "Идем Потент",
        email: "idem@example.com",
        contactMethod: "Email",
        deliveryMethod: "pickup",
      },
    });
    const first = await createOrder(input);
    const second = await createOrder(input);
    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);
    expect(second.order.number).toBe(first.order.number);
  });

  it("requires consent", async () => {
    await expect(
      createOrder(baseInput({ consent: false as unknown as true })),
    ).rejects.toMatchObject({ code: "consent_required" });
  });
});

describe("order access and payment state", () => {
  it("only returns an order with the correct access token", async () => {
    const result = await createOrder(
      baseInput({
        customer: {
          name: "Доступ Тестов",
          email: "access@example.com",
          contactMethod: "Email",
          deliveryMethod: "pickup",
        },
      }),
    );
    expect(getOrderByToken(result.order.id, "wrong")).toBeUndefined();
    expect(
      getOrderByToken(result.order.id, result.order.access_token)?.order.id,
    ).toBe(result.order.id);
  });

  it("links a custom photo to the order through the access token", async () => {
    const result = await createOrder(
      baseInput({
        customer: {
          name: "Фото Доступ",
          email: "photo-access@example.com",
          contactMethod: "Email",
          deliveryMethod: "pickup",
        },
        items: [
          {
            kind: "custom",
            uploadId,
            uploadToken,
            widthCm: 10,
            heightCm: 10,
            kitId: "base",
            optionIds: [],
            quantity: 1,
          },
        ],
      }),
    );
    const item = result.items[0]!;
    expect(
      getOrderByItemAndToken(
        result.order.id,
        item.id,
        result.order.access_token,
      )?.item.upload_id,
    ).toBe(uploadId);
    expect(
      getOrderByItemAndToken(result.order.id, item.id, "wrong-token"),
    ).toBeUndefined();
  });

  it("does not mark an order paid when the amount differs", async () => {
    const result = await createOrder(
      baseInput({
        customer: {
          name: "Сумма Тестов",
          email: "amount@example.com",
          contactMethod: "Email",
          deliveryMethod: "pickup",
        },
      }),
    );
    expect(() =>
      markOrderPaid({
        orderId: result.order.id,
        providerPaymentId: "pay_wrong",
        amount: result.order.total - 1,
        currency: "RUB",
        provider: "yookassa",
        eventType: "payment.succeeded",
      }),
    ).toThrow(OrderError);

    const unchanged = getOrderByToken(
      result.order.id,
      result.order.access_token,
    )!.order;
    expect(unchanged.payment_status).not.toBe("paid");
  });

  it("marks an order paid after a verified amount and is idempotent", async () => {
    const result = await createOrder(
      baseInput({
        customer: {
          name: "Оплата Тестова",
          email: "paid@example.com",
          contactMethod: "Email",
          deliveryMethod: "pickup",
        },
      }),
    );
    const first = markOrderPaid({
      orderId: result.order.id,
      providerPaymentId: "pay_correct",
      amount: result.order.total,
      currency: "RUB",
      provider: "yookassa",
      eventType: "payment.succeeded",
    });
    const second = markOrderPaid({
      orderId: result.order.id,
      providerPaymentId: "pay_correct",
      amount: result.order.total,
      currency: "RUB",
      provider: "yookassa",
      eventType: "payment.succeeded",
    });
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const paid = getOrderByToken(
      result.order.id,
      result.order.access_token,
    )!.order;
    expect(paid.payment_status).toBe("paid");
    expect(paid.status).toBe("paid");
  });
});
