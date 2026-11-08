import {
  MessageCircle,
  Package,
  Palette,
  Truck,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const steps = [
  {
    number: "01",
    icon: Palette,
    title: "Выбираете сюжет",
    text: "Готовый дизайн из каталога или своя фотография. Сразу видите цену за выбранный размер.",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Согласуем детали",
    text: "Для индивидуальной работы проверяем фото и кадрирование. Для готового дизайна подтверждаем состав.",
  },
  {
    number: "03",
    icon: Package,
    title: "Собираем набор",
    text: "Печатаем схему, подбираем нитки и складываем всё в выбранную комплектацию.",
  },
  {
    number: "04",
    icon: Truck,
    title: "Передаём в доставку",
    text: "Способ и стоимость доставки подтверждает менеджер. Самовывоз — по согласованию.",
  },
];

export function Process() {
  return (
    <section className="wrap pb-16 pt-4 sm:pb-24" aria-labelledby="process-heading">
      <Reveal>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Как это работает</p>
            <h2
              id="process-heading"
              className="mt-4 font-serif text-[2.1rem] leading-none tracking-[-0.02em] text-espresso sm:text-4xl"
            >
              От идеи до первого стежка
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Без автоматических обещаний: индивидуальную схему готовит дизайнер,
            а сроки подтверждает менеджер.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-px overflow-hidden rounded-[2rem] border border-espresso/10 bg-espresso/10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.number} delay={index * 70}>
              <div className="group flex h-full flex-col justify-between gap-8 bg-milk p-6 transition-colors hover:bg-sand/35 sm:p-7">
                <div className="flex items-start justify-between">
                  <span className="font-serif text-4xl leading-none text-terracotta/35">
                    {step.number}
                  </span>
                  <span className="grid size-10 place-items-center rounded-full border border-espresso/10 bg-background text-terracotta transition-colors group-hover:border-terracotta/30 group-hover:bg-milk">
                    <Icon className="size-4" />
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-espresso">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
