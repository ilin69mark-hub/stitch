import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="wrap py-20 sm:py-32">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sand text-terracotta">
          <SearchX className="size-7" />
        </span>
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-espresso sm:text-5xl">
          Такой страницы нет
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Возможно, ссылка устарела или в адресе опечатка. Вернитесь в каталог
          или создайте картину по фото.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
            <ArrowLeft className="size-4" />
            На главную
          </Link>
          <Link
            href="/#catalog"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            В каталог
          </Link>
        </div>
      </div>
    </section>
  );
}
