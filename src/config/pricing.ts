import type { SizePreset } from "@/types";

/**
 * All commercial numbers live here. They are demonstration starting points,
 * not an approved price list. Changing a value here changes both the browser
 * preview and the server-side order calculation.
 */
export const pricingConfig = {
  currency: "RUB",
  pricePerCm2: 5,
  minimumPrice: 299,
  customDesignMultiplier: 1.25,
  customDesignFee: 199,
  width: { minCm: 5, maxCm: 100, stepCm: 0.5 },
  height: { minCm: 5, maxCm: 100, stepCm: 0.5 },
  minAreaCm2: 25,
  maxAreaCm2: 10_000,
  maxQuantity: 20,
  rounding: "nearest-ruble",
} as const;

export const standardSizes: SizePreset[] = [
  { id: "5x5", label: "5 × 5 см", widthCm: 5, heightCm: 5 },
  { id: "10x5", label: "10 × 5 см", widthCm: 10, heightCm: 5 },
  { id: "10x10", label: "10 × 10 см", widthCm: 10, heightCm: 10 },
  { id: "20x20", label: "20 × 20 см", widthCm: 20, heightCm: 20 },
  { id: "30x30", label: "30 × 30 см", widthCm: 30, heightCm: 30 },
];

export const defaultSizeId = "10x10";

export const MAX_QUANTITY = pricingConfig.maxQuantity;
