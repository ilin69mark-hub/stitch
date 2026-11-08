import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "light",
  compact = false,
}: {
  className?: string;
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.85rem] bg-terracotta text-primary-foreground shadow-[0_8px_20px_-10px_rgba(184,92,56,0.8)]">
        <svg
          viewBox="0 0 40 40"
          className="size-7"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M11 11.5 28.5 29M29 11.5 11.5 29"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M7 20h4M29 20h4M20 7v4M20 29v4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity=".65"
          />
        </svg>
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-serif text-[1.45rem] tracking-[-0.02em]",
              tone === "dark" ? "text-milk" : "text-espresso",
            )}
          >
            Стежок
          </span>
          <span
            className={cn(
              "mt-1 text-[9px] font-semibold uppercase tracking-[0.22em]",
              tone === "dark" ? "text-milk/50" : "text-muted-foreground",
            )}
          >
            наборы для вышивания
          </span>
        </span>
      )}
    </span>
  );
}
