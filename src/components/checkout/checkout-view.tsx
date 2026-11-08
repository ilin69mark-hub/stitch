"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  ImageIcon,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import { cartItemMeta } from "@/lib/cart-display";
import { commercialConfig, siteConfig } from "@/config/site";
import { formatRub, plural } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PREFILL_KEY = "stezhok-checkout-prefill";

interface PaymentConfig {
  provider: string;
  configured: boolean;
  mode: string;
  notice: string | null;
}

interface ApiError {
  error?: { code?: string; message?: string };
}

export function CheckoutView() {
  const router = useRouter();
  const {
    items,
    lines,
    hydrated,
    itemsTotal,
    discount,
    total,
    promo,
    promoCode,
    setPromoCode,
    clearCart,
  } = useCart();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [contactMethod, setContactMethod] = React.useState<string>(
    commercialConfig.contactMethods[0],
  );
  const [deliveryMethod, setDeliveryMethod] = React.useState<string>(
    commercialConfig.deliveryMethods[0].id,
  );
  const [comment, setComment] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  const [promoInput, setPromoInput] = React.useState(promoCode ?? "");
  const [promoMessage, setPromoMessage] = React.useState("");
  const [promoError, setPromoError] = React.useState("");
  const [promoLoading, setPromoLoading] = React.useState(false);

  const [paymentConfig, setPaymentConfig] =
    React.useState<PaymentConfig | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const idempotency = React.useRef<string | null>(null);

  React.useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(PREFILL_KEY);
        if (!raw) return;
        const data = JSON.parse(raw) as {
          name?: string;
          email?: string;
          phone?: string;
          contactMethod?: string;
          comment?: string;
        };
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (
          data.contactMethod &&
          (commercialConfig.contactMethods as readonly string[]).includes(
            data.contactMethod,
          )
        ) {
          setContactMethod(data.contactMethod);
        }
        if (data.comment) setComment(data.comment);
      } catch {
        // Ignore malformed prefill; the form stays editable.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    fetch("/api/payments/config")
      .then((response) => response.json())
      .then((data: PaymentConfig) => {
        if (active) setPaymentConfig(data);
      })
      .catch(() => {
        if (active) setPaymentConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function validatePromo(code: string): Promise<boolean> {
    setPromoLoading(true);
    setPromoError("");
    setPromoMessage("");
    try {
      const response = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal: itemsTotal,
          email: email.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        promo?: { valid: boolean; code: string | null; message: string };
      } & ApiError;
      if (!response.ok || !data.promo) {
        setPromoError(
          data.error?.message ?? "Не удалось проверить промокод.",
        );
        return false;
      }
      if (!data.promo.valid) {
        setPromoError(data.promo.message);
        setPromoCode(null);
        return false;
      }
      setPromoCode(data.promo.code);
      setPromoInput(data.promo.code ?? code);
      setPromoMessage(data.promo.message);
      return true;
    } catch {
      setPromoError("Сеть недоступна. Проверьте промокод позже.");
      return false;
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Укажите имя.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Проверьте адрес электронной почты.";
    }
    if (!consent) nextErrors.consent = "Подтвердите согласие.";
    if (items.length === 0) nextErrors.cart = "Корзина пуста.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Проверьте выделенные поля.");
      return;
    }

    setSubmitting(true);
    try {
      if (promoCode && !(await validatePromo(promoCode))) {
        setSubmitting(false);
        setFormError("Промокод больше не действует. Уберите его или введите другой.");
        return;
      }

      const key = idempotency.current ?? crypto.randomUUID();
      idempotency.current = key;

      const payload = {
        idempotencyKey: key,
        customer: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          contactMethod,
          deliveryMethod,
          comment: comment.trim() || undefined,
        },
        items: items.map((item) => {
          if (item.kind === "box") {
            return {
              kind: "box" as const,
              boxId: item.boxId,
              quantity: item.quantity,
            };
          }
          if (item.kind === "custom") {
            return {
              kind: "custom" as const,
              uploadId: item.uploadId,
              uploadToken: item.uploadToken,
              widthCm: item.widthCm,
              heightCm: item.heightCm,
              kitId: item.kitId,
              optionIds: item.optionIds,
              quantity: item.quantity,
              comment: item.comment,
            };
          }
          return {
            kind: "design" as const,
            designId: item.designId,
            widthCm: item.widthCm,
            heightCm: item.heightCm,
            kitId: item.kitId,
            optionIds: item.optionIds,
            quantity: item.quantity,
          };
        }),
        promoCode: promoCode || undefined,
        consent: true,
        consentVersion: "demo-2026-01",
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        order?: { id: string };
        orderToken?: string;
        payment?: { confirmationUrl?: string | null; error?: string };
      } & ApiError;

      if (!response.ok || !data.order || !data.orderToken) {
        if (data.error?.code === "promo_invalid") {
          setPromoCode(null);
          setPromoError(data.error.message ?? "Промокод недействителен.");
        }
        setFormError(
          data.error?.message ??
            "Не удалось создать заказ. Проверьте данные и попробуйте снова.",
        );
        setSubmitting(false);
        return;
      }

      clearCart();
      if (data.payment?.confirmationUrl) {
        window.location.assign(data.payment.confirmationUrl);
        return;
      }
      router.push(
        `/order/${data.order.id}?token=${encodeURIComponent(data.orderToken)}`,
      );
    } catch {
      setFormError(
        "Сеть недоступна. Заказ не создан — данные остались в форме, попробуйте ещё раз.",
      );
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <section className="wrap py-20">
        <div className="h-64 animate-pulse rounded-[2rem] bg-sand/50" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="wrap py-20 sm:py-28">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-espresso/10 bg-milk p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-sand text-terracotta">
            <ImageIcon className="size-7" />
          </span>
          <h1 className="mt-5 font-serif text-3xl text-espresso">
            В корзине пока пусто
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Выберите готовый сюжет или загрузите фотографию — затем вернитесь к
            оформлению.
          </p>
          <Link
            href="/#catalog"
            className={cn(buttonVariants({ size: "lg" }), "mt-6")}
          >
            Перейти к каталогу
          </Link>
        </div>
      </section>
    );
  }

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const delivery = commercialConfig.deliveryMethods.find(
    (method) => method.id === deliveryMethod,
  );

  return (
    <section className="wrap py-10 sm:py-16">
      <Link
        href="/#catalog"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-espresso"
      >
        <ArrowLeft className="size-3.5" />
        Вернуться в каталог
      </Link>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Оформление</p>
          <h1 className="mt-3 font-serif text-[2.6rem] leading-none tracking-[-0.025em] text-espresso sm:text-5xl">
            Проверьте заказ
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          {count} {plural(count, "набор", "набора", "наборов")} ·{" "}
          {formatRub(total)}
        </p>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="space-y-8 rounded-[2rem] border border-espresso/10 bg-milk p-5 shadow-[0_24px_60px_-45px_rgba(61,47,34,0.5)] sm:p-7"
          noValidate
        >
          <section aria-labelledby="checkout-contacts">
            <h2
              id="checkout-contacts"
              className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
            >
              01 · Контакты
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="checkout-name">Имя</Label>
                <Input
                  id="checkout-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name ? (
                  <p className="mt-1 text-[10px] text-terracotta-deep">
                    {errors.name}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="checkout-email">Email</Label>
                <Input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? (
                  <p className="mt-1 text-[10px] text-terracotta-deep">
                    {errors.email}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="checkout-phone">Телефон (необязательно)</Label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <Label htmlFor="checkout-contact">Способ связи</Label>
                <Select
                  id="checkout-contact"
                  value={contactMethod}
                  onChange={(event) => setContactMethod(event.target.value)}
                >
                  {commercialConfig.contactMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          <section aria-labelledby="checkout-delivery">
            <h2
              id="checkout-delivery"
              className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
            >
              02 · Получение
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {commercialConfig.deliveryMethods.map((method) => {
                const selected = method.id === deliveryMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setDeliveryMethod(method.id)}
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      "flex flex-col rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-terracotta bg-terracotta/6"
                        : "border-espresso/12 bg-milk hover:border-espresso/30",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-espresso">
                        {method.title}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        по согласованию
                      </span>
                    </span>
                    <span className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {method.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
              <Truck className="mt-0.5 size-3.5 shrink-0" />
              {commercialConfig.deliveryCostNote}
            </p>
          </section>

          <section aria-labelledby="checkout-comment">
            <h2
              id="checkout-comment"
              className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
            >
              03 · Комментарий
            </h2>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Пожелания по доставке, упаковке или заказу"
              maxLength={1000}
              aria-label="Комментарий к заказу"
            />
          </section>

          <section aria-labelledby="checkout-promo">
            <h2
              id="checkout-promo"
              className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
            >
              <Tag className="size-3.5 text-terracotta" />
              04 · Промокод
            </h2>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value.toUpperCase());
                  setPromoError("");
                  setPromoMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (promoInput.trim()) void validatePromo(promoInput);
                  }
                }}
                placeholder="FIRST10"
                autoComplete="off"
                aria-label="Промокод"
              />
              {promoCode ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => {
                    setPromoCode(null);
                    setPromoInput("");
                    setPromoInput("");
                    setPromoError("");
                    setPromoMessage("");
                  }}
                  aria-label="Убрать промокод"
                >
                  <X className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="soft"
                  className="h-11 shrink-0"
                  onClick={() => {
                    if (promoInput.trim()) void validatePromo(promoInput);
                  }}
                  disabled={promoLoading}
                >
                  {promoLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Применить"
                  )}
                </Button>
              )}
            </div>
            <div aria-live="polite">
              {promoError ? (
                <p className="mt-2 text-[11px] text-terracotta-deep">
                  {promoError}
                </p>
              ) : promoMessage ? (
                <p className="mt-2 text-[11px] text-sage-deep">{promoMessage}</p>
              ) : promoCode && promo && !promo.valid ? (
                <p className="mt-2 text-[11px] text-terracotta-deep">
                  {promo.message}
                </p>
              ) : (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Скидка проверится повторно при создании заказа.
                </p>
              )}
            </div>
          </section>

          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={consent}
                onCheckedChange={(value) => setConsent(value === true)}
                className="mt-0.5"
                aria-invalid={Boolean(errors.consent)}
              />
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                Согласен с{" "}
                <Link
                  href="/legal/consent"
                  className="text-terracotta underline-offset-2 hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  обработкой персональных данных
                </Link>{" "}
                и{" "}
                <Link
                  href="/legal/terms"
                  className="text-terracotta underline-offset-2 hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  условиями продажи
                </Link>
                .
              </span>
            </label>
            {errors.consent ? (
              <p className="mt-1 text-[10px] text-terracotta-deep">
                {errors.consent}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p
              className="rounded-xl bg-terracotta/8 px-4 py-3 text-xs text-terracotta-deep"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full justify-between lg:hidden"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Создаём заказ…
              </>
            ) : (
              <>
                Подтвердить заказ · {formatRub(total)}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-[2rem] border border-espresso/10 bg-milk">
            <div className="border-b border-espresso/10 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Ваш заказ
              </p>
            </div>
            <ul className="max-h-[360px] space-y-3 overflow-y-auto px-5 py-4">
              {lines.map(({ item, breakdown }) => {
                const meta = cartItemMeta(item);
                return (
                  <li key={item.key} className="flex gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                      {meta.image ? (
                        <Image
                          src={meta.image}
                          alt={meta.alt}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized={item.kind === "custom"}
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-terracotta/50">
                          <ImageIcon className="size-4" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-espresso">
                        {meta.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                        {meta.subtitle}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.quantity} × {formatRub(breakdown.subtotal)}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold tabular-nums text-espresso">
                      {formatRub(breakdown.itemsTotal)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-espresso/10 px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Наборы</dt>
                  <dd className="tabular-nums text-espresso">
                    {formatRub(itemsTotal)}
                  </dd>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between gap-4 text-sage-deep">
                    <dt>Скидка{promoCode ? ` · ${promoCode}` : ""}</dt>
                    <dd className="tabular-nums">−{formatRub(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {delivery?.title ?? "Получение"}
                  </dt>
                  <dd className="text-xs text-muted-foreground">
                    по согласованию
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-espresso/10 pt-3">
                  <dt className="text-base font-semibold text-espresso">Итого</dt>
                  <dd className="font-serif text-3xl leading-none text-espresso">
                    {formatRub(total)}
                  </dd>
                </div>
              </dl>

              <Button
                type="submit"
                form="checkout-form"
                size="lg"
                className="mt-4 hidden w-full justify-between lg:flex"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Создаём заказ…
                  </>
                ) : (
                  <>
                    Подтвердить заказ
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                Нажимая кнопку, вы подтверждаете заказ. Оплата — только после
                проверки данных.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-espresso/10 bg-sand/45 p-4 text-[11px] leading-relaxed text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-espresso">
              <CreditCard className="size-3.5 text-terracotta" />
              Оплата
            </p>
            {paymentConfig?.configured ? (
              <p className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-sage-deep" />
                После оформления откроется защищённая страница платёжного
                провайдера. Статус «оплачен» появится только после подтверждения
                платежа.
              </p>
            ) : (
              <p>
                {paymentConfig?.notice ??
                  commercialConfig.paymentTestNotice}
              </p>
            )}
            <p className="mt-2 flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-sage-deep" />
              Мы сохраним заказ и контакты для связи. Персональные данные
              обрабатываются по{" "}
              <Link
                href="/legal/privacy"
                className="text-terracotta underline-offset-2 hover:underline"
              >
                политике
              </Link>
              .
            </p>
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            Вопросы по заказу:{" "}
            <a
              href={`mailto:${siteConfig.email}`}
              className="text-terracotta underline-offset-2 hover:underline"
            >
              {siteConfig.email}
            </a>
          </p>
        </aside>
      </div>
    </section>
  );
}
