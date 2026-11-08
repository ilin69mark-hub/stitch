import { jsonError, jsonOk, limitRequest } from "@/lib/api";
import { getOrderByToken, toPublicOrder } from "@/lib/orders";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = limitRequest(request, "order-read", 60, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = getOrderByToken(id, token);
  if (!result) {
    return jsonError("not_found", "Заказ не найден.", 404);
  }

  return jsonOk({ order: toPublicOrder(result.order) });
}
