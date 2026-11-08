import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { getDataDir, getDb } from "@/lib/db";
import { safeEqual } from "@/lib/secure";

export const MAX_UPLOAD_BYTES =
  Number(process.env.UPLOAD_MAX_MB ?? 15) * 1024 * 1024;
export const MIN_UPLOAD_SIDE = 300;
export const MAX_UPLOAD_PIXELS = 40_000_000;
export const MAX_STORED_SIDE = 3000;

export interface StoredUpload {
  id: string;
  token: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export class UploadError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.status = status;
  }
}

function detectMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function sanitizeFileName(name: string): string {
  const base = path.basename(name || "photo");
  return base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "_")
    .slice(0, 120);
}

export async function saveUpload(file: File): Promise<StoredUpload> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new UploadError("no_file", "Выберите фотографию.");
  }
  if (file.size === 0) {
    throw new UploadError("empty_file", "Файл пустой.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      "too_large",
      `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ.`,
    );
  }

  const input = Buffer.from(await file.arrayBuffer());
  const mime = detectMime(input);
  if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    throw new UploadError(
      "bad_type",
      "Поддерживаются только JPEG, PNG и WebP.",
    );
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_UPLOAD_PIXELS,
    }).metadata();
  } catch {
    throw new UploadError(
      "bad_image",
      "Не удалось прочитать изображение. Попробуйте другой файл.",
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < MIN_UPLOAD_SIDE || height < MIN_UPLOAD_SIDE) {
    throw new UploadError(
      "too_small",
      `Фото должно быть не меньше ${MIN_UPLOAD_SIDE} × ${MIN_UPLOAD_SIDE} px.`,
    );
  }
  if (width * height > MAX_UPLOAD_PIXELS) {
    throw new UploadError("too_many_pixels", "Слишком большое изображение.");
  }
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new UploadError("bad_type", "Неподдерживаемый формат изображения.");
  }

  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const relativeDir = path.join(
    "uploads",
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
  );
  const absoluteDir = path.join(getDataDir(), relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  const fileName = `${id}.webp`;
  const filePath = path.join(absoluteDir, fileName);

  try {
    const output = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_UPLOAD_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_STORED_SIDE,
        height: MAX_STORED_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 5 })
      .toBuffer();

    await writeFile(filePath, output, { mode: 0o600 });

    const stored: StoredUpload = {
      id,
      token,
      originalName: sanitizeFileName(file.name),
      mime: "image/webp",
      sizeBytes: output.byteLength,
      width: Math.min(width, MAX_STORED_SIDE),
      height: Math.min(height, MAX_STORED_SIDE),
      createdAt: now.toISOString(),
    };

    getDb()
      .prepare(
        `INSERT INTO uploads
          (id, token, file_path, mime, size_bytes, original_name, width_px, height_px, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        stored.id,
        stored.token,
        filePath,
        stored.mime,
        stored.sizeBytes,
        stored.originalName,
        width,
        height,
        stored.createdAt,
      );

    return stored;
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    if (error instanceof UploadError) throw error;
    throw new UploadError(
      "processing_failed",
      "Не удалось обработать изображение.",
    );
  }
}

export interface UploadRow {
  id: string;
  token: string;
  file_path: string;
  mime: string;
  size_bytes: number;
  original_name: string;
  width_px: number;
  height_px: number;
  created_at: string;
}

export function getUpload(id: string, token: string): UploadRow | null {
  if (!id || !token) return null;
  const row = getDb()
    .prepare("SELECT * FROM uploads WHERE id = ?")
    .get(id) as UploadRow | undefined;
  if (!row) return null;
  if (!safeEqual(row.token, token)) return null;
  return row;
}

export async function readUploadFile(row: UploadRow): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(row.file_path);
}

export function getUploadById(id: string): UploadRow | null {
  const row = getDb()
    .prepare("SELECT * FROM uploads WHERE id = ?")
    .get(id) as UploadRow | undefined;
  return row ?? null;
}
