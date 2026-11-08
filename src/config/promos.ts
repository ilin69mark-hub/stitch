import type { Promo } from "@/types";

/**
 * Promo codes are validated on the server when an order is created. The client
 * only asks the server for a preview; it never decides the final discount.
 */
export const promos: Promo[] = [
  {
    code: "FIRST10",
    kind: "percent",
    percent: 10,
    active: true,
    startsAt: "2025-01-01T00:00:00.000Z",
    endsAt: "2030-12-31T23:59:59.999Z",
    minSubtotal: 990,
    maxDiscount: 1500,
    onePerCustomer: true,
    firstOrderOnly: true,
    stackable: false,
    description: "10% на первый заказ от 990 ₽. Один раз на покупателя.",
  },
];

export const promoByCode = new Map(
  promos.map((promo) => [promo.code.toUpperCase(), promo]),
);
