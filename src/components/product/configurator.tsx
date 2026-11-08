"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Input } from "@/components/ui/input";
import {
  calculatePrice,
  PricingError,
  validateDimensions,
} from "@/lib/pricing";
import { formatCm, formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { defaultKitId, extraOptions, kitById, kits } from "@/config/kits";
import { defaultSizeId, pricingConfig, standardSizes } from "@/config/pricing";
import type { PriceBreakdown, SizePresetId } from "@/types";
import type { ConfiguratorInitial } from "@/lib/configurator";

export interface ConfiguratorSelection {
  widthCm: number;
  heightCm: number;
  kitId: string;
  optionIds: string[];
  quantity: number;
}

function initialDimensions(initial?: Partial<ConfiguratorInitial>) {
  if (
    typeof initial?.widthCm === "number" &&
    typeof initial.heightCm === "number"
  ) {
    return { widthCm: initial.widthCm, heightCm: initial.heightCm };
  }
  const preset =
    standardSizes.find((size) => size.id === defaultSizeId) ??
    standardSizes[0]!;
  return { widthCm: preset.widthCm, heightCm: preset.heightCm };
}

export function Configurator({
  kind,
  designId,
  initial,
  onSubmit,
  submitLabel = "В корзину",
  compact = false,
}: {
  kind: "design" | "custom";
  designId?: string;
  initial?: Partial<ConfiguratorInitial>;
  onSubmit: (selection: ConfiguratorSelection) => void;
  submitLabel?: string;
  compact?: boolean;
}) {
  const start = initialDimensions(initial);
  const matchingPreset = standardSizes.find(
    (size) =>
      size.widthCm === start.widthCm && size.heightCm === start.heightCm,
  );

  const [presetId, setPresetId] = React.useState<SizePresetId | "custom">(
    matchingPreset?.id ?? "custom",
  );
  const [customSize, setCustomSize] = React.useState(!matchingPreset);
  const [widthInput, setWidthInput] = React.useState(String(start.widthCm));
  const [heightInput, setHeightInput] = React.useState(String(start.heightCm));
  const [kitId, setKitId] = React.useState(initial?.kitId ?? defaultKitId);
  const [optionIds, setOptionIds] = React.useState<string[]>(
    initial?.optionIds ?? [],
  );
  const [quantity, setQuantity] = React.useState(initial?.quantity ?? 1);

  const width = widthInput.trim() === "" ? Number.NaN : Number(widthInput);
  const height = heightInput.trim() === "" ? Number.NaN : Number(heightInput);
  const dimensionCheck = validateDimensions(width, height);

  let breakdown: PriceBreakdown | null = null;
  let priceError = "";
  if (dimensionCheck.valid) {
    try {
      breakdown = calculatePrice({
        kind,
        ...(kind === "design" ? { designId: designId ?? "" } : {}),
        widthCm: width,
        heightCm: height,
        kitId,
        optionIds,
        quantity,
      } as Parameters<typeof calculatePrice>[0]);
    } catch (error) {
      priceError =
        error instanceof PricingError
          ? error.message
          : "Не удалось рассчитать стоимость.";
    }
  }

  const selectedKit = kitById.get(kitId);
  const error = dimensionCheck.valid
    ? priceError
    : dimensionCheck.errors[0] ?? "";

  function choosePreset(id: SizePresetId) {
    const preset = standardSizes.find((size) => size.id === id);
    if (!preset) return;
    setPresetId(id);
    setCustomSize(false);
    setWidthInput(String(preset.widthCm));
    setHeightInput(String(preset.heightCm));
  }

  function chooseCustom() {
    setPresetId("custom");
    setCustomSize(true);
  }

  function toggleOption(id: string, checked: boolean) {
    setOptionIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((entry) => entry !== id),
    );
  }

  function submit() {
    if (!breakdown) return;
    onSubmit({
      widthCm: width,
      heightCm: height,
      kitId,
      optionIds,
      quantity,
    });
  }

  return (
    <div className={cn("space-y-7", compact && "space-y-5")}>
      <section aria-labelledby="size-heading">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3
            id="size-heading"
            className="text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
          >
            Размер
          </h3>
          {breakdown?.areaCm2 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {breakdown.areaCm2} см²
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {standardSizes.map((size) => (
            <button
              key={size.id}
              type="button"
              onClick={() => choosePreset(size.id)}
              className={cn(
                "rounded-xl border px-2 py-3 text-sm font-medium transition-all",
                presetId === size.id && !customSize
                  ? "border-terracotta bg-terracotta/8 text-terracotta-deep shadow-[inset_0_0_0_1px_rgba(184,92,56,0.35)]"
                  : "border-espresso/12 bg-milk text-espresso hover:border-espresso/30",
              )}
              aria-pressed={presetId === size.id && !customSize}
            >
              {size.label}
            </button>
          ))}
          <button
            type="button"
            onClick={chooseCustom}
            className={cn(
              "rounded-xl border px-2 py-3 text-sm font-medium transition-all",
              customSize
                ? "border-terracotta bg-terracotta/8 text-terracotta-deep"
                : "border-dashed border-espresso/25 bg-transparent text-espresso hover:border-espresso/40",
            )}
            aria-pressed={customSize}
          >
            Свой размер
          </button>
        </div>

        {customSize ? (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-sand/45 p-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ширина, см
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={pricingConfig.width.minCm}
                max={pricingConfig.width.maxCm}
                step={pricingConfig.width.stepCm}
                value={widthInput}
                onChange={(event) => setWidthInput(event.target.value)}
                aria-label="Ширина в сантиметрах"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Высота, см
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={pricingConfig.height.minCm}
                max={pricingConfig.height.maxCm}
                step={pricingConfig.height.stepCm}
                value={heightInput}
                onChange={(event) => setHeightInput(event.target.value)}
                aria-label="Высота в сантиметрах"
              />
            </label>
            <p className="col-span-2 text-[11px] leading-relaxed text-muted-foreground">
              От {pricingConfig.width.minCm} до {pricingConfig.width.maxCm} см,
              шаг {formatCm(pricingConfig.width.stepCm)} см. Минимальная площадь —{" "}
              {pricingConfig.minAreaCm2} см².
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="kit-heading">
        <h3
          id="kit-heading"
          className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
        >
          Комплектация
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {kits.map((kit) => {
            const selected = kit.id === kitId;
            return (
              <button
                key={kit.id}
                type="button"
                onClick={() => setKitId(kit.id)}
                className={cn(
                  "relative flex flex-col rounded-xl border p-3 text-left transition-all",
                  selected
                    ? "border-terracotta bg-terracotta/7 shadow-[inset_0_0_0_1px_rgba(184,92,56,0.35)]"
                    : "border-espresso/12 bg-milk hover:border-espresso/30",
                )}
                role="radio"
                aria-checked={selected}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-espresso">
                    {kit.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-semibold tabular-nums",
                      selected ? "text-terracotta-deep" : "text-muted-foreground",
                    )}
                  >
                    {kit.price === 0 ? "включено" : `+ ${formatRub(kit.price)}`}
                  </span>
                </span>
                <span className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {kit.short}
                </span>
                {kit.badge ? (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-sage/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
                    {kit.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {!compact && selectedKit ? (
          <div className="mt-3 rounded-xl border border-espresso/10 bg-milk/60 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              В наборе
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {selectedKit.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-1.5 text-[11px] leading-snug text-espresso/80"
                >
                  <Check className="mt-0.5 size-3 shrink-0 text-sage-deep" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="options-heading">
        <h3
          id="options-heading"
          className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
        >
          Дополнительно
        </h3>
        <div className="space-y-2">
          {extraOptions.map((option) => {
            const checked = optionIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                  checked
                    ? "border-terracotta/45 bg-terracotta/5"
                    : "border-espresso/10 bg-milk/60 hover:border-espresso/25",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    toggleOption(option.id, value === true)
                  }
                  className="mt-0.5"
                  aria-label={option.title}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-espresso">
                      {option.title}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      + {formatRub(option.price)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-espresso">Количество</p>
          <p className="text-[11px] text-muted-foreground">
            До {pricingConfig.maxQuantity} наборов в заказе
          </p>
        </div>
        <QuantityStepper value={quantity} onChange={setQuantity} />
      </section>

      <div className="rounded-2xl border border-espresso/10 bg-sand/45 p-4 sm:p-5">
        {kind === "custom" ? (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-milk/70 p-2.5 text-[11px] leading-snug text-espresso/75">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-terracotta" />
            В стоимость включена подготовка схемы по фотографии. Кадрирование
            согласуем после заказа.
          </p>
        ) : null}
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">
              {kind === "custom" ? "Дизайн по фото" : "Картина"}
            </dt>
            <dd className="font-medium tabular-nums text-espresso">
              {breakdown ? formatRub(breakdown.designPrice) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">
              Комплектация «{selectedKit?.title ?? "—"}»
            </dt>
            <dd className="font-medium tabular-nums text-espresso">
              {breakdown
                ? breakdown.kitPrice === 0
                  ? "включено"
                  : formatRub(breakdown.kitPrice)
                : "—"}
            </dd>
          </div>
          {breakdown && breakdown.optionsPrice > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Дополнительно</dt>
              <dd className="font-medium tabular-nums text-espresso">
                {formatRub(breakdown.optionsPrice)}
              </dd>
            </div>
          ) : null}
          {quantity > 1 ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {formatRub(breakdown?.subtotal ?? 0)} × {quantity}
              </dt>
              <dd className="font-medium tabular-nums text-espresso">
                {breakdown ? formatRub(breakdown.itemsTotal) : "—"}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-espresso/10 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Итого
            </p>
            <p className="font-serif text-3xl leading-none text-espresso">
              {breakdown ? formatRub(breakdown.itemsTotal) : "—"}
            </p>
          </div>
          <Button
            onClick={submit}
            disabled={!breakdown}
            className="min-w-40"
            size="lg"
          >
            {submitLabel}
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-xs leading-relaxed text-terracotta-deep" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Итоговая стоимость подтверждается на сервере при оформлении заказа.
            Доставка рассчитывается отдельно.
          </p>
        )}
      </div>
    </div>
  );
}
