import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, safeEqual, bearerToken } from "@/lib/secure";

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, details } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function jsonOk<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function limitRequest(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Response | null {
  const result = rateLimit(
    `${bucket}:${clientIp(request)}`,
    limit,
    windowMs,
  );
  if (result.ok) return null;
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: "Слишком много запросов. Попробуйте через минуту.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

export function isAdminRequest(request: Request): boolean {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured) return false;
  const token =
    bearerToken(request) ??
    new URL(request.url).searchParams.get("token") ??
    "";
  return token.length > 0 && safeEqual(token, configured);
}

export function adminNotConfigured(): Response {
  return jsonError(
    "admin_not_configured",
    "ADMIN_TOKEN не задан. Доступ к админ-маршрутам отключён.",
    503,
  );
}

export function contentLengthTooLarge(
  request: Request,
  maxBytes: number,
): boolean {
  const header = request.headers.get("content-length");
  if (!header) return false;
  const value = Number(header);
  return Number.isFinite(value) && value > maxBytes;
}
