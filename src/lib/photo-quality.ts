import { photoQualityConfig } from "@/config/photo-quality";
import { standardSizes } from "@/config/pricing";
import { formatCm } from "@/lib/utils";
import type { SizePresetId } from "@/types";

export type PhotoQualityLevel = "good" | "warn" | "poor";

export interface PhotoQualitySize {
  widthCm: number;
  heightCm: number;
  presetId?: SizePresetId;
}

export interface PhotoQualityInput {
  widthPx: number;
  heightPx: number;
  widthCm: number;
  heightCm: number;
}

export interface PhotoQualityResult {
  level: PhotoQualityLevel;
  pxPerCm: number;
  sourceWidthPx: number;
  sourceHeightPx: number;
  usedWidthPx: number;
  usedHeightPx: number;
  cropped: boolean;
  aspectMismatch: number;
  suggestedSize: PhotoQualitySize | null;
  title: string;
  message: string;
  tips: string[];
}

function snapCm(value: number): number {
  const { sizeStepCm, minSizeCm, maxSizeCm } = photoQualityConfig;
  const snapped =
    Math.floor((value + 1e-9) / sizeStepCm) * sizeStepCm;
  const clamped = Math.min(maxSizeCm, Math.max(minSizeCm, snapped));
  return Math.round(clamped * 10) / 10;
}

function sizeLabel(widthCm: number, heightCm: number): string {
  return `${formatCm(widthCm)} × ${formatCm(heightCm)} см`;
}

function findPreset(
  widthCm: number,
  heightCm: number,
): SizePresetId | undefined {
  return standardSizes.find(
    (size) => size.widthCm === widthCm && size.heightCm === heightCm,
  )?.id;
}

function formatRatio(aspect: number): string {
  if (Math.abs(aspect - 1) < 0.02) return "1:1";
  return `≈ ${Math.round(aspect * 100) / 100}:1`;
}

export function evaluatePhotoQuality(
  input: PhotoQualityInput,
): PhotoQualityResult | null {
  const { widthPx, heightPx, widthCm, heightCm } = input;
  if (
    !Number.isFinite(widthPx) ||
    !Number.isFinite(heightPx) ||
    !Number.isFinite(widthCm) ||
    !Number.isFinite(heightCm) ||
    widthPx <= 0 ||
    heightPx <= 0 ||
    widthCm <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }

  const { minPxPerCm, goodPxPerCm, aspectTolerance } = photoQualityConfig;
  const targetAspect = widthCm / heightCm;
  const sourceAspect = widthPx / heightPx;

  let usedWidthPx = widthPx;
  let usedHeightPx = heightPx;
  if (sourceAspect > targetAspect) {
    usedWidthPx = heightPx * targetAspect;
  } else if (sourceAspect < targetAspect) {
    usedHeightPx = widthPx / targetAspect;
  }

  const pxPerCm = Math.min(
    usedWidthPx / widthCm,
    usedHeightPx / heightCm,
  );
  const aspectMismatch =
    Math.abs(sourceAspect - targetAspect) / targetAspect;
  const cropped = aspectMismatch > 0.02;

  const belowMinimum = pxPerCm < minPxPerCm;
  const belowGood = pxPerCm < goodPxPerCm;
  const aspectBad = aspectMismatch > aspectTolerance;

  const level: PhotoQualityLevel = belowMinimum
    ? "poor"
    : belowGood || aspectBad
      ? "warn"
      : "good";

  let suggestedSize: PhotoQualitySize | null = null;
  if (level !== "good") {
    const { maxSizeCm } = photoQualityConfig;
    const maxWidthCm = Math.min(maxSizeCm, widthPx / goodPxPerCm);
    const maxHeightCm = Math.min(maxSizeCm, heightPx / goodPxPerCm);

    let suggestedWidthCm = Math.min(widthCm, maxWidthCm);
    let suggestedHeightCm = suggestedWidthCm / sourceAspect;
    if (suggestedHeightCm > Math.min(heightCm, maxHeightCm)) {
      suggestedHeightCm = Math.min(heightCm, maxHeightCm);
      suggestedWidthCm = suggestedHeightCm * sourceAspect;
    }

    const snappedWidthCm = snapCm(suggestedWidthCm);
    const snappedHeightCm = snapCm(suggestedHeightCm);
    const changed =
      Math.abs(snappedWidthCm - widthCm) > 1e-6 ||
      Math.abs(snappedHeightCm - heightCm) > 1e-6;

    if (changed) {
      suggestedSize = {
        widthCm: snappedWidthCm,
        heightCm: snappedHeightCm,
        presetId: findPreset(snappedWidthCm, snappedHeightCm),
      };
    }
  }

  const currentLabel = sizeLabel(widthCm, heightCm);
  const suggestedLabel = suggestedSize
    ? sizeLabel(suggestedSize.widthCm, suggestedSize.heightCm)
    : null;
  const density = Math.round(pxPerCm);
  const recommendedWidth = Math.ceil((widthCm * goodPxPerCm) / 10) * 10;
  const recommendedHeight = Math.ceil((heightCm * goodPxPerCm) / 10) * 10;

  const tips: string[] = [];

  if (level === "good") {
    return {
      level,
      pxPerCm,
      sourceWidthPx: widthPx,
      sourceHeightPx: heightPx,
      usedWidthPx,
      usedHeightPx,
      cropped,
      aspectMismatch,
      suggestedSize,
      title: `Фото подойдёт для ${currentLabel}`,
      message: `${widthPx} × ${heightPx} px · ≈ ${density} px/см. Детализации достаточно.`,
      tips,
    };
  }

  let title: string;
  let message: string;

  if (belowMinimum) {
    title = "Фото слишком маленькое для этого размера";
    message = `Для ${currentLabel} сейчас ≈ ${density} px/см. Мелкие детали могут потеряться.`;
  } else if (belowGood) {
    title = "Может получиться упрощённо";
    message = `Для ${currentLabel} сейчас ≈ ${density} px/см — меньше рекомендуемых ${goodPxPerCm} px/см.`;
  } else {
    title = "Фото будет сильно обрезано";
    message = `Пропорции фото ${formatRatio(sourceAspect)} не совпадают с ${currentLabel}.`;
  }

  if (belowGood) {
    tips.push(
      `Загрузите фото от ${recommendedWidth} × ${recommendedHeight} px или выберите размер поменьше.`,
    );
  }

  if (suggestedLabel) {
    tips.push(
      belowGood
        ? `Рекомендуемый размер для этого фото — ${suggestedLabel}.`
        : `Подойдёт размер ${suggestedLabel} — он сохранит пропорции без обрезки.`,
    );
  }

  if (aspectBad && belowGood) {
    tips.push(
      `Пропорции фото ${formatRatio(sourceAspect)}: при ${currentLabel} края обрежутся.`,
    );
  }

  if (belowMinimum) {
    tips.push(
      "Оформить заказ можно — дизайнер проверит исходник, но мелкие детали могут упроститься.",
    );
  }

  return {
    level,
    pxPerCm,
    sourceWidthPx: widthPx,
    sourceHeightPx: heightPx,
    usedWidthPx,
    usedHeightPx,
    cropped,
    aspectMismatch,
    suggestedSize,
    title,
    message,
    tips,
  };
}
