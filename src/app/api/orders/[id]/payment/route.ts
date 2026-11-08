import { jsonError, jsonOk, limitRequest } from "@/lib/api";
import {
  getOrderByToken,
  OrderError,
  startPayment,
} from "@/lib/orders";
import { paymentRequestSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = limitRequest(request, "order-payment", 6, 60_000);
  if (limited) return limited;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_json", "Некорректный запрос.", 400);
  }

  const parsed = paymentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid_token", "Ссылка на заказ недействительна.", 400);
  }

  const result = getOrderByToken(id, parsed.data.token);
  if (!result) {
    return jsonError("not_found", "Заказ не найден.", 404);
  }

  try {
    const payment = await startPayment(result.order);
    return jsonOk({ payment });
  } catch (error) {
    if (error instanceof OrderError) {
      return jsonError(error.code, error.message, error.status);
    }
    return jsonError(
      "payment_failed",
      "Не удалось начать оплату. Попробуйте позже.",
      502,
    );
  }
}
