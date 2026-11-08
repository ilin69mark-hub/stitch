import { siteConfig } from "@/config/site";
import {
  PaymentError,
  type CreatePaymentInput,
  type PaymentProvider,
  type PaymentSession,
  type ProviderPayment,
} from "@/lib/payments/types";

const API_URL = (process.env.YOOKASSA_API_URL ?? "https://api.yookassa.ru/v3").replace(
  /\/$/,
  "",
);

interface YooKassaResponse {
  id: string;
  status: string;
  paid?: boolean;
  amount?: { value: string; currency: string };
  confirmation?: { confirmation_url?: string };
  metadata?: Record<string, string>;
}

export class YooKassaProvider implements PaymentProvider {
  readonly id = "yookassa" as const;
  readonly configured = true;
  readonly mode: "test" | "live";
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor(shopId: string, secretKey: string, mode: "test" | "live") {
    this.shopId = shopId;
    this.secretKey = secretKey;
    this.mode = mode;
  }

  private headers(idempotenceKey?: string): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(
        `${this.shopId}:${this.secretKey}`,
      ).toString("base64")}`,
      "Content-Type": "application/json",
      "User-Agent": "StezhokShop/1.0",
    };
    if (idempotenceKey) headers["Idempotence-Key"] = idempotenceKey;
    return headers;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    idempotenceKey?: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { ...this.headers(idempotenceKey), ...init.headers },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      throw new PaymentError(
        "provider_unavailable",
        "Платёжный сервис недоступен. Попробуйте позже.",
        503,
      );
    }

    if (!response.ok) {
      throw new PaymentError(
        "provider_error",
        "Платёжный сервис отклонил запрос. Попробуйте позже.",
        response.status >= 500 ? 503 : 502,
      );
    }

    return (await response.json()) as T;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const body = {
      amount: {
        value: input.total.toFixed(2),
        currency: input.currency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      description: input.description.slice(0, 128),
      metadata: {
        orderId: input.orderId,
        orderNumber: String(input.orderNumber),
      },
    };

    const data = await this.request<YooKassaResponse>(
      "/payments",
      { method: "POST", body: JSON.stringify(body) },
      input.idempotenceKey,
    );

    return {
      providerPaymentId: data.id,
      status: data.status,
      confirmationUrl: data.confirmation?.confirmation_url ?? null,
    };
  }

  async fetchPayment(id: string): Promise<ProviderPayment> {
    const data = await this.request<YooKassaResponse>(`/payments/${id}`, {
      method: "GET",
    });

    return {
      id: data.id,
      status: data.status,
      paid: data.paid === true,
      amount: data.amount?.value ?? "0.00",
      currency: data.amount?.currency ?? "RUB",
      metadata: data.metadata ?? {},
      confirmationUrl: data.confirmation?.confirmation_url ?? null,
    };
  }
}

export function buildYooKassaProvider(): YooKassaProvider | null {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secretKey) return null;
  return new YooKassaProvider(
    shopId,
    secretKey,
    process.env.PAYMENT_MODE === "live" ? "live" : "test",
  );
}

export function yookassaDescription(orderNumber: number): string {
  return `Заказ №${orderNumber} — ${siteConfig.name}`;
}
