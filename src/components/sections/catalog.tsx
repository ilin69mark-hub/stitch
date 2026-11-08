"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { useConfigurator } from "@/lib/configurator";
import { getDesignFromPrice } from "@/lib/pricing";
import { categories, designs } from "@/config/catalog";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CategoryId } from "@/types";

const filters: Array<{ id: CategoryId | "all"; title: string }> = [
  { id: "all", title: "Все сюжеты" },
  ...categories
    .filter((category) =>
      designs.some((design) => design.categoryId === category.id),
    )
    .map((category) => ({ id: category.id, title: category.title })),
];

export function Catalog() {
  const { openDesign } = useConfigurator();
  const [active, setActive] = React.useState<CategoryId | "all">("all");

  const visible =
    active === "all"
      ? designs
      : designs.filter((design) => design.categoryId === active);

  return (
    <section
      id="catalog"
      className="relative border-y border-espresso/8 bg-milk/45 py-16 sm:py-24"
      aria-labelledby="catalog-heading"
    >
      <div className="wrap">
        <Reveal>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Каталог"
              title={
                <>
                  Двенадцать сюжетов,
                  <br className="hidden sm:block" /> которые хочется вышить
                </>
              }
              description="Каждый дизайн можно собрать в пяти размерах и четырёх комплектациях. Нажмите на сюжет, чтобы увидеть стоимость."
            />
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              {visible.length} из {designs.length} сюжетов
            </div>
          </div>
        </Reveal>

        <div
          className="scrollbar-none -mx-1 mt-8 flex gap-2 overflow-x-auto px-1 pb-1"
          role="group"
          aria-label="Фильтр по категориям"
        >
          {filters.map((filter) => {
            const selected = active === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActive(filter.id)}
                aria-pressed={selected}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all",
                  selected
                    ? "border-espresso bg-espresso text-milk"
                    : "border-espresso/15 bg-milk text-espresso/75 hover:border-espresso/35 hover:text-espresso",
                )}
              >
                {filter.title}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((design, index) => (
            <Reveal key={design.id} delay={Math.min(index * 55, 330)}>
              <article className="group flex h-full flex-col">
                <button
                  type="button"
                  onClick={() => openDesign(design.id)}
                  className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.5rem] bg-sand text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50 focus-visible:ring-offset-2"
                  aria-label={`Настроить дизайн «${design.title}»`}
                >
                  <Image
                    src={design.image}
                    alt={design.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 280px"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-95" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <Badge variant="default" className="bg-milk/90 backdrop-blur">
                      {
                        categories.find(
                          (category) => category.id === design.categoryId,
                        )?.title
                      }
                    </Badge>
                    {design.featured ? (
                      <Badge variant="terracotta" className="bg-milk/90 backdrop-blur">
                        Хит
                      </Badge>
                    ) : null}
                  </div>
                  <span className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-between gap-2 rounded-full bg-milk/95 px-4 py-2.5 text-[11px] font-semibold text-espresso opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                    Выбрать размер
                    <ArrowUpRight className="size-3.5 text-terracotta" />
                  </span>
                </button>

                <div className="flex flex-1 flex-col px-1 pt-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-semibold leading-tight text-espresso">
                      {design.title}
                    </h3>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-terracotta-deep">
                      от {formatRub(getDesignFromPrice(design.id))}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {design.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{design.paletteSize} цветов</span>
                    <span className="size-1 rounded-full bg-espresso/20" />
                    <span>{design.availableSizes.length} размеров</span>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            В этой категории пока нет сюжетов.
          </p>
        ) : null}

        <p className="mt-10 text-center text-[11px] leading-relaxed text-muted-foreground">
          Цена «от» указана за минимальный доступный размер в базовой
          комплектации. Итоговая стоимость зависит от размера и набора.
        </p>
      </div>
    </section>
  );
}
