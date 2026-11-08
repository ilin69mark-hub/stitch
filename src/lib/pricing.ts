import { boxById } from "@/config/boxes";
import { designById } from "@/config/catalog";
import { extraOptions, kitById } from "@/config/kits";
import { pricingConfig, standardSizes } from "@/config/pricing";
import { promoByCode } from "@/config/promos";
import type {
  PriceBreakdown,
  PriceInput,
  Promo,
} from "@/types";

export type { PriceInput } from "@/types";

export class PricingError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

export interface DimensionValidation {
  valid: boolean;
  errors: string[];
}

export function isMultipleOfStep(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9;
}

export function validateDimensions(
  widthCm: number,
  heightCm: number,
): DimensionValidation {
  const errors: string[] = [];
  const { width, height, minAreaCm2, maxAreaCm2 } = pricingConfig;

  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) {
    return { valid: false, errors: ["Укажите ширину и высоту числами."] };
  }

  if (widthCm <= 0 || heightCm <= 0) {
    errors.push("Ширина и высота должны быть больше нуля.");
  }

  if (widthCm < width.minCm || widthCm > width.maxCm) {
    errors.push(
      `Ширина должна быть от ${width.minCm} до ${width.maxCm} см.`,
    );
  }

  if (heightCm < height.minCm || heightCm > height.maxCm) {
    errors.push(
      `Высота должна быть от ${height.minCm} до ${height.maxCm} см.`,
    );
  }

  if (!isMultipleOfStep(widthCm, width.stepCm)) {
    errors.push(`Ширину указывайте с шагом ${width.stepCm} см.`);
  }

  if (!isMultipleOfStep(heightCm, height.stepCm)) {
    errors.push(`Высоту указывайте с шагом ${height.stepCm} см.`);
  }

  const area = widthCm * heightCm;
  if (Number.isFinite(area)) {
    if (area < minAreaCm2) {
      errors.push(`Минимальная площадь — ${minAreaCm2} см².`);
    }
    if (area > maxAreaCm2) {
      errors.push(`Максимальная площадь — ${maxAreaCm2} см².`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateQuantity(quantity: number): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= pricingConfig.maxQuantity
  );
}

export function roundRub(value: number): number {
  return Math.round(value);
}

export function calculateBasePrice(widthCm: number, heightCm: number): number {
  return roundRub(
    Math.max(
      pricingConfig.minimumPrice,
      widthCm * heightCm * pricingConfig.pricePerCm2,
    ),
  );
}

export function calculateDesignPrice(
  widthCm: number,
  heightCm: number,
  customDesign: boolean,
): number {
  const base = calculateBasePrice(widthCm, heightCm);
  if (!customDesign) return base;
  return roundRub(
    base * pricingConfig.customDesignMultiplier + pricingConfig.customDesignFee,
  );
}

export function getDesignFromPrice(designId: string): number {
  const design = designById.get(designId);
  if (!design) {
    throw new PricingError("unknown_design", "Дизайн не найден.");
  }
  return Math.min(
    ...standardSizes
      .filter((size) => design.availableSizes.includes(size.id))
      .map((size) => calculateBasePrice(size.widthCm, size.heightCm)),
  );
}

export function getKitPrice(kitId: string): number {
  const kit = kitById.get(kitId);
  if (!kit) {
    throw new PricingError("unknown_kit", "Комплектация не найдена.");
  }
  return kit.price;
}

export function getOptionsPrice(optionIds: string[]): number {
  const unique = [...new Set(optionIds)];
  return unique.reduce((sum, id) => {
    const option = extraOptions.find((item) => item.id === id);
    if (!option) {
      throw new PricingError("unknown_option", "Дополнительная опция не найдена.");
    }
    return sum + option.price;
  }, 0);
}

export function calculatePrice(input: PriceInput): PriceBreakdown {
  if (input.kind === "box") {
    const box = boxById.get(input.boxId);
    if (!box) {
      throw new PricingError("unknown_box", "Бокс не найден.");
    }
    if (!validateQuantity(input.quantity)) {
      throw new PricingError("invalid_quantity", "Некорректное количество.");
    }
    return {
      kind: "box",
      title: box.title,
      designPrice: box.price,
      kitPrice: 0,
      optionsPrice: 0,
      subtotal: box.price,
      quantity: input.quantity,
      itemsTotal: box.price * input.quantity,
    };
  }

  const dimensionCheck = validateDimensions(input.widthCm, input.heightCm);
  if (!dimensionCheck.valid) {
    throw new PricingError("invalid_dimensions", dimensionCheck.errors.join(" "));
  }
  if (!validateQuantity(input.quantity)) {
    throw new PricingError("invalid_quantity", "Некорректное количество.");
  }

  const isCustom = input.kind === "custom";
  if (!isCustom) {
    if (!designById.has(input.designId)) {
      throw new PricingError("unknown_design", "Дизайн не найден.");
    }
  }

  const designPrice = calculateDesignPrice(
    input.widthCm,
    input.heightCm,
    isCustom,
  );
  const kitPrice = getKitPrice(input.kitId);
  const optionsPrice = getOptionsPrice(input.optionIds);
  const subtotal = designPrice + kitPrice + optionsPrice;

  return {
    kind: input.kind,
    title: isCustom
      ? "Картина по вашему фото"
      : designById.get(input.designId)!.title,
    designPrice,
    kitPrice,
    optionsPrice,
    subtotal,
    quantity: input.quantity,
    itemsTotal: subtotal * input.quantity,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    areaCm2: roundRub(input.widthCm * input.heightCm),
  };
}

export type PromoRejection =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "first_order_only"
  | "already_used"
  | "no_discount";

export interface PromoEvaluation {
  valid: boolean;
  code: string | null;
  discount: number;
  reason?: PromoRejection;
  message: string;
  description?: string;
}

export interface PromoContext {
  now?: Date;
  priorOrders?: number;
  priorPromoRedemptions?: number;
}

const promoMessages: Record<PromoRejection, string> = {
  not_found: "Такой промокод не найден.",
  inactive: "Промокод больше не действует.",
  not_started: "Промокод ещё не начал действовать.",
  expired: "Срок действия промокода истёк.",
  min_subtotal: "Сумма заказа меньше минимальной для этого промокода.",
  first_order_only: "Промокод действует только на первый заказ.",
  already_used: "Этот промокод уже использован на вашу почту.",
  no_discount: "Промокод не даёт скидку для этой суммы.",
};

export function evaluatePromo(
  code: string,
  itemsTotal: number,
  context: PromoContext = {},
): PromoEvaluation {
  const normalized = code.trim().toUpperCase();
  const promo: Promo | undefined = promoByCode.get(normalized);
  const now = context.now ?? new Date();

  if (!promo) {
    return {
      valid: false,
      code: null,
      discount: 0,
      reason: "not_found",
      message: promoMessages.not_found,
    };
  }

  const reject = (reason: PromoRejection): PromoEvaluation => ({
    valid: false,
    code: promo.code,
    discount: 0,
    reason,
    message: promoMessages[reason],
  });

  if (!promo.active) return reject("inactive");
  if (promo.startsAt && now < new Date(promo.startsAt)) return reject("not_started");
  if (promo.endsAt && now > new Date(promo.endsAt)) return reject("expired");
  if (itemsTotal < promo.minSubtotal) return reject("min_subtotal");
  if (promo.firstOrderOnly && (context.priorOrders ?? 0) > 0) {
    return reject("first_order_only");
  }
  if (promo.onePerCustomer && (context.priorPromoRedemptions ?? 0) > 0) {
    return reject("already_used");
  }

  let discount = roundRub((itemsTotal * promo.percent) / 100);
  if (promo.maxDiscount !== undefined) {
    discount = Math.min(discount, promo.maxDiscount);
  }
  discount = Math.min(discount, itemsTotal);

  if (discount <= 0) return reject("no_discount");

  return {
    valid: true,
    code: promo.code,
    discount,
    message: `Промокод применён: −${discount} ₽`,
    description: promo.description,
  };
}

export function applyDiscount(itemsTotal: number, discount: number): number {
  return Math.max(0, roundRub(itemsTotal - discount));
}

export function calculateCartTotals(
  inputs: PriceInput[],
  promoCode?: string | null,
  context: PromoContext = {},
) {
  const lines = inputs.map(calculatePrice);
  const itemsTotal = lines.reduce((sum, line) => sum + line.itemsTotal, 0);
  const promo = promoCode ? evaluatePromo(promoCode, itemsTotal, context) : null;
  const discount = promo?.valid ? promo.discount : 0;

  return {
    lines,
    itemsTotal,
    promo,
    discount,
    total: applyDiscount(itemsTotal, discount),
  };
}
