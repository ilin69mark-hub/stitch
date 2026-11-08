import { BlockList, isIP } from "node:net";
import {
  buildYooKassaProvider,
  YooKassaProvider,
} from "@/lib/payments/yookassa";
import {
  PaymentError,
  type PaymentConfig,
  type PaymentMode,
  type PaymentProvider,
  type PaymentSession,
  type ProviderPayment,
} from "@/lib/payments/types";

class NoneProvider implements PaymentProvider {
  readonly id = "none" as const;
  readonly configured = false;
  readonly mode: PaymentMode = "none";

  async createPayment(): Promise<PaymentSession> {
    throw new PaymentError(
      "not_configured",
      "Онлайн-оплата не подключена.",
      503,
    );
  }

  async fetchPayment(): Promise<ProviderPayment> {
    throw new PaymentError(
      "not_configured",
      "Онлайн-оплата не подключена.",
      503,
    );
  }
}

export function getPaymentConfig(): PaymentConfig {
  const requested = (process.env.PAYMENT_PROVIDER ?? "none").toLowerCase();
  const mode: PaymentMode = process.env.PAYMENT_MODE === "live" ? "live" : "test";

  if (requested === "yookassa") {
    const provider = buildYooKassaProvider();
    if (provider) {
      return {
        provider: "yookassa",
        configured: true,
        mode,
        notice:
          mode === "live"
            ? "Оплата через ЮKassa. Платёж проходит на защищённой странице провайдера."
            : "ЮKassa подключена в тестовом режиме. Реальные деньги не списываются, если используются тестовые ключи.",
      };
    }
    return {
      provider: "yookassa",
      configured: false,
      mode: "none",
      notice:
        "ЮKassa выбрана, но ключи не заданы. Заказ сохранится без онлайн-оплаты.",
    };
  }

  return {
    provider: "none",
    configured: false,
    mode: "none",
    notice:
      "Онлайн-оплата не подключена. Заказ сохранится со статусом «ожидает оплаты», деньги не списываются.",
  };
}

export function getPaymentProvider(): PaymentProvider {
  const config = getPaymentConfig();
  if (config.configured) {
    const provider = buildYooKassaProvider();
    if (provider) return provider;
  }
  return new NoneProvider();
}

export function getYooKassaProvider(): YooKassaProvider {
  const provider = buildYooKassaProvider();
  if (!provider) {
    throw new PaymentError(
      "not_configured",
      "ЮKassa не настроена.",
      503,
    );
  }
  return provider;
}

let blockList: BlockList | null | undefined;

function getAllowedIps(): BlockList | null {
  if (blockList !== undefined) return blockList;
  const raw = process.env.YOOKASSA_ALLOWED_IPS?.trim();
  if (!raw) {
    blockList = null;
    return blockList;
  }

  const list = new BlockList();
  let added = 0;
  for (const entry of raw.split(",").map((item) => item.trim()).filter(Boolean)) {
    const [address, prefix] = entry.split("/");
    const family = isIP(address);
    if (!family) continue;
    const type = family === 6 ? "ipv6" : "ipv4";
    if (prefix) {
      const prefixNumber = Number(prefix);
      if (!Number.isInteger(prefixNumber)) continue;
      list.addSubnet(address, prefixNumber, type);
    } else {
      list.addAddress(address, type);
    }
    added += 1;
  }
  blockList = added > 0 ? list : null;
  return blockList;
}

export function isAllowedWebhookIp(ip: string): boolean {
  const list = getAllowedIps();
  if (!list) return true;
  const family = isIP(ip);
  if (!family) return false;
  return list.check(ip, family === 6 ? "ipv6" : "ipv4");
}

export type { PaymentConfig };
