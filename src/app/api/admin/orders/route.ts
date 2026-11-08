import {
  adminNotConfigured,
  isAdminRequest,
  jsonError,
  jsonOk,
  limitRequest,
} from "@/lib/api";
import { listOrders } from "@/lib/orders";

export async function GET(request: Request) {
  if (!process.env.ADMIN_TOKEN?.trim()) return adminNotConfigured();
  if (!isAdminRequest(request)) {
    return jsonError("unauthorized", "Доступ запрещён.", 401);
  }

  const limited = limitRequest(request, "admin-orders", 30, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  return jsonOk({ orders: listOrders(Number.isFinite(limit) ? limit : 100) });
}
