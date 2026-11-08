"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ImageIcon,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRub, cn } from "@/lib/utils";
import type { PublicOrder } from "@/types";

const statusLabels: Record<string, string> = {
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В работе",
  shipped: "Отправлен",
  cancelled: "Отменён",
  payment_failed: "Оплата не прошла",
};

const paymentLabels: Record<string, string> = {
  not_configured: "Онлайн-оплата не подключена",
  pending: "Ожидает подтверждения",
  paid: "Оплачен",
  failed: "Ошибка оплаты",
  cancelled: "Платёж отменён",
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function OrderView({ id, token }: { id: string; token: string }) {
  const [order, setOrder] = React.useState<PublicOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [paying, setPaying] = React.useState(false);
  const [payError, setPayError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    fetch(`/api/orders/${id}?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          order?: PublicOrder;
          error?: { message?: string };
        };
        if (!active) return;
        if (!response.ok || !data.order) {
          setError(data.error?.message ?? "Заказ не найден.");
          return;
        }
        setOrder(data.order);
        setError("");
      })
      .catch(() => {
        if (active) setError("Сеть недоступна. Обновите страницу.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  async function payNow() {
    if (!order) return;
    setPaying(true);
    setPayError("");
    try {
      const response = await fetch(`/api/orders/${order.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json()) as {
        payment?: {
          confirmationUrl?: string | null;
          error?: string;
          configured?: boolean;
          notice?: string;
        };
        error?: { message?: string };
      };
      if (!response.ok) {
        setPayError(data.error?.message ?? "Не удалось начать оплату.");
        return;
      }
      if (data.payment?.confirmationUrl) {
        window.location.assign(data.payment.confirmationUrl);
        return;
      }
      setPayError(
        data.payment?.error ??
          data.payment?.notice ??
          "Платёж не создан. Попробуйте позже или свяжитесь с нами.",
      );
    } catch {
      setPayError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setPaying(false);
    }
  }

  function copyNumber() {
    if (!order) return;
    navigator.clipboard
      ?.writeText(String(order.number))
      .then(() => toast.success("Номер заказа скопирован"))
      .catch(() => toast.error("Не удалось скопировать номер"));
  }

  if (loading) {
    return (
      <section className="wrap py-20">
        <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-espresso/10 bg-milk p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Загружаем заказ…
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="wrap py-20 sm:py-28">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-espresso/10 bg-milk p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-sand text-terracotta">
            <AlertCircle className="size-7" />
          </span>
          <h1 className="mt-5 font-serif text-3xl text-espresso">
            Заказ не найден
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {error ||
              "Проверьте ссылку: возможно, она устарела или скопирована не полностью."}
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ size: "lg" }), "mt-6")}
          >
            На главную
          </Link>
        </div>
      </section>
    );
  }

  const paid = order.paymentStatus === "paid" || order.status === "paid";
  const failed = order.paymentStatus === "failed";
  const cancelled =
    order.status === "cancelled" || order.paymentStatus === "cancelled";
  const canPay =
    order.paymentConfigured && !paid && !cancelled;

  return (
    <section className="wrap py-10 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-espresso"
      >
        <ArrowLeft className="size-3.5" />
        На главную
      </Link>

      <div className="mx-auto mt-6 max-w-3xl">
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4 sm:p-5",
            paid
              ? "border-sage/30 bg-sage/8"
              : failed
                ? "border-terracotta/30 bg-terracotta/6"
                : "border-gold/30 bg-gold/8",
          )}
          role="status"
        >
          <span
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
              paid
                ? "bg-sage/15 text-sage-deep"
                : failed
                  ? "bg-terracotta/10 text-terracotta-deep"
                  : "bg-gold/15 text-gold",
            )}
          >
            {paid ? (
              <CheckCircle2 className="size-5" />
            ) : failed ? (
              <AlertCircle className="size-5" />
            ) : (
              <Clock className="size-5" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-espresso">
              {paid
                ? "Оплата подтверждена"
                : failed
                  ? "Платёж не прошёл"
                  : cancelled
                    ? "Заказ отменён"
                    : order.paymentConfigured
                      ? "Заказ создан, ожидает оплаты"
                      : "Заказ создан и сохранён"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {paid
                ? "Мы получили подтверждение платежа и передадим заказ в работу. Детали согласуем по указанным контактам."
                : failed
                  ? "Деньги не списаны. Можно попробовать оплатить снова или связаться с нами."
                  : cancelled
                    ? "Если это ошибка, свяжитесь с нами по почте."
                    : order.paymentConfigured
                      ? "После подтверждения оплаты статус обновится автоматически."
                      : "Онлайн-оплата в этой конфигурации не подключена. Деньги не списаны; менеджер свяжется с вами для подтверждения заказа."}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[2rem] border border-espresso/10 bg-milk">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-espresso/10 p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Заказ
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="font-serif text-3xl text-espresso">
                  № {order.number}
                </h1>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-espresso"
                  aria-label="Скопировать номер заказа"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <Badge
                variant={
                  paid ? "default" : failed ? "terracotta" : "outline"
                }
                className={paid ? "bg-sage/15 text-sage-deep" : undefined}
              >
                {statusLabels[order.status] ?? order.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {paymentLabels[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </div>
          </div>

          <ul className="divide-y divide-espresso/8 px-5 sm:px-6">
            {order.items.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="flex gap-3 py-4 sm:gap-4"
              >
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {item.previewUrl ? (
                    <Image
                      src={item.previewUrl}
                      alt={`Фотография для позиции «${item.title}»`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-terracotta/50">
                      <ImageIcon className="size-5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-espresso">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {item.subtitle}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.quantity} × {formatRub(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-espresso">
                  {formatRub(item.totalPrice)}
                </p>
              </li>
            ))}
          </ul>

          <div className="border-t border-espresso/10 p-5 sm:p-6">
            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Наборы</dt>
                <dd className="tabular-nums text-espresso">
                  {formatRub(order.subtotal)}
                </dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between gap-4 text-sage-deep">
                  <dt>Скидка{order.promoCode ? ` · ${order.promoCode}` : ""}</dt>
                  <dd className="tabular-nums">−{formatRub(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4 border-t border-espresso/10 pt-3">
                <dt className="text-base font-semibold text-espresso">Итого</dt>
                <dd className="font-serif text-3xl leading-none text-espresso">
                  {formatRub(order.total)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Доставка рассчитывается отдельно и подтверждается менеджером.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-espresso/10 bg-milk p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Контакты
            </p>
            <p className="mt-2 text-sm font-semibold text-espresso">
              {order.customerName}
            </p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">
              {order.customerEmail}
            </p>
          </div>

          <div className="rounded-2xl border border-espresso/10 bg-milk p-5">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <CreditCard className="size-3.5" />
              Оплата
            </p>
            {paid ? (
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-sage-deep">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                Платёж подтверждён. Заказ передан в обработку.
              </p>
            ) : cancelled ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Платёж отменён. Если нужно возобновить заказ, свяжитесь с нами.
              </p>
            ) : order.paymentConfigured ? (
              <>
                <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-sage-deep" />
                  Оплата на защищённой странице провайдера.
                </p>
                {canPay ? (
                  <Button
                    className="mt-3 w-full"
                    onClick={payNow}
                    disabled={paying}
                  >
                    {paying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Создаём платёж…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4" />
                        {failed ? "Попробовать снова" : "Перейти к оплате"}
                      </>
                    )}
                  </Button>
                ) : null}
                {payError ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-terracotta-deep">
                    {payError}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Онлайн-оплата не подключена. Заказ сохранён, деньги не списаны.
                Менеджер свяжется с вами, чтобы подтвердить детали и способ
                оплаты.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/#catalog" className={buttonVariants({ variant: "outline" })}>
            Вернуться в каталог
          </Link>
          <Link href="/#custom" className={buttonVariants({ variant: "ghost" })}>
            Создать ещё одну картину
          </Link>
        </div>
      </div>
    </section>
  );
}
