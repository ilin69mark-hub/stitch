"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, ShoppingBag, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { navLinks } from "@/config/site";
import { cn } from "@/lib/utils";

export function Header() {
  const { openCart, items } = useCart();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-espresso/10 bg-background/88 shadow-[0_10px_30px_-24px_rgba(43,33,24,0.5)] backdrop-blur-xl"
          : "border-transparent bg-background/60 backdrop-blur-sm",
      )}
    >
      <div className="wrap flex h-[76px] items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40"
          aria-label="Стежок — на главную"
        >
          <Logo />
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Основная навигация"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-espresso/75 transition-colors hover:bg-espresso/5 hover:text-espresso"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/#custom"
            className={cn(
              buttonVariants({ variant: "dark", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            <Sparkles className="size-3.5" />
            По вашему фото
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative grid size-10 place-items-center rounded-full border border-espresso/12 bg-milk/70 text-espresso transition-colors hover:border-espresso/30 hover:bg-milk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40"
            aria-label={`Корзина${count > 0 ? `, наборов: ${count}` : ""}`}
          >
            <ShoppingBag className="size-[18px]" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-terracotta text-[10px] font-bold text-primary-foreground">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-10 place-items-center rounded-full border border-espresso/12 bg-milk/70 text-espresso transition-colors hover:bg-milk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="size-[18px]" />
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="max-w-sm">
          <div className="border-b border-espresso/10 px-5 py-5 pr-16">
            <SheetTitle className="sr-only">Меню</SheetTitle>
            <SheetDescription className="sr-only">
              Навигация по магазину
            </SheetDescription>
            <Logo />
          </div>
          <nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-5"
            aria-label="Мобильная навигация"
          >
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="group flex items-center justify-between rounded-xl px-3 py-3.5 text-lg font-medium text-espresso transition-colors hover:bg-sand/60"
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    0{index + 1}
                  </span>
                  {link.label}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </nav>
          <div className="border-t border-espresso/10 p-5">
            <Link
              href="/#custom"
              onClick={() => setMenuOpen(false)}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full justify-between",
              )}
            >
              Создать картину по фото
              <ArrowUpRight className="size-4" />
            </Link>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Промокод на первый заказ: <strong>FIRST10</strong>
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
