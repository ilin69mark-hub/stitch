import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

const readyPoints = [
  "Схема, канва, нитки и игла",
  "5 размеров и 4 комплектации",
  "Готово к заказу сегодня",
];

const customPoints = [
  "JPG, PNG или WebP до 15 МБ",
  "Согласуем кадрирование",
  "Стоимость видна сразу",
];

export function Ways() {
  return (
    <section className="wrap py-16 sm:py-24" aria-labelledby="ways-heading">
      <Reveal>
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Два пути к одной картине</p>
            <h2
              id="ways-heading"
              className="mt-4 max-w-xl text-balance font-serif text-[2.4rem] leading-[1.02] tracking-[-0.025em] text-espresso sm:text-5xl"
            >
              Выберите готовый сюжет или начните со своего кадра
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            В обоих случаях вы получаете полный набор для вышивания. Разница — в
            том, кто придумывает изображение.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal delay={80}>
          <article className="group relative h-full overflow-hidden rounded-[2rem] border border-espresso/10 bg-milk">
            <div className="grid h-full min-h-[430px] sm:grid-cols-[1.05fr_0.95fr]">
              <div className="flex flex-col justify-between gap-8 p-7 sm:p-9">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-terracotta">
                    <span className="grid size-6 place-items-center rounded-full bg-terracotta/10">
                      01
                    </span>
                    Готовый дизайн
                  </p>
                  <h3 className="mt-5 text-balance font-serif text-3xl leading-[1.05] text-espresso sm:text-4xl">
                    Сюжет уже нарисован. Осталось выбрать размер
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Двенадцать сюжетов — от портретов животных до городских
                    пейзажей. Палитра и схема подготовлены, материалы собраны в
                    набор.
                  </p>
                </div>
                <div>
                  <ul className="mb-6 space-y-2">
                    {readyPoints.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2 text-xs text-espresso/75"
                      >
                        <Check className="size-3.5 text-sage-deep" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="#catalog"
                    className={cn(
                      buttonVariants({ variant: "dark", size: "md" }),
                      "group/cta w-full justify-between sm:w-auto",
                    )}
                  >
                    Перейти в каталог
                    <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                </div>
              </div>
              <div className="relative min-h-[260px] overflow-hidden sm:min-h-full">
                <Image
                  src="/images/lifestyle/floral-hoop.webp"
                  alt="Пяльцы с цветочной вышивкой на светлом столе"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 320px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-milk/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-espresso backdrop-blur">
                  12 сюжетов
                </span>
              </div>
            </div>
          </article>
        </Reveal>

        <Reveal delay={160}>
          <article className="group relative h-full overflow-hidden rounded-[2rem] bg-espresso text-milk">
            <div className="grid h-full min-h-[430px] sm:grid-cols-[1.05fr_0.95fr]">
              <div className="flex flex-col justify-between gap-8 p-7 sm:p-9">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-milk/50">
                    <span className="grid size-6 place-items-center rounded-full bg-milk/10">
                      02
                    </span>
                    По вашему фото
                  </p>
                  <h3 className="mt-5 text-balance font-serif text-3xl leading-[1.05] text-milk sm:text-4xl">
                    Ваш кадр станет схемой, а схема — картиной
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-milk/65">
                    Загрузите фотографию, выберите размер и комплектацию.
                    Дизайнер подготовит схему и согласует с вами кадрирование
                    после заказа.
                  </p>
                </div>
                <div>
                  <ul className="mb-6 space-y-2">
                    {customPoints.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2 text-xs text-milk/70"
                      >
                        <Check className="size-3.5 text-gold" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="#custom"
                    className={cn(
                      buttonVariants({ size: "md" }),
                      "group/cta w-full justify-between sm:w-auto",
                    )}
                  >
                    <Sparkles className="size-4" />
                    Загрузить фото
                    <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                </div>
              </div>
              <div className="relative min-h-[260px] overflow-hidden sm:min-h-full">
                <Image
                  src="/images/lifestyle/sewing-hands.webp"
                  alt="Руки вышивают картину в деревянных пяльцах"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 320px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-espresso/10 to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-milk/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-espresso backdrop-blur">
                  Индивидуально
                </span>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
