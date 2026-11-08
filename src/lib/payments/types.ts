export type PaymentMode = "test" | "live" | "none";

export interface PaymentConfig {
  provider: "yookassa" | "none";
  configured: boolean;
  mode: PaymentMode;
  notice: string;
}

export interface PaymentSession {
  providerPaymentId: string;
  status: string;
  confirmationUrl: string | null;
}

export interface ProviderPayment {
  id: string;
  status: string;
  paid: boolean;
  amount: string;
  currency: string;
  metadata: Record<string, string>;
  confirmationUrl: string | null;
}

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: number;
  total: number;
  currency: string;
  description: string;
  returnUrl: string;
  idempotenceKey: string;
}

export interface PaymentProvider {
  readonly id: "yookassa" | "none";
  readonly configured: boolean;
  readonly mode: PaymentMode;
  createPayment(input: CreatePaymentInput): Promise<PaymentSession>;
  fetchPayment(id: string): Promise<ProviderPayment>;
}

export class PaymentError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.status = status;
  }
}
