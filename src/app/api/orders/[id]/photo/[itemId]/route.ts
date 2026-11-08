import { jsonError, limitRequest } from "@/lib/api";
import { getOrderByItemAndToken } from "@/lib/orders";
import { getUploadById, readUploadFile } from "@/lib/uploads";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const limited = limitRequest(request, "order-photo", 60, 60_000);
  if (limited) return limited;

  const { id, itemId } = await context.params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const numericItemId = Number(itemId);

  if (!Number.isInteger(numericItemId)) {
    return jsonError("not_found", "Файл не найден.", 404);
  }

  const result = getOrderByItemAndToken(id, numericItemId, token);
  if (!result || result.item.kind !== "custom" || !result.item.upload_id) {
    return jsonError("not_found", "Файл не найден.", 404);
  }

  const upload = getUploadById(result.item.upload_id);
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
        "Content-Disposition": `inline; filename="order-${result.order.number}-photo.webp"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return jsonError("not_found", "Файл не найден.", 404);
  }
}
