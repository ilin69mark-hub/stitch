import { SectionHeading } from "@/components/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/reveal";
import { pricingConfig } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { formatRub } from "@/lib/utils";

export const faqItems = [
  {
    question: "Подойдёт ли любая фотография?",
    answer:
      "Лучше всего работают чёткие снимки с хорошим светом и понятным сюжетом. Минимальный размер — 300 × 300 px, максимальный — 40 МП, файл до 15 МБ. После загрузки дизайнер проверит исходник и предложит кадрирование; если фото не подходит для вышивки, мы скажем об этом до производства.",
  },
  {
    question: "Что входит в базовый набор?",
    answer:
      "Схема вышивания, канва, подобранные нитки мулине, игла и инструкция. В комплектациях «В рамке», «Подарочный» и «Мастерский» добавляются рамка, упаковка, пяльцы и инструменты — состав указан рядом с выбором комплектации.",
  },
  {
    question: "Как считается стоимость?",
    answer: `Базовая цена — ${formatRub(pricingConfig.pricePerCm2)} за см², но не меньше ${formatRub(pricingConfig.minimumPrice)}. К ней прибавляется выбранная комплектация и дополнительные опции. Для индивидуальной схемы по фото действует коэффициент 25% и фиксированная надбавка ${formatRub(pricingConfig.customDesignFee)}. Доставка рассчитывается отдельно.`,
  },
  {
    question: "Сколько времени занимает изготовление?",
    answer:
      "Срок зависит от размера, сложности схемы и загрузки производства. Точную дату подтвердит менеджер после согласования кадрирования. Мы не обещаем мгновенную автоматическую генерацию схемы: индивидуальную работу готовит дизайнер.",
  },
  {
    question: "Можно ли оплатить онлайн?",
    answer:
      "В демонстрационной конфигурации онлайн-оплата может быть не подключена: заказ сохранится со статусом «ожидает оплаты», деньги не списываются. Когда платёжный провайдер настроен, после оформления появится ссылка на оплату. Статус «оплачен» выставляется только после подтверждения платежа провайдером.",
  },
  {
    question: "Как выбрать размер?",
    answer:
      "10 × 10 см — небольшой акцент, 20 × 20 см — универсальный формат для стены или полки, 30 × 30 см — выразительная картина с деталями. Для портретов и сложных сюжетов лучше выбирать 20 × 20 см и больше. Можно указать свой размер от 5 до 100 см с шагом 0,5 см.",
  },
  {
    question: "Как работает промокод FIRST10?",
    answer:
      "Скидка 10% на первый заказ от 990 ₽, но не более 1 500 ₽. Промокод действует до 31 декабря 2030 года, не суммируется с другими акциями и применяется один раз на почту. Сервер проверяет условия повторно при оформлении.",
  },
  {
    question: "Можно ли вернуть индивидуальный заказ?",
    answer:
      "Условия возврата зависят от статуса заказа и того, был ли изготовлен индивидуальный набор. Общие правила и ограничения описаны на странице «Доставка и возврат». Перед публикацией магазина документы должен проверить юрист.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="wrap py-16 sm:py-24" aria-labelledby="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <div className="lg:sticky lg:top-24">
            <SectionHeading
              eyebrow="Вопросы"
              title="Коротко о главном"
              description="Если ответа нет — напишите на почту. Поможем выбрать сюжет, размер и комплектацию."
            />
            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-espresso/15 px-5 py-2.5 text-xs font-semibold text-espresso transition-colors hover:border-espresso/35 hover:bg-milk"
            >
              Задать вопрос
            </a>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <Accordion type="single" collapsible className="border-t border-espresso/10">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
