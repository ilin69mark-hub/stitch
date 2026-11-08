"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ImageIcon,
  Pencil,
  ShieldCheck,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useCart } from "@/lib/cart";
import { useConfigurator } from "@/lib/configurator";
import { evaluatePromo } from "@/lib/pricing";
import { cartItemMeta } from "@/lib/cart-display";
import { formatRub, plural } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types";

export function CartDrawer() {
  const {
    items,
    isOpen,
    openCart,
    closeCart,
    lines,
    itemsTotal,
    discount,
    total,
    promo,
    promoCode,
    setPromoCode,
    setQuantity,
    removeItem,
    addItem,
  } = useCart();
  const { openDesign, openCustomEdit } = useConfigurator();
  const [promoInput, setPromoInput] = React.useState(promoCode ?? "");
  const [promoError, setPromoError] = React.useState("");

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function applyPromo() {
    const next = promoInput.trim().toUpperCase();
    if (!next) {
      setPromoCode(null);
      setPromoInput("");
      setPromoError("");
      return;
    }
    const evaluation = evaluatePromo(next, itemsTotal);
    if (!evaluation.valid) {
      setPromoError(evaluation.message);
      return;
    }
    setPromoError("");
    setPromoCode(next);
  }

  function removeWithUndo(item: CartItem) {
    removeItem(item.key);
    toast("Товар удалён из корзины", {
      action: {
        label: "Вернуть",
        onClick: () => addItem(item),
      },
    });
  }

  function editItem(item: CartItem) {
    closeCart();
    if (item.kind === "design") {
      openDesign(item.designId, item, item.key);
    } else if (item.kind === "custom") {
      openCustomEdit(item);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (open) openCart();
        else closeCart();
      }}
    >
      <SheetContent className="w-full">
        <div className="flex items-start justify-between gap-4 border-b border-espresso/10 px-5 py-5 pr-16 sm:px-6">
          <div>
            <SheetTitle>Корзина</SheetTitle>
            <SheetDescription className="mt-1">
              {count > 0
                ? `${count} ${plural(count, "набор", "набора", "наборов")}`
                : "Пока пусто"}
            </SheetDescription>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-sand text-terracotta">
              <ImageIcon className="size-7" />
            </span>
            <div>
              <p className="font-serif text-2xl text-espresso">
                Здесь будет ваша картина
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Выберите готовый дизайн или загрузите фотографию — размер и
                комплектацию можно настроить.
              </p>
            </div>
            <Button onClick={closeCart} className="mt-2">
              Перейти к каталогу
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <ul className="space-y-4">
                {lines.map(({ item, breakdown }) => {
                  const meta = cartItemMeta(item);
                  return (
                    <li
                      key={item.key}
                      className="flex gap-3 border-b border-espresso/8 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                        {meta.image ? (
                          <Image
                            src={meta.image}
                            alt={meta.alt}
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized={Boolean(item.kind === "custom")}
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-terracotta/60">
                            <ImageIcon className="size-6" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-espresso">
                              {meta.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {meta.subtitle}
                            </p>
                            {meta.options ? (
                              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground/80">
                                {meta.options}
                              </p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-espresso">
                            {formatRub(breakdown.itemsTotal)}
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <QuantityStepper
                            value={item.quantity}
                            onChange={(value) => setQuantity(item.key, value)}
                            size="sm"
                            label={`Количество: ${meta.title}`}
                          />
                          <div className="flex items-center gap-1">
                            {item.kind !== "box" ? (
                              <button
                                type="button"
                                onClick={() => editItem(item)}
                                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-espresso"
                                aria-label={`Изменить ${meta.title}`}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeWithUndo(item)}
                              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-terracotta/10 hover:text-terracotta-deep"
                              aria-label={`Удалить ${meta.title}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 rounded-2xl border border-espresso/10 bg-milk/60 p-3.5">
                <label
                  htmlFor="cart-promo"
                  className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-espresso"
                >
                  <Tag className="size-3.5 text-terracotta" />
                  Промокод
                </label>
                <div className="flex gap-2">
                  <Input
                    id="cart-promo"
                    value={promoInput}
                    onChange={(event) => {
                      setPromoInput(event.target.value.toUpperCase());
                      setPromoError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyPromo();
                      }
                    }}
                    placeholder="Например, FIRST10"
                    className="h-10 bg-background"
                    autoComplete="off"
                  />
                  {promoCode ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 shrink-0"
                      onClick={() => {
                        setPromoCode(null);
                        setPromoInput("");
                        setPromoInput("");
                        setPromoError("");
                      }}
                      aria-label="Убрать промокод"
                    >
                      <X className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      className="h-10 shrink-0 px-4"
                      onClick={applyPromo}
                    >
                      Применить
                    </Button>
                  )}
                </div>
                {promoError ? (
                  <p className="mt-2 text-[11px] text-terracotta-deep">
                    {promoError}
                  </p>
                ) : promo?.valid ? (
                  <p className="mt-2 text-[11px] text-sage-deep">
                    {promo.message}
                  </p>
                ) : promoCode && promo && !promo.valid ? (
                  <p className="mt-2 text-[11px] text-terracotta-deep">
                    {promo.message}
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                    Один промокод на заказ. Скидка пересчитывается на сервере.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-espresso/10 bg-background px-5 pb-5 pt-4 sm:px-6">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Наборы</dt>
                  <dd className="tabular-nums text-espresso">
                    {formatRub(itemsTotal)}
                  </dd>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between gap-4 text-sage-deep">
                    <dt>Скидка</dt>
                    <dd className="tabular-nums">−{formatRub(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4 pt-2">
                  <dt className="text-base font-semibold text-espresso">Итого</dt>
                  <dd className="font-serif text-3xl leading-none text-espresso">
                    {formatRub(total)}
                  </dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                onClick={closeCart}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-4 w-full justify-between",
                )}
              >
                Оформить заказ
                <ArrowRight className="size-4" />
              </Link>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Без списания до подтверждения
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="size-3" /> Доставка отдельно
                </span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
