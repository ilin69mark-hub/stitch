import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";
import { legalLinks, siteConfig } from "@/config/site";

export interface LegalSection {
  title: string;
  content: ReactNode;
}

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <article className="wrap py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-espresso"
        >
          <ArrowLeft className="size-3.5" />
          На главную
        </Link>

        <p className="eyebrow mt-8">Документы</p>
        <h1 className="mt-4 text-balance font-serif text-[2.6rem] leading-[1.02] tracking-[-0.025em] text-espresso sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/8 p-4 text-[11px] leading-relaxed text-espresso/75">
          <FileWarning className="mt-0.5 size-4 shrink-0 text-gold" />
          <div>
            <p className="font-semibold text-espresso">Шаблон документа</p>
            <p className="mt-1">{siteConfig.legalNotice}</p>
          </div>
        </div>

        <div className="mt-10 space-y-9">
          {sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`section-${index}`}>
              <h2
                id={`section-${index}`}
                className="font-serif text-2xl leading-tight text-espresso"
              >
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted-foreground [&_a]:text-terracotta [&_a]:underline-offset-2 [&_a:hover]:underline [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-espresso">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-espresso/10 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Другие документы
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs text-espresso/75 underline-offset-4 transition-colors hover:text-terracotta hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-[10px] leading-relaxed text-muted-foreground">
          Дата редакции шаблона: 27 октября 2026 года. Перед публикацией
          заполните реквизиты и проверьте текст у юриста.
        </p>
      </div>
    </article>
  );
}
