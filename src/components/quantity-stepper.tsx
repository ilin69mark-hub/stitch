"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_QUANTITY } from "@/config/pricing";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QUANTITY,
  className,
  label = "Количество",
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-espresso/15 bg-milk",
        size === "sm" ? "h-8" : "h-11",
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn(
          "grid place-items-center rounded-full text-espresso transition-colors hover:bg-sand disabled:opacity-35",
          size === "sm" ? "size-7" : "size-10",
        )}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Уменьшить количество"
      >
        <Minus className={size === "sm" ? "size-3" : "size-4"} />
      </button>
      <span className={cn("text-center font-semibold tabular-nums text-espresso", size === "sm" ? "min-w-6 text-xs" : "min-w-8 text-sm")}>
        {value}
      </span>
      <button
        type="button"
        className={cn(
          "grid place-items-center rounded-full text-espresso transition-colors hover:bg-sand disabled:opacity-35",
          size === "sm" ? "size-7" : "size-10",
        )}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Увеличить количество"
      >
        <Plus className={size === "sm" ? "size-3" : "size-4"} />
      </button>
    </div>
  );
}
