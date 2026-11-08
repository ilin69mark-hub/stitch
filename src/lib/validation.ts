import { z } from "zod";
import { commercialConfig } from "@/config/site";

const contactMethods = commercialConfig.contactMethods as readonly string[];
const deliveryMethods = commercialConfig.deliveryMethods.map((method) => method.id);

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Укажите имя — минимум 2 символа.")
    .max(100, "Имя слишком длинное."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Проверьте адрес электронной почты.")
    .max(254, "Адрес слишком длинный."),
  phone: z
    .string()
    .trim()
    .max(30, "Телефон слишком длинный.")
    .optional()
    .transform((value) => value || undefined),
  contactMethod: z.enum(contactMethods as [string, ...string[]]),
  deliveryMethod: z.enum(deliveryMethods as [string, ...string[]]),
  comment: z
    .string()
    .trim()
    .max(1000, "Комментарий слишком длинный.")
    .optional()
    .transform((value) => value || undefined),
});

const baseCartItem = {
  quantity: z.number().int().min(1).max(20),
  optionIds: z.array(z.string().max(64)).max(10),
  kitId: z.string().min(1).max(64),
  widthCm: z.number().finite(),
  heightCm: z.number().finite(),
};

export const cartItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("design"),
    designId: z.string().min(1).max(64),
    ...baseCartItem,
  }),
  z.object({
    kind: z.literal("custom"),
    uploadId: z.string().min(10).max(64),
    uploadToken: z.string().min(32).max(128),
    ...baseCartItem,
    comment: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("box"),
    boxId: z.string().min(1).max(64),
    quantity: z.number().int().min(1).max(20),
  }),
]);

export const createOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(128).optional(),
  customer: customerSchema,
  items: z.array(cartItemSchema).min(1, "Корзина пуста.").max(20),
  promoCode: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .transform((value) => value || undefined),
  consent: z.literal(true, {
    error: "Подтвердите согласие на обработку персональных данных.",
  }),
  consentVersion: z.string().max(32).optional(),
});

export const promoPreviewSchema = z.object({
  code: z.string().trim().min(1, "Введите промокод.").max(32),
  subtotal: z.number().int().min(0).max(10_000_000),
  email: z.string().trim().email().max(254).optional(),
});

export const paymentRequestSchema = z.object({
  token: z.string().min(32).max(128),
});

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;
export type CartItemPayload = z.infer<typeof cartItemSchema>;
