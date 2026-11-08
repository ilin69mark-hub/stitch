import { jsonError, jsonOk, limitRequest } from "@/lib/api";
import {
  MAX_UPLOAD_BYTES,
  saveUpload,
  UploadError,
} from "@/lib/uploads";

export async function POST(request: Request) {
  const limited = limitRequest(request, "upload", 10, 60_000);
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return jsonError(
      "too_large",
      `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ.`,
      413,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("bad_form", "Не удалось прочитать файл.", 400);
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return jsonError("no_file", "Выберите фотографию.", 400);
  }

  try {
    const upload = await saveUpload(file);
    return jsonOk(
      {
        upload: {
          id: upload.id,
          token: upload.token,
          fileName: upload.originalName,
          width: upload.width,
          height: upload.height,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.code, error.message, error.status);
    }
    return jsonError(
      "upload_failed",
      "Не удалось сохранить фотографию.",
      500,
    );
  }
}
