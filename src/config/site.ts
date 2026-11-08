export const siteConfig = {
  name: "Стежок",
  legalName: "Стежок — демонстрационный проект",
  tagline: "Вышивка по клеткам",
  description:
    "Наборы для вышивания по клеткам: готовые дизайны и картины по вашей фотографии. Выберите размер и комплектацию, рассчитайте стоимость и оформите заказ.",
  shortDescription:
    "Готовые схемы и вышивка по фото: наборы для творчества и подарков.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  locale: "ru_RU",
  email: "hello@stezhok.example",
  phone: null as string | null,
  address: null as string | null,
  social: null as { label: string; href: string } | null,
  demoNotice:
    "Демонстрационный магазин: цены, состав наборов и условия акций настраиваются в конфигурации проекта. Перед публикацией замените их на реальные.",
  legalNotice:
    "Шаблон документа. Перед публикацией заполните реквизиты продавца и проверьте текст у юриста.",
  legalEntity: {
    sellerName: "[УКАЖИТЕ НАИМЕНОВАНИЕ ПРОДАВЦА]",
    inn: "[УКАЖИТЕ ИНН]",
    ogrn: "[УКАЖИТЕ ОГРН / ОГРНИП]",
    address: "[УКАЖИТЕ ЮРИДИЧЕСКИЙ АДРЕС]",
    email: "[УКАЖИТЕ EMAIL ДЛЯ ОБРАЩЕНИЙ]",
    phone: "[УКАЖИТЕ ТЕЛЕФОН]",
  },
} as const;

export const navLinks = [
  { href: "/#catalog", label: "Каталог" },
  { href: "/#calculator", label: "Калькулятор" },
  { href: "/#boxes", label: "Боксы" },
  { href: "/#custom", label: "По фото" },
  { href: "/#faq", label: "Вопросы" },
] as const;

export const legalLinks = [
  { href: "/legal/privacy", label: "Политика обработки персональных данных" },
  { href: "/legal/consent", label: "Согласие на обработку данных" },
  { href: "/legal/terms", label: "Условия продажи и оплаты" },
  { href: "/legal/delivery", label: "Доставка и возврат" },
] as const;

/**
 * Commercial terms that the shop owner has to confirm before launch.
 * These values are intentionally conservative and do not promise anything
 * the demonstration shop cannot verify.
 */
export const commercialConfig = {
  deliveryMethods: [
    {
      id: "pickup",
      title: "Самовывоз",
      description:
        "Адрес и часы самовывоза подтвердит менеджер после оформления заказа.",
      price: 0,
    },
    {
      id: "delivery",
      title: "Доставка",
      description:
        "Стоимость и срок доставки рассчитываются индивидуально и подтверждаются менеджером.",
      price: 0,
    },
  ],
  deliveryCostNote:
    "Стоимость доставки не включена в сумму заказа и подтверждается отдельно.",
  productionNote:
    "Схему по фотографии готовит дизайнер. Мы свяжемся с вами после оплаты, чтобы согласовать кадрирование и детали. Мгновенная автоматическая генерация схемы не обещается.",
  paymentTestNotice:
    "Онлайн-оплата не подключена. Заказ сохранится со статусом «ожидает оплаты», деньги не списываются.",
  contactMethods: ["Email", "Телефон", "Telegram", "WhatsApp"],
} as const;
