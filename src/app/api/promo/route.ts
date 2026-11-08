import { jsonError, jsonOk, limitRequest } from "@/lib/api";
import { promoContextForEmail } from "@/lib/orders";
import { evaluatePromo } from "@/lib/pricing";
import { promoPreviewSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const limited = limitRequest(request, "promo", 30, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_json", "Некорректный запрос.", 400);
  }

  const parsed = promoPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Проверьте промокод.",
      400,
    );
  }

  const context = parsed.data.email
    ? promoContextForEmail(parsed.data.email, parsed.data.code)
    : {};
  const result = evaluatePromo(
    parsed.data.code,
    parsed.data.subtotal,
    context,
  );

  return jsonOk({
    promo: {
      valid: result.valid,
      code: result.code,
      discount: result.discount,
      message: result.message,
      description: result.description ?? null,
      reason: result.reason ?? null,
    },
  });
}
