"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuantityStepper } from "@/components/quantity-stepper";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { PhotoQualityPanel } from "@/components/product/photo-quality-panel";
import { useCart } from "@/lib/cart";
import { useCustomPrefill } from "@/lib/prefill";
import {
  calculatePrice,
  PricingError,
  validateDimensions,
} from "@/lib/pricing";
import {
  evaluatePhotoQuality,
  type PhotoQualitySize,
} from "@/lib/photo-quality";
import { extraOptions, kits, kitById } from "@/config/kits";
import { pricingConfig, standardSizes } from "@/config/pricing";
import { commercialConfig } from "@/config/site";
import { cn, formatCm, formatRub } from "@/lib/utils";
import type { PriceBreakdown, SizePresetId } from "@/types";

const CHECKOUT_KEY = "stezhok-checkout-prefill";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  });
}

async function makeThumbnail(file: File): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const size = 360;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    const scale = Math.max(
      size / image.naturalWidth,
      size / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(
      image,
      (size - width) / 2,
      (size - height) / 2,
      width,
      height,
    );
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CustomOrder() {
  const router = useRouter();
  const { addItem, closeCart } = useCart();
  const { prefill } = useCustomPrefill();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [contactMethod, setContactMethod] = React.useState<string>(
    commercialConfig.contactMethods[0],
  );
  const [comment, setComment] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  const [widthInput, setWidthInput] = React.useState("20");
  const [heightInput, setHeightInput] = React.useState("20");
  const [presetId, setPresetId] = React.useState<SizePresetId | "custom">(
    "20x20",
  );
  const [customSize, setCustomSize] = React.useState(false);
  const [kitId, setKitId] = React.useState("base");
  const [optionIds, setOptionIds] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [imageMeta, setImageMeta] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [fileError, setFileError] = React.useState("");
  const [upload, setUpload] = React.useState<{
    id: string;
    token: string;
    fileName: string;
  } | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!prefill) return;
    const frame = requestAnimationFrame(() => {
      setWidthInput(String(prefill.widthCm));
      setHeightInput(String(prefill.heightCm));
      setKitId(prefill.kitId);
      setOptionIds(prefill.optionIds);
      setQuantity(prefill.quantity);
      const preset = standardSizes.find(
        (size) =>
          size.widthCm === prefill.widthCm &&
          size.heightCm === prefill.heightCm,
      );
      setPresetId(preset?.id ?? "custom");
      setCustomSize(!preset);
    });
    return () => cancelAnimationFrame(frame);
  }, [prefill]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const width = widthInput.trim() === "" ? Number.NaN : Number(widthInput);
  const height = heightInput.trim() === "" ? Number.NaN : Number(heightInput);
  const dimensionCheck = validateDimensions(width, height);

  let breakdown: PriceBreakdown | null = null;
  let priceError = "";
  if (dimensionCheck.valid) {
    try {
      breakdown = calculatePrice({
        kind: "custom",
        widthCm: width,
        heightCm: height,
        kitId,
        optionIds,
        quantity,
      });
    } catch (error) {
      priceError =
        error instanceof PricingError
          ? error.message
          : "Не удалось рассчитать стоимость.";
    }
  }

  const sizeError = dimensionCheck.valid
    ? priceError
    : dimensionCheck.errors[0] ?? "";
  const canUploadPhoto = dimensionCheck.valid;

  const quality = React.useMemo(() => {
    if (!imageMeta) return null;
    return evaluatePhotoQuality({
      widthPx: imageMeta.width,
      heightPx: imageMeta.height,
      widthCm: width,
      heightCm: height,
    });
  }, [imageMeta, width, height]);

  function applySuggestedSize(size: PhotoQualitySize) {
    setPresetId(size.presetId ?? "custom");
    setCustomSize(!size.presetId);
    setWidthInput(String(size.widthCm));
    setHeightInput(String(size.heightCm));
  }

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

  function handleFile(next: File) {
    setFileError("");
    setImageMeta(null);
    setUpload(null);
    if (!ALLOWED_TYPES.includes(next.type)) {
      setFileError("Подойдёт JPG, PNG или WebP.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setFileError("Файл больше 15 МБ. Сожмите фотографию и попробуйте снова.");
      return;
    }
    const url = URL.createObjectURL(next);
    void loadImage(url)
      .then((image) => {
        if (image.naturalWidth < 300 || image.naturalHeight < 300) {
          URL.revokeObjectURL(url);
          setImageMeta(null);
          setFileError("Минимальный размер фотографии — 300 × 300 px.");
          return;
        }
        if (image.naturalWidth * image.naturalHeight > 40_000_000) {
          URL.revokeObjectURL(url);
          setImageMeta(null);
          setFileError("Слишком большое разрешение. Уменьшите фотографию.");
          return;
        }
        setFile(next);
        setImageMeta({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return url;
        });
      })
      .catch(() => {
        URL.revokeObjectURL(url);
        setImageMeta(null);
        setFileError("Не удалось прочитать изображение.");
      });
  }

  function clearFile() {
    setFile(null);
    setImageMeta(null);
    setUpload(null);
    setFileError("");
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function openFilePicker() {
    if (!dimensionCheck.valid || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  async function ensureUpload(): Promise<{
    id: string;
    token: string;
    fileName: string;
  } | null> {
    if (upload) return upload;
    if (!file) return null;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        upload?: { id: string; token: string; fileName: string };
        error?: { message?: string };
      };
      if (!response.ok || !data.upload) {
        setFileError(
          data.error?.message ?? "Не удалось загрузить фотографию.",
        );
        return null;
      }
      const info = {
        id: data.upload.id,
        token: data.upload.token,
        fileName: data.upload.fileName,
      };
      setUpload(info);
      return info;
    } catch {
      setFileError("Сеть недоступна. Попробуйте ещё раз.");
      return null;
    } finally {
      setUploading(false);
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
    if (!file) nextErrors.file = "Загрузите фотографию.";
    if (!consent) nextErrors.consent = "Подтвердите согласие.";
    if (!breakdown) nextErrors.price = "Проверьте размер и комплектацию.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Проверьте выделенные поля.");
      return;
    }
    if (!file) return;

    setSubmitting(true);
    try {
      const info = await ensureUpload();
      if (!info) {
        setSubmitting(false);
        return;
      }
      const thumbnail = await makeThumbnail(file);
      addItem({
        kind: "custom",
        uploadId: info.id,
        uploadToken: info.token,
        fileName: info.fileName,
        previewDataUrl: thumbnail,
        widthCm: width,
        heightCm: height,
        kitId,
        optionIds,
        quantity,
        comment: comment.trim() || undefined,
      });
      try {
        sessionStorage.setItem(
          CHECKOUT_KEY,
          JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            contactMethod,
            comment: comment.trim(),
          }),
        );
      } catch {
        // The checkout form can be filled in manually.
      }
      toast.success("Фотография загружена. Переходим к оформлению.");
      closeCart();
      router.push("/checkout");
    } catch {
      setFormError("Не удалось подготовить заказ. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  const selectedKit = kitById.get(kitId);

  return (
    <section
      id="custom"
      className="border-y border-espresso/8 bg-milk/45 py-16 sm:py-24"
      aria-labelledby="custom-heading"
    >
      <div className="wrap">
        <Reveal>
          <SectionHeading
            eyebrow="По вашему фото"
            title="Картина, которой ещё нет"
            description="Сначала выберите размер, затем загрузите фотографию — сразу покажем, хватит ли качества для вышивки. Мы проверим исходник, подготовим схему и согласуем кадрирование после заказа."
          />
        </Reveal>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Reveal delay={60}>
            <form
              id="custom-order-form"
              onSubmit={handleSubmit}
              className="space-y-8 rounded-[2rem] border border-espresso/10 bg-milk p-5 shadow-[0_24px_60px_-45px_rgba(61,47,34,0.5)] sm:p-7"
              noValidate
            >
              <section aria-labelledby="custom-size-heading">
                <h3
                  id="custom-size-heading"
                  className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
                >
                  01 · Размер
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {standardSizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => choosePreset(size.id)}
                      className={cn(
                        "rounded-xl border px-2 py-3 text-sm font-medium transition-all",
                        presetId === size.id && !customSize
                          ? "border-terracotta bg-terracotta/8 text-terracotta-deep"
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
                        : "border-dashed border-espresso/25 text-espresso hover:border-espresso/40",
                    )}
                    aria-pressed={customSize}
                  >
                    Свой размер
                  </button>
                </div>
                {customSize ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-sand/45 p-3">
                    <label>
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
                      />
                    </label>
                    <label>
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
                      />
                    </label>
                    <p className="col-span-2 text-[11px] leading-relaxed text-muted-foreground">
                      От {pricingConfig.width.minCm} до{" "}
                      {pricingConfig.width.maxCm} см, шаг{" "}
                      {formatCm(pricingConfig.width.stepCm)} см. Минимальная
                      площадь — {pricingConfig.minAreaCm2} см².
                    </p>
                  </div>
                ) : null}
                {sizeError ? (
                  <p className="mt-2 text-[11px] text-terracotta-deep">
                    {sizeError}
                  </p>
                ) : null}
              </section>

              <section aria-labelledby="photo-heading">
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <h3
                    id="photo-heading"
                    className="text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
                  >
                    02 · Фотография
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    JPG, PNG, WebP · до 15 МБ
                  </span>
                </div>

                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
                    dragging
                      ? "border-terracotta bg-terracotta/5"
                      : "border-espresso/15 bg-background/50",
                    fileError && "border-terracotta/60",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (canUploadPhoto) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (!canUploadPhoto) return;
                    const next = event.dataTransfer.files[0];
                    if (next) handleFile(next);
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(",")}
                    className="sr-only"
                    disabled={!canUploadPhoto}
                    onChange={(event) => {
                      const next = event.target.files?.[0];
                      if (next) handleFile(next);
                    }}
                    aria-label="Загрузить фотографию"
                  />

                  {previewUrl ? (
                    <div className="relative aspect-[16/10] w-full">
                      <Image
                        src={previewUrl}
                        alt="Предпросмотр загруженной фотографии"
                        fill
                        sizes="(max-width: 1024px) 100vw, 720px"
                        className="object-contain p-3"
                        unoptimized
                      />
                      <div className="absolute right-3 top-3 flex gap-2">
                        <button
                          type="button"
                          onClick={openFilePicker}
                          disabled={!canUploadPhoto}
                          className="rounded-full bg-milk/90 px-3 py-1.5 text-[10px] font-semibold text-espresso shadow-sm backdrop-blur transition-colors hover:bg-milk disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Заменить
                        </button>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="grid size-8 place-items-center rounded-full bg-milk/90 text-espresso shadow-sm backdrop-blur transition-colors hover:bg-milk"
                          aria-label="Удалить фотографию"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink/60 to-transparent px-4 pb-3 pt-8 text-[10px] text-milk">
                        <span className="truncate">{file?.name}</span>
                        <span className="shrink-0">
                          {file ? `${(file.size / 1024 / 1024).toFixed(1)} МБ` : ""}
                        </span>
                      </div>
                    </div>
                  ) : canUploadPhoto ? (
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center transition-colors hover:bg-sand/20"
                    >
                      <span className="grid size-12 place-items-center rounded-full bg-sand text-terracotta">
                        <Upload className="size-5" />
                      </span>
                      <span className="text-sm font-semibold text-espresso">
                        Перетащите фото или выберите файл
                      </span>
                      <span className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                        Лучше всего работают чёткие снимки с хорошим светом.
                        Минимум 300 × 300 px, максимум 40 МП.
                      </span>
                    </button>
                  ) : (
                    <div className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-sand text-muted-foreground">
                        <AlertCircle className="size-5" />
                      </span>
                      <span className="text-sm font-semibold text-espresso">
                        Сначала выберите корректный размер
                      </span>
                      <span className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                        Загрузка фото станет доступна, когда ширина и высота
                        будут указаны верно.
                      </span>
                    </div>
                  )}
                </div>
                {fileError || errors.file ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-terracotta-deep">
                    <AlertCircle className="size-3.5" />
                    {fileError || errors.file}
                  </p>
                ) : null}
                {upload ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-sage-deep">
                    <Check className="size-3.5" />
                    Фотография загружена и проверена.
                  </p>
                ) : null}
                {quality ? (
                  <PhotoQualityPanel
                    quality={quality}
                    onApplySize={applySuggestedSize}
                    onReplace={openFilePicker}
                  />
                ) : null}
              </section>

              <section aria-labelledby="custom-kit-heading">
                <h3
                  id="custom-kit-heading"
                  className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
                >
                  03 · Комплектация
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
                          "flex flex-col rounded-xl border p-3 text-left transition-all",
                          selected
                            ? "border-terracotta bg-terracotta/7"
                            : "border-espresso/12 bg-milk hover:border-espresso/30",
                        )}
                        role="radio"
                        aria-checked={selected}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-espresso">
                            {kit.title}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            {kit.price === 0
                              ? "включено"
                              : `+ ${formatRub(kit.price)}`}
                          </span>
                        </span>
                        <span className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          {kit.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section aria-labelledby="custom-options-heading">
                <h3
                  id="custom-options-heading"
                  className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
                >
                  04 · Дополнительно
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
                        />
                        <span className="flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-medium text-espresso">
                              {option.title}
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
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
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-espresso">
                      Количество
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      До {pricingConfig.maxQuantity} наборов
                    </p>
                  </div>
                  <QuantityStepper value={quantity} onChange={setQuantity} />
                </div>
              </section>

              <section aria-labelledby="contacts-heading">
                <h3
                  id="contacts-heading"
                  className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-espresso"
                >
                  05 · Контакты
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="custom-name">Имя</Label>
                    <Input
                      id="custom-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Как к вам обращаться"
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
                    <Label htmlFor="custom-email">Email</Label>
                    <Input
                      id="custom-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
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
                    <Label htmlFor="custom-phone">Телефон (необязательно)</Label>
                    <Input
                      id="custom-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+7 ..."
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-contact">Способ связи</Label>
                    <Select
                      id="custom-contact"
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
                  <div className="sm:col-span-2">
                    <Label htmlFor="custom-comment">Комментарий</Label>
                    <Textarea
                      id="custom-comment"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Пожелания к кадрированию, детали, сроки"
                      maxLength={1000}
                    />
                  </div>
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
                      href="/legal/privacy"
                      className="text-terracotta underline-offset-2 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      политикой конфиденциальности
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

              <div className="rounded-xl border border-espresso/10 bg-background/60 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mr-1 inline size-3.5 text-sage-deep" />
                {commercialConfig.productionNote}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full justify-between lg:hidden"
                disabled={submitting || uploading}
              >
                {submitting || uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Готовим заказ…
                  </>
                ) : (
                  <>
                    Перейти к оформлению
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </Reveal>

          <Reveal
            delay={140}
            className="lg:sticky lg:top-20 lg:self-start"
          >
            <aside className="space-y-4 lg:space-y-3">
              <div className="overflow-hidden rounded-[2rem] border border-espresso/10 bg-milk">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-espresso lg:aspect-auto lg:h-[clamp(230px,40dvh,400px)]">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Ваша фотография для вышивки"
                      fill
                      sizes="(max-width: 1024px) 100vw, 380px"
                      className="object-contain p-4"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-milk/60">
                      <span className="grid size-16 place-items-center rounded-full border border-milk/20 bg-milk/5">
                        <ImageIcon className="size-7" />
                      </span>
                      <p className="max-w-[210px] text-sm leading-relaxed">
                        Загрузите фотографию, чтобы увидеть её здесь
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5 pt-16">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-milk/60">
                      Индивидуальная работа
                    </p>
                    <p className="mt-1 font-serif text-2xl text-milk">
                      Картина по фото
                    </p>
                  </div>
                </div>

                <div className="p-5 lg:p-4">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Размер</dt>
                      <dd className="font-medium text-espresso">
                        {Number.isFinite(width) ? formatCm(width) : "—"} ×{" "}
                        {Number.isFinite(height) ? formatCm(height) : "—"} см
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Комплектация</dt>
                      <dd className="font-medium text-espresso">
                        {selectedKit?.title ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Количество</dt>
                      <dd className="font-medium text-espresso">{quantity}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-espresso/10 pt-2">
                      <dt className="font-semibold text-espresso">Итого</dt>
                      <dd className="font-serif text-2xl leading-none text-espresso">
                        {breakdown ? formatRub(breakdown.itemsTotal) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    type="submit"
                    form="custom-order-form"
                    size="lg"
                    className="mt-3 hidden w-full justify-between lg:flex"
                    disabled={submitting || uploading}
                  >
                    {submitting || uploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Готовим заказ…
                      </>
                    ) : (
                      <>
                        Перейти к оформлению
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                    Сначала проверим фото, затем откроется оформление заказа.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-sand/55 p-4 text-[11px] leading-relaxed text-muted-foreground lg:[@media(max-height:760px)]:hidden">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-espresso">
                  <Check className="size-3.5 text-sage-deep" />
                  Что будет после загрузки
                </p>
                <ol className="space-y-1.5">
                  <li>1. Проверим разрешение и качество исходника.</li>
                  <li>2. Предложим размер и кадрирование, если нужно.</li>
                  <li>3. Подготовим схему и соберём набор.</li>
                </ol>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
