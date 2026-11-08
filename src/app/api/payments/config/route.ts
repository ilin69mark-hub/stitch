import { connection } from "next/server";
import { jsonOk } from "@/lib/api";
import { getPaymentConfig } from "@/lib/payments";

export async function GET() {
  await connection();
  const config = getPaymentConfig();
  return jsonOk({
    provider: config.provider,
    configured: config.configured,
    mode: config.mode,
    notice: config.notice,
  });
}
