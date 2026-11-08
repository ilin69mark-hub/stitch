import { describe, expect, it } from "vitest";
import { pricingConfig, standardSizes } from "@/config/pricing";
import { boxes } from "@/config/boxes";
import {
  calculateBasePrice,
  calculateCartTotals,
  calculatePrice,
  evaluatePromo,
  validateDimensions,
  validateQuantity,
  type PriceInput,
} from "@/lib/pricing";
import type { CustomSelection, DesignSelection } from "@/types";

const ready = (overrides: Partial<DesignSelection> = {}): DesignSelection => ({
  kind: "design",
  designId: "teply-vzglyad",
  widthCm: 10,
  heightCm: 10,
  kitId: "base",
  optionIds: [],
  quantity: 1,
  ...overrides,
});

const custom = (overrides: Partial<CustomSelection> = {}): CustomSelection => ({
  kind: "custom",
  widthCm: 10,
  heightCm: 10,
  kitId: "base",
  optionIds: [],
  quantity: 1,
  ...overrides,
});

describe("dimension validation", () => {
  it("accepts the minimum size", () => {
    expect(validateDimensions(5, 5).valid).toBe(true);
  });

  it("accepts the maximum side", () => {
    expect(validateDimensions(100, 100).valid).toBe(true);
  });

  it("rejects zero and negative values", () => {
    expect(validateDimensions(0, 10).valid).toBe(false);
    expect(validateDimensions(-5, 10).valid).toBe(false);
    expect(validateDimensions(10, -1).valid).toBe(false);
  });

  it("rejects values outside the configured range", () => {
    expect(validateDimensions(4.5, 10).valid).toBe(false);
    expect(validateDimensions(100.5, 10).valid).toBe(false);
  });

  it("rejects values that do not match the configured step", () => {
    expect(validateDimensions(10.3, 10).valid).toBe(false);
    expect(validateDimensions(10.5, 10).valid).toBe(true);
  });

  it("rejects an area above the limit", () => {
    const original = pricingConfig.maxAreaCm2;
    expect(original).toBeGreaterThan(0);
    // 100 × 100 is exactly the configured maximum area.
    expect(validateDimensions(100, 100).valid).toBe(true);
    // A larger side also produces a larger area and must be rejected.
    expect(validateDimensions(100.5, 100).valid).toBe(false);
  });
});

describe("base price", () => {
  it("applies the minimum price for a tiny canvas", () => {
    expect(calculateBasePrice(5, 5)).toBe(pricingConfig.minimumPrice);
  });

  it("calculates every standard size", () => {
    const expected: Record<string, number> = {
      "5x5": 299,
      "10x5": 299,
      "10x10": 500,
      "20x20": 2000,
      "30x30": 4500,
    };
    for (const size of standardSizes) {
      expect(calculateBasePrice(size.widthCm, size.heightCm)).toBe(
        expected[size.id],
      );
    }
  });

  it("uses the square-centimetre rate above the minimum", () => {
    expect(calculateBasePrice(20, 10)).toBe(1000);
    expect(calculateBasePrice(100, 80)).toBe(40_000);
  });
});

describe("design and kit pricing", () => {
  it("prices a ready design without the custom multiplier", () => {
    const line = calculatePrice(ready());
    expect(line.designPrice).toBe(500);
    expect(line.subtotal).toBe(500);
    expect(line.itemsTotal).toBe(500);
  });

  it("prices an individual design with multiplier and fee", () => {
    const line = calculatePrice(custom());
    const expected =
      Math.round(500 * pricingConfig.customDesignMultiplier) +
      pricingConfig.customDesignFee;
    expect(line.designPrice).toBe(expected);
    expect(line.designPrice).toBe(824);
  });

  it("does not multiply the kit price by the custom design multiplier", () => {
    const line = calculatePrice(custom({ kitId: "gift" }));
    expect(line.kitPrice).toBe(990);
    expect(line.subtotal).toBe(line.designPrice + 990);
  });

  it("adds additional options", () => {
    const line = calculatePrice(ready({ optionIds: ["gift-wrap", "name-card"] }));
    expect(line.optionsPrice).toBe(580);
    expect(line.subtotal).toBe(500 + 580);
  });

  it("multiplies the subtotal by quantity", () => {
    const line = calculatePrice(ready({ quantity: 3 }));
    expect(line.subtotal).toBe(500);
    expect(line.itemsTotal).toBe(1500);
  });

  it("rejects an unknown design, kit, option or quantity", () => {
    expect(() => calculatePrice(ready({ designId: "missing" }))).toThrow();
    expect(() => calculatePrice(ready({ kitId: "missing" }))).toThrow();
    expect(() => calculatePrice(ready({ optionIds: ["missing"] }))).toThrow();
    expect(() => calculatePrice(ready({ quantity: 0 }))).toThrow();
    expect(() => calculatePrice(ready({ quantity: 21 }))).toThrow();
  });

  it("uses fixed box prices and ignores square-centimetre pricing", () => {
    const box = boxes[0];
    const line = calculatePrice({
      kind: "box",
      boxId: box.id,
      quantity: 2,
    });
    expect(line.designPrice).toBe(box.price);
    expect(line.itemsTotal).toBe(box.price * 2);
    expect(line.widthCm).toBeUndefined();
  });

  it("validates quantities as positive integers", () => {
    expect(validateQuantity(1)).toBe(true);
    expect(validateQuantity(20)).toBe(true);
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(-1)).toBe(false);
    expect(validateQuantity(1.5)).toBe(false);
    expect(validateQuantity(21)).toBe(false);
  });
});

describe("promo codes", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("applies a valid promo", () => {
    const result = evaluatePromo("FIRST10", 2000, { now });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(200);
    expect(result.code).toBe("FIRST10");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(evaluatePromo("  first10 ", 2000, { now }).discount).toBe(200);
  });

  it("rejects an unknown promo", () => {
    const result = evaluatePromo("NOPE", 2000, { now });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("rejects an expired promo", () => {
    const result = evaluatePromo("FIRST10", 2000, {
      now: new Date("2031-01-01T00:00:00.000Z"),
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("rejects a promo below the minimum subtotal", () => {
    const result = evaluatePromo("FIRST10", 500, { now });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("min_subtotal");
  });

  it("rejects a promo on a non-first order", () => {
    const result = evaluatePromo("FIRST10", 2000, { now, priorOrders: 1 });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("first_order_only");
  });

  it("rejects a promo already used by the same customer", () => {
    const result = evaluatePromo("FIRST10", 2000, {
      now,
      priorPromoRedemptions: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("already_used");
  });

  it("caps the discount at the configured maximum", () => {
    const result = evaluatePromo("FIRST10", 100_000, { now });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(1500);
  });

  it("never returns a discount larger than the order", () => {
    const result = evaluatePromo("FIRST10", 990, { now });
    expect(result.discount).toBe(99);
    expect(result.discount).toBeLessThanOrEqual(990);
  });
});

describe("cart totals", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");
  const items: PriceInput[] = [
    ready({ quantity: 2 }),
    custom({ kitId: "gift", optionIds: ["gift-wrap"] }),
    { kind: "box", boxId: "starter", quantity: 1 },
  ];

  it("sums lines and applies the promo to the total", () => {
    const totals = calculateCartTotals(items, "FIRST10", { now });
    const expectedItems =
      500 * 2 + (824 + 990 + 390) + boxes[0].price;
    expect(totals.itemsTotal).toBe(expectedItems);
    expect(totals.discount).toBe(Math.round(expectedItems * 0.1));
    expect(totals.total).toBe(expectedItems - totals.discount);
  });

  it("ignores an invalid promo and keeps the full total", () => {
    const totals = calculateCartTotals(items, "NOPE", { now });
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(totals.itemsTotal);
  });

  it("keeps a zero floor", () => {
    const totals = calculateCartTotals(items, "FIRST10", { now });
    expect(totals.total).toBeGreaterThanOrEqual(0);
  });
});
