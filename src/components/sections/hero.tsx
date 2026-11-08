import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import DisintegratingGallery, {
  type GalleryImage,
} from "@/components/effects/disintegrating-gallery";
import { cn } from "@/lib/utils";

const heroImages: GalleryImage[] = [
  {
    src: "/images/hero/teply-vzglyad.webp",
    alt: "Вышитый портрет мопса",
    title: "Тёплый взгляд",
  },
  {
    src: "/images/hero/floral-hoop.webp",
    alt: "Пяльцы с цветочной вышивкой",
    title: "Цветочная история",
  },
  {
    src: "/images/hero/nad-oblakami.webp",
    alt: "Вышитый горный пейзаж",
    title: "Над облаками",
  },
  {
    src: "/images/hero/podsolnuhi.webp",
    alt: "Вышитые подсолнухи",
    title: "Подсолнухи",
  },
  {
    src: "/images/hero/ulybka.webp",
    alt: "Вышитый портрет улыбающейся женщины",
    title: "Улыбка",
  },
  {
    src: "/images/hero/threads.webp",
    alt: "Катушки мулине",
    title: "Палитра мулине",
  },
  {
    src: "/images/hero/gorodskoy-ritm.webp",
    alt: "Вышитая городская улица",
    title: "Городской ритм",
  },
  {
    src: "/images/hero/sewing-hands.webp",
    alt: "Руки вышивают в пяльцах",
    title: "Руки вышивальщицы",
  },
  {
    src: "/images/hero/rozovyy-vecher.webp",
    alt: "Вышитая роза в вазе",
    title: "Розовый вечер",
  },
  {
    src: "/images/hero/pattern-hoop.webp",
    alt: "Схема вышивания в пяльцах",
    title: "Схема и пяльцы",
  },
];

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="wrap relative pb-2 pt-10 sm:pt-16 lg:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_320px] lg:gap-16">
          <div>
            <p className="eyebrow">Наборы для вышивания по клеткам</p>
            <h1 className="mt-5 max-w-[13ch] text-balance font-serif text-[3.3rem] leading-[0.92] tracking-[-0.035em] text-espresso sm:text-[4.8rem] lg:text-[6.2rem]">
              Ваша фотография —{" "}
              <em className="font-normal italic text-terracotta">в стежках</em>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Готовый дизайн или схема по вашему снимку. Выберите размер,
              комплектацию и упаковку — стоимость появится сразу, без звонка и
              ожидания.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="#custom"
                className={cn(buttonVariants({ size: "lg" }), "group")}
              >
                <Sparkles className="size-4" />
                Создать по фото
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#catalog"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "group",
                )}
              >
                Смотреть каталог
                <ArrowDownRight className="size-4 transition-transform group-hover:translate-y-0.5" />
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-espresso/65">
              {[
                "Схема, канва и нитки",
                "Размеры от 5 до 30 см",
                "Помощь с выбором",
              ].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-sage-deep" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:pb-3">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-espresso p-6 text-milk shadow-[0_30px_70px_-35px_rgba(61,47,34,0.6)]">
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full border border-milk/10"
                aria-hidden="true"
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-milk/45">
                Первый заказ
              </p>
              <p className="mt-3 font-serif text-6xl leading-none text-milk">
                −10%
              </p>
              <p className="mt-3 text-sm leading-relaxed text-milk/70">
                по коду <span className="font-semibold text-milk">FIRST10</span>{" "}
                при заказе от 990 ₽. Один раз на почту.
              </p>
              <Link
                href="#catalog"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-milk underline-offset-4 hover:underline"
              >
                Выбрать набор
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground lg:text-left">
              Демонстрационные цены и условия. Проверьте конфигурацию перед
              публикацией.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap relative mt-6 sm:mt-10">
        <DisintegratingGallery
          images={heroImages}
          label="Работы для вдохновения"
        />
      </div>

      <div className="wrap relative z-10 -mt-3 pb-12 sm:pb-16">
        <div className="grid gap-4 border-y border-espresso/10 py-5 sm:grid-cols-3">
          {[
            { value: "12", label: "готовых сюжетов в каталоге" },
            { value: "4", label: "собранных бокса для старта" },
            { value: "5", label: "размеров от 5 × 5 до 30 × 30 см" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-3">
              <span className="font-serif text-4xl leading-none text-terracotta">
                {stat.value}
              </span>
              <span className="max-w-[15rem] text-[11px] leading-snug text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
