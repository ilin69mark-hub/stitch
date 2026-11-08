"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator as CalculatorIcon, ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { Select } from "@/components/ui/input";
import { Configurator } from "@/components/product/configurator";
import { useCart } from "@/lib/cart";
import { useCustomPrefill } from "@/lib/prefill";
import { designById, designs } from "@/config/catalog";
import { kitById } from "@/config/kits";
import { pricingConfig } from "@/config/pricing";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Calculator() {
  const { addItem } = useCart();
  const { setPrefill } = useCustomPrefill();
  const [mode, setMode] = React.useState<"ready" | "custom">("ready");
  const [designId, setDesignId] = React.useState(
    designs.find((design) => design.featured)?.id ?? designs[0]!.id,
  );

  const design = designById.get(designId) ?? designs[0]!;

  function goToCustom(selection: {
    widthCm: number;
    heightCm: number;
    kitId: string;
    optionIds: string[];
    quantity: number;
  }) {
    setPrefill(selection);
    toast.success("Размер и комплектация перенесены в форму");
    const node = document.getElementById("custom");
    node?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  return (
    <section
      id="calculator"
      className="wrap py-16 sm:py-24"
      aria-labelledby="calculator-heading"
    >
      <Reveal>
        <SectionHeading
          eyebrow="Калькулятор"
          title="Соберите набор и увидите цену"
          description="Размер, комплектация и дополнительные опции пересчитываются мгновенно. На сервере стоимость проверяется ещё раз — без сюрпризов."
        />
      </Reveal>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Reveal delay={60}>
          <div className="rounded-[2rem] border border-espresso/10 bg-milk p-5 shadow-[0_24px_60px_-45px_rgba(61,47,34,0.5)] sm:p-7">
            <div
              className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-sand/70 p-1"
              role="tablist"
              aria-label="Тип дизайна"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "ready"}
                onClick={() => setMode("ready")}
                className={cn(
                  "rounded-full px-4 py-2.5 text-xs font-semibold transition-all",
                  mode === "ready"
                    ? "bg-milk text-espresso shadow-sm"
                    : "text-espresso/55 hover:text-espresso",
                )}
              >
                Готовый дизайн
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "custom"}
                onClick={() => setMode("custom")}
                className={cn(
                  "rounded-full px-4 py-2.5 text-xs font-semibold transition-all",
                  mode === "custom"
                    ? "bg-espresso text-milk shadow-sm"
                    : "text-espresso/55 hover:text-espresso",
                )}
              >
                По вашему фото
              </button>
            </div>

            {mode === "ready" ? (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-espresso/10 bg-background/60 p-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-sand">
                  <Image
                    src={design.image}
                    alt={design.alt}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="calculator-design"
                    className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Сюжет
                  </label>
                  <Select
                    id="calculator-design"
                    value={designId}
                    onChange={(event) => setDesignId(event.target.value)}
                    className="h-9 border-0 bg-transparent px-0 pr-8 text-sm font-semibold focus-visible:ring-0"
                  >
                    {designs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <Link
                  href="#catalog"
                  className="hidden shrink-0 text-[10px] font-semibold text-terracotta underline-offset-4 hover:underline sm:block"
                >
                  Все сюжеты
                </Link>
              </div>
            ) : (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-terracotta/20 bg-terracotta/5 p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-milk text-terracotta">
                  <ImageIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-espresso">
                    Сначала выберите размер и комплектацию
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Затем нажмите «Перейти к фото» — параметры перенесутся в
                    форму загрузки.
                  </p>
                </div>
              </div>
            )}

            <Configurator
              kind={mode === "ready" ? "design" : "custom"}
              designId={mode === "ready" ? design.id : undefined}
              submitLabel={
                mode === "custom" ? "Перейти к фото" : "Добавить в корзину"
              }
              onSubmit={(selection) => {
                if (mode === "custom") {
                  goToCustom(selection);
                  return;
                }
                addItem({ kind: "design", designId: design.id, ...selection });
                toast.success("Добавлено в корзину");
              }}
            />
          </div>
        </Reveal>

        <Reveal delay={140}>
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[2rem] border border-espresso/10 bg-milk">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-espresso">
                {mode === "ready" ? (
                  <Image
                    src={design.image}
                    alt={design.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-milk/65">
                    <span className="grid size-16 place-items-center rounded-full border border-milk/20 bg-milk/5">
                      <ImageIcon className="size-7" />
                    </span>
                    <p className="max-w-[200px] text-sm leading-relaxed">
                      Здесь появится ваша фотография после загрузки
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 to-transparent p-5 pt-16">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-milk/60">
                        {mode === "ready" ? "Готовый сюжет" : "Индивидуально"}
                      </p>
                      <p className="mt-1 font-serif text-2xl leading-tight text-milk">
                        {mode === "ready" ? design.title : "Ваша фотография"}
                      </p>
                    </div>
                    {mode === "ready" ? (
                      <Badge className="bg-milk/90 text-espresso">
                        {design.paletteSize} цветов
                      </Badge>
                    ) : (
                      <Badge className="bg-milk/90 text-espresso">
                        от {formatRub(pricingConfig.minimumPrice)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-terracotta">
                  <CalculatorIcon className="size-3.5" />
                  Как считается цена
                </p>
                <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                  <li className="flex justify-between gap-3">
                    <span>Площадь вышивки</span>
                    <span className="shrink-0 font-medium text-espresso">
                      {formatRub(pricingConfig.pricePerCm2)} / см²
                    </span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Минимальная стоимость</span>
                    <span className="shrink-0 font-medium text-espresso">
                      {formatRub(pricingConfig.minimumPrice)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Комплектация</span>
                    <span className="shrink-0 font-medium text-espresso">
                      включено
                    </span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Индивидуальная схема</span>
                    <span className="shrink-0 text-right font-medium text-espresso">
                      +25% и {formatRub(pricingConfig.customDesignFee)}
                    </span>
                  </li>
                </ul>
                <p className="mt-4 border-t border-espresso/10 pt-3 text-[10px] leading-relaxed text-muted-foreground">
                  Итоговая цена фиксируется в момент оформления заказа. Доставка
                  рассчитывается отдельно.
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-sand/55 p-5">
              <p className="flex items-center gap-2 text-xs font-semibold text-espresso">
                <Sparkles className="size-3.5 text-terracotta" />
                Нужен другой сюжет?
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Загрузите фотографию: питомца, семьи, места или рисунка. Мы
                проверим качество исходника и предложим подходящий размер.
              </p>
              <Link
                href="#custom"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-deep underline-offset-4 hover:underline"
              >
                Перейти к загрузке
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-espresso/10 px-4 py-3 text-[10px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-sage" />
              Комплектация «{kitById.get("base")?.title}» включена в стоимость
              картины.
            </div>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
