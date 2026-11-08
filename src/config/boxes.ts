import type { Box } from "@/types";

/**
 * Boxes have their own fixed prices and compositions. They are not calculated
 * from the square-centimetre rate: a box is a separate product with its own
 * economics.
 */
export const boxes: Box[] = [
  {
    id: "starter",
    title: "Стартовый набор",
    tagline: "Первый стежок без лишних покупок",
    image: "/images/lifestyle/pattern-hoop.webp",
    alt: "Пяльцы с нанесённой схемой, нитки и инструменты на деревянном столе",
    price: 1490,
    compareAtPrice: 1790,
    sizeLabel: "10 × 10 см",
    composition: [
      "Схема 10 × 10 см",
      "Канва Aida 14",
      "Нитки мулине по палитре",
      "Игла и инструкция",
      "Пяльцы 15 см",
    ],
    terms: "Демонстрационное предложение. Состав и цена настраиваются.",
    badge: "Для старта",
  },
  {
    id: "gift",
    title: "Подарочный бокс",
    tagline: "Подарок, который создают своими руками",
    image: "/images/lifestyle/gift-heart.webp",
    alt: "Вышитое сердце из ниток в пяльцах и катушки мулине",
    price: 3990,
    compareAtPrice: 4590,
    sizeLabel: "20 × 20 см",
    composition: [
      "Схема 20 × 20 см",
      "Канва и нитки мулине",
      "Пяльцы и игла",
      "Подарочная коробка",
      "Открытка для пожелания",
    ],
    terms: "Демонстрационное предложение. Состав и цена настраиваются.",
    badge: "В подарок",
  },
  {
    id: "large",
    title: "Большой творческий",
    tagline: "Много цвета, времени и удовольствия",
    image: "/images/lifestyle/threads.webp",
    alt: "Много разноцветных катушек мулине и нитки для вышивания",
    price: 6490,
    sizeLabel: "30 × 30 см",
    composition: [
      "Схема 30 × 30 см",
      "Канва и расширенная палитра ниток",
      "Пяльцы 20 см",
      "Ножницы и маркер по канве",
      "Органайзер для ниток",
    ],
    terms: "Демонстрационное предложение. Состав и цена настраиваются.",
    badge: "Максимум",
  },
  {
    id: "duo",
    title: "Бокс для двоих",
    tagline: "Два набора — один вечер",
    image: "/images/lifestyle/supplies.webp",
    alt: "Два вышивальных набора с пяльцами и мулине на льняной ткани",
    price: 4490,
    compareAtPrice: 4990,
    sizeLabel: "2 × 15 × 15 см",
    composition: [
      "Две схемы 15 × 15 см",
      "Две канвы и два набора ниток",
      "Две иглы",
      "Два комплекта пялец 15 см",
      "Общая подарочная упаковка",
    ],
    terms: "Демонстрационное предложение. Состав и цена настраиваются.",
    badge: "Вместе",
  },
];

export const boxById = new Map(boxes.map((box) => [box.id, box]));
