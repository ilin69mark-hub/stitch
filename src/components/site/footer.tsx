import Link from "next/link";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks, legalLinks, siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-espresso text-milk">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 18px, rgba(252,248,241,0.6) 18px 19px), repeating-linear-gradient(-45deg, transparent 0 18px, rgba(252,248,241,0.6) 18px 19px)",
        }}
        aria-hidden="true"
      />
      <div className="wrap relative py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-milk/65">
              Готовые схемы и вышивка по фотографии. Помогаем превратить
              изображение в вещь, которую хочется хранить.
            </p>
            <p className="mt-5 inline-flex items-start gap-2 rounded-xl border border-milk/12 bg-milk/5 p-3 text-[11px] leading-relaxed text-milk/55">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              {siteConfig.demoNotice}
            </p>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-milk/40">
              Магазин
            </p>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-milk/75 transition-colors hover:text-milk"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-milk/40">
              Документы
            </p>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-milk/75 transition-colors hover:text-milk"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-milk/40">
              Связаться
            </p>
            <a
              href={`mailto:${siteConfig.email}`}
              className="inline-flex items-center gap-2 text-sm text-milk/80 transition-colors hover:text-milk"
            >
              <Mail className="size-3.5" />
              {siteConfig.email}
            </a>
            <p className="mt-4 max-w-[230px] text-[11px] leading-relaxed text-milk/45">
              Отвечаем на вопросы о размерах, комплектации и индивидуальных
              заказах. Реквизиты продавца — в документах.
            </p>
            <Link
              href="/#custom"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-milk/85 underline-offset-4 hover:underline"
            >
              Обсудить свою картину
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-milk/12 pt-6 text-[11px] text-milk/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {process.env.NEXT_PUBLIC_COPYRIGHT_YEAR ?? "2026"}{" "}
            {siteConfig.name}. Демонстрационный
            проект.
          </p>
          <p className="max-w-xl leading-relaxed">
            {siteConfig.legalNotice}
          </p>
        </div>
      </div>
    </footer>
  );
}
