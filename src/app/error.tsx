"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="wrap py-20 sm:py-32">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-terracotta/10 text-terracotta">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="mt-6 font-serif text-4xl leading-tight text-espresso">
          Что-то пошло не так
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Попробуйте обновить страницу. Если ошибка повторяется, напишите нам —
          заказ и корзина не потеряются.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            <RotateCcw className="size-4" />
            Попробовать снова
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            На главную
          </Link>
        </div>
      </div>
    </section>
  );
}
