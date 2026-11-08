"use client";

import { toast } from "sonner";
import { Boxes as BoxesIcon } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import {
  SqueezeCarousel,
  type SqueezeSlide,
} from "@/components/effects/carousel-squeeze";
import { useCart } from "@/lib/cart";
import { boxes } from "@/config/boxes";
import { formatRub } from "@/lib/utils";

export function BoxesSection() {
  const { addItem } = useCart();

  const slides: SqueezeSlide[] = boxes.map((box) => ({
    id: box.id,
    title: box.title,
    description: `${box.tagline}. ${box.sizeLabel}. В составе: ${box.composition.join(", ")}.`,
    image: box.image,
    imageAlt: box.alt,
    overlay: (
      <span className="flex w-full items-end justify-between gap-3 text-milk">
        <span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-milk/65">
            {box.badge ?? "Бокс"}
          </span>
          <span className="mt-1 block font-serif text-2xl leading-tight">
            {box.title}
          </span>
        </span>
        <span className="shrink-0 font-serif text-2xl leading-none">
          {formatRub(box.price)}
        </span>
      </span>
    ),
    action: "В корзину",
    onAction: () => {
      addItem({ kind: "box", boxId: box.id, quantity: 1 });
      toast.success(`${box.title} — в корзине`);
    },
  }));

  return (
    <section
      id="boxes"
      className="relative overflow-hidden bg-espresso py-16 text-milk sm:py-24"
      aria-labelledby="boxes-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 22px, rgba(252,248,241,0.7) 22px 23px), repeating-linear-gradient(-45deg, transparent 0 22px, rgba(252,248,241,0.7) 22px 23px)",
        }}
        aria-hidden="true"
      />
      <div className="wrap relative">
        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              tone="dark"
              eyebrow="Боксы"
              title={
                <>
                  Собранные наборы
                  <br className="hidden sm:block" /> для первого стежка
                </>
              }
              description="Если не хочется выбирать по деталям — возьмите готовый бокс. Внутри уже лежит всё необходимое, включая инструменты и упаковку."
            />
            <p className="inline-flex items-center gap-2 rounded-full border border-milk/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-milk/55">
              <BoxesIcon className="size-3.5" />4 бокса
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-8 rounded-[2rem] bg-background p-3 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.65)] sm:p-5">
            <SqueezeCarousel
              slides={slides}
              label="Подарочные боксы"
              height="clamp(230px, 34vw, 390px)"
              slatWidth={10}
              slatGap={8}
              gap={14}
              radius={24}
              duration={850}
              autoplay={false}
              controls
              className="[--sq-accent:#b85c38] [--sq-accent-foreground:#fdf8f0]"
            />
          </div>
        </Reveal>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-milk/40">
          Состав и цены боксов — демонстрационные. Перед публикацией замените их
          на подтверждённые продавцом.
        </p>
      </div>
    </section>
  );
}
