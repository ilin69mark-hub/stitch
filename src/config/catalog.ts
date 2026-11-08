import type { Category, Design, SizePresetId } from "@/types";

export const categories: Category[] = [
  {
    id: "animals",
    title: "Животные",
    short: "Питомцы и дикая природа",
    description:
      "Портреты животных, которые сохраняют характер модели в стежках.",
  },
  {
    id: "portraits",
    title: "Портреты",
    short: "Люди и эмоции",
    description:
      "Люди, улыбки и взгляды — изображения, которые особенно ценны в подарок.",
  },
  {
    id: "nature",
    title: "Природа",
    short: "Горы, лес, вода",
    description:
      "Пейзажи для спокойного вечера и медленного творчества.",
  },
  {
    id: "flowers",
    title: "Цветы",
    short: "Букеты и сады",
    description:
      "Цветочные мотивы, в которых палитра работает как отдельный герой.",
  },
  {
    id: "city",
    title: "Город",
    short: "Архитектура и ритм",
    description:
      "Городские сюжеты с геометрией, светом и узнаваемыми силуэтами.",
  },
  {
    id: "abstract",
    title: "Абстракция",
    short: "Цвет и форма",
    description:
      "Свободные композиции для тех, кто выбирает настроение, а не сюжет.",
  },
  {
    id: "gifts",
    title: "Подарки",
    short: "Тёплые поводы",
    description:
      "Небольшие сюжеты, которые приятно дарить и легко вписать в интерьер.",
  },
  {
    id: "kids",
    title: "Детские",
    short: "Яркие истории",
    description:
      "Детские образы и сюжеты, которые хочется рассматривать.",
  },
];

const allSizes: SizePresetId[] = ["5x5", "10x5", "10x10", "20x20", "30x30"];

export const designs: Design[] = [
  {
    id: "teply-vzglyad",
    slug: "teply-vzglyad",
    title: "Тёплый взгляд",
    categoryId: "animals",
    image: "/images/catalog/teply-vzglyad.webp",
    alt: "Вышитая картина с портретом чёрного мопса на жёлтом фоне",
    description:
      "Крупный портрет мопса: тёмная шерсть, внимательный взгляд и тёплый жёлтый фон. Хорошо читается даже в небольшом размере.",
    paletteSize: 14,
    featured: true,
    availableSizes: allSizes,
  },
  {
    id: "domashniy-uyut",
    slug: "domashniy-uyut",
    title: "Домашний уют",
    categoryId: "animals",
    image: "/images/catalog/domashniy-uyut.webp",
    alt: "Вышитая картина с полосатым котом, лежащим на светлом пледе",
    description:
      "Полосатый кот на мягком пледе — сюжет про дом, тишину и любимого питомца.",
    paletteSize: 16,
    featured: true,
    availableSizes: allSizes,
  },
  {
    id: "nad-oblakami",
    slug: "nad-oblakami",
    title: "Над облаками",
    categoryId: "nature",
    image: "/images/catalog/nad-oblakami.webp",
    alt: "Вышитый горный пейзаж над облаками в розовом свете",
    description:
      "Горная гряда над облачным морем. Мягкие переходы цвета делают работу медитативной.",
    paletteSize: 16,
    featured: true,
    availableSizes: allSizes,
  },
  {
    id: "lesnaya-tropa",
    slug: "lesnaya-tropa",
    title: "Лесная тропа",
    categoryId: "nature",
    image: "/images/catalog/lesnaya-tropa.webp",
    alt: "Вышитая картина с солнечной лесной тропой среди высоких деревьев",
    description:
      "Свет между стволами и тропа, уходящая вглубь леса. Спокойный сюжет с глубокой зелёной палитрой.",
    paletteSize: 14,
    availableSizes: allSizes,
  },
  {
    id: "podsolnuhi",
    slug: "podsolnuhi",
    title: "Подсолнухи",
    categoryId: "flowers",
    image: "/images/catalog/podsolnuhi.webp",
    alt: "Вышитая картина с крупными жёлтыми подсолнухами",
    description:
      "Плотный ковёр из подсолнухов. Тёплая палитра и крупные формы — удачный выбор для первого большого проекта.",
    paletteSize: 14,
    featured: true,
    availableSizes: allSizes,
  },
  {
    id: "solnechnyy-sad",
    slug: "solnechnyy-sad",
    title: "Солнечный сад",
    categoryId: "flowers",
    image: "/images/catalog/solnechnyy-sad.webp",
    alt: "Вышитая картина с жёлтыми цветами на фоне голубого неба",
    description:
      "Жёлтые цветы на фоне яркого неба. Небольшая работа, которая добавляет света в интерьер.",
    paletteSize: 14,
    availableSizes: allSizes,
  },
  {
    id: "gorodskoy-ritm",
    slug: "gorodskoy-ritm",
    title: "Городской ритм",
    categoryId: "city",
    image: "/images/catalog/gorodskoy-ritm.webp",
    alt: "Вышитая картина с улицей Нью-Йорка между небоскрёбами",
    description:
      "Проспект между небоскрёбами, жёлтые такси и перспектива улицы. Для любителей геометрии и города.",
    paletteSize: 14,
    featured: true,
    availableSizes: allSizes,
  },
  {
    id: "sobornaya-ploshchad",
    slug: "sobornaya-ploshchad",
    title: "Соборная площадь",
    categoryId: "city",
    image: "/images/catalog/sobornaya-ploshchad.webp",
    alt: "Вышитая картина с разноцветными куполами храма Василия Блаженного",
    description:
      "Узнаваемые купола и тёплый камень. Насыщенная палитра и много небольших деталей.",
    paletteSize: 18,
    availableSizes: allSizes,
  },
  {
    id: "ulybka",
    slug: "ulybka",
    title: "Улыбка",
    categoryId: "portraits",
    image: "/images/catalog/ulybka.webp",
    alt: "Вышитый портрет улыбающейся женщины в красном свитере",
    description:
      "Портрет с тёплой улыбкой и глубоким красным цветом. В размере 20 × 20 см и больше читается особенно выразительно.",
    paletteSize: 18,
    featured: true,
    availableSizes: allSizes,
  },
  {
    id: "v-kraskah",
    slug: "v-kraskah",
    title: "В красках",
    categoryId: "abstract",
    image: "/images/catalog/v-kraskah.webp",
    alt: "Абстрактная вышитая картина с яркими жёлтыми, красными и бирюзовыми мазками",
    description:
      "Абстрактная композиция с плотными цветовыми пятнами. Здесь важнее настроение, чем сюжет.",
    paletteSize: 18,
    availableSizes: allSizes,
  },
  {
    id: "prazdnik-krasok",
    slug: "prazdnik-krasok",
    title: "Праздник красок",
    categoryId: "kids",
    image: "/images/catalog/prazdnik-krasok.webp",
    alt: "Вышитая картина с ребёнком, перепачканным яркими красками",
    description:
      "Ребёнок, краски и лето. Яркий сюжет, который можно подарить или повесить в детской.",
    paletteSize: 18,
    availableSizes: allSizes,
  },
  {
    id: "rozovyy-vecher",
    slug: "rozovyy-vecher",
    title: "Розовый вечер",
    categoryId: "gifts",
    image: "/images/catalog/rozovyy-vecher.webp",
    alt: "Вышитая картина с одной розовой розой в стеклянной вазе",
    description:
      "Одна роза, длинная тень и приглушённый розовый свет. Лаконичный подарок к любому поводу.",
    paletteSize: 12,
    availableSizes: allSizes,
  },
];

export const categoryById = new Map(categories.map((category) => [category.id, category]));
export const designById = new Map(designs.map((design) => [design.id, design]));
export const designBySlug = new Map(designs.map((design) => [design.slug, design]));
