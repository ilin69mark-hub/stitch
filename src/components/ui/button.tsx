import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-terracotta text-primary-foreground shadow-[0_10px_30px_-14px_rgba(184,92,56,0.7)] hover:-translate-y-0.5 hover:bg-terracotta-deep",
        dark: "bg-espresso text-milk hover:-translate-y-0.5 hover:bg-ink",
        outline:
          "border border-espresso/20 bg-transparent text-espresso hover:border-espresso/45 hover:bg-espresso/5",
        soft: "bg-sand text-espresso hover:bg-sand-deep/70",
        ghost: "text-espresso hover:bg-espresso/5",
        link: "rounded-none p-0 text-terracotta underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6",
        lg: "h-13 px-8 text-[15px]",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
