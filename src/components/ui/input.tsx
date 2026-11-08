import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-espresso/15 bg-milk px-4 text-[15px] text-espresso shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors placeholder:text-muted-foreground/70 focus-visible:border-terracotta/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full resize-y rounded-xl border border-espresso/15 bg-milk px-4 py-3 text-[15px] text-espresso transition-colors placeholder:text-muted-foreground/70 focus-visible:border-terracotta/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-espresso/15 bg-milk px-4 pr-10 text-[15px] text-espresso transition-colors focus-visible:border-terracotta/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/20 disabled:cursor-not-allowed disabled:opacity-50",
        "select-caret",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
