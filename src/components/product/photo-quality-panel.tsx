"use client";

import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCm } from "@/lib/utils";
import type { PhotoQualityResult, PhotoQualitySize } from "@/lib/photo-quality";

const tone = {
  good: {
    box: "border-sage/35 bg-sage/8",
    icon: "text-sage-deep",
    title: "text-sage-deep",
    Icon: Check,
  },
  warn: {
    box: "border-gold/45 bg-gold/10",
    icon: "text-gold",
    title: "text-espresso",
    Icon: AlertCircle,
  },
  poor: {
    box: "border-terracotta/40 bg-terracotta/8",
    icon: "text-terracotta",
    title: "text-terracotta-deep",
    Icon: AlertCircle,
  },
} as const;

export function PhotoQualityPanel({
  quality,
  onApplySize,
  onReplace,
}: {
  quality: PhotoQualityResult;
  onApplySize: (size: PhotoQualitySize) => void;
  onReplace: () => void;
}) {
  const { box, icon, title, Icon } = tone[quality.level];
  const suggested = quality.suggestedSize;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("mt-3 rounded-xl border p-3.5", box)}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", title)}>{quality.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {quality.message}
          </p>
          {quality.tips.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              {quality.tips.map((tip) => (
                <li key={tip} className="flex gap-1.5">
                  <span aria-hidden="true">·</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {suggested ? (
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => onApplySize(suggested)}
              >
                Поставить {formatCm(suggested.widthCm)} ×{" "}
                {formatCm(suggested.heightCm)} см
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReplace}
            >
              Загрузить другое фото
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
