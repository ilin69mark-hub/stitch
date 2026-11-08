import { Hero } from "@/components/sections/hero";
import { Ways } from "@/components/sections/ways";
import { Process } from "@/components/sections/process";
import { Catalog } from "@/components/sections/catalog";
import { Calculator } from "@/components/sections/calculator";
import { BoxesSection } from "@/components/sections/boxes";
import { CustomOrder } from "@/components/sections/custom-order";
import { Faq, faqItems } from "@/components/sections/faq";
import { categories, designs } from "@/config/catalog";
import { siteConfig } from "@/config/site";
import { calculateBasePrice, getDesignFromPrice } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/utils";

function structuredData() {
  const url = siteConfig.url.replace(/\/$/, "");
  const graph = [
    {
      "@type": "Organization",
      "@id": `${url}/#organization`,
      name: siteConfig.name,
      url,
      logo: absoluteUrl("/icon.svg"),
      email: siteConfig.email,
      description: siteConfig.shortDescription,
    },
    {
      "@type": "WebSite",
      "@id": `${url}/#website`,
      url,
      name: siteConfig.name,
      inLanguage: "ru-RU",
      publisher: { "@id": `${url}/#organization` },
    },
    {
      "@type": "ItemList",
      name: "Готовые дизайны для вышивания",
      numberOfItems: designs.length,
      itemListElement: designs.map((design, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: design.title,
          image: [absoluteUrl(design.image)],
          description: design.description,
          sku: design.id,
          category:
            categories.find((category) => category.id === design.categoryId)
              ?.title ?? "Вышивание",
          brand: { "@type": "Brand", name: siteConfig.name },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "RUB",
            lowPrice: getDesignFromPrice(design.id),
            highPrice: calculateBasePrice(30, 30),
            offerCount: design.availableSizes.length,
            availability: "https://schema.org/InStock",
            url: absoluteUrl("/#catalog"),
          },
        },
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replace(/</g, "\\u003c");
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData() }}
      />
      <Hero />
      <Ways />
      <Process />
      <Catalog />
      <Calculator />
      <BoxesSection />
      <CustomOrder />
      <Faq />
    </>
  );
}
