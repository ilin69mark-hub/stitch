import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  tone = "light",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em]",
            tone === "dark" ? "text-milk/55" : "text-terracotta",
            align === "center" && "justify-center",
          )}
        >
          <span
            className={cn(
              "h-px w-8",
              tone === "dark" ? "bg-milk/30" : "bg-terracotta/40",
            )}
          />
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-balance font-serif text-[2.1rem] leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-[3.4rem]",
          tone === "dark" ? "text-milk" : "text-espresso",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 max-w-xl text-[15px] leading-relaxed sm:text-base",
            tone === "dark" ? "text-milk/70" : "text-muted-foreground",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
