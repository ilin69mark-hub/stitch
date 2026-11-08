import {
  adminNotConfigured,
  isAdminRequest,
  jsonError,
  limitRequest,
} from "@/lib/api";
import { getOrderWithItems } from "@/lib/orders";
import { getUploadById, readUploadFile } from "@/lib/uploads";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!process.env.ADMIN_TOKEN?.trim()) return adminNotConfigured();
  if (!isAdminRequest(request)) {
    return jsonError("unauthorized", "Доступ запрещён.", 401);
  }

  const limited = limitRequest(request, "admin-photo", 60, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const itemId = Number(new URL(request.url).searchParams.get("itemId"));
  if (!Number.isInteger(itemId)) {
    return jsonError("bad_request", "Укажите itemId.", 400);
  }

  const order = getOrderWithItems(id);
  const item = order?.items.find((entry) => entry.id === itemId);
  if (!order || !item || !item.upload_id) {
    return jsonError("not_found", "Файл не найден.", 404);
  }

  const upload = getUploadById(item.upload_id);
  if (!upload) {
    return jsonError("not_found", "Файл не найден.", 404);
  }

  try {
    const buffer = await readUploadFile(upload);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="order-${order.order.number}-photo.webp"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return jsonError("not_found", "Файл не найден.", 404);
  }
}
