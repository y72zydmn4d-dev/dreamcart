import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { t, type DictionaryKey } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.about.title") };

const NOT_REAL: readonly DictionaryKey[] = [
  "pages.about.notReal.payment",
  "pages.about.notReal.order",
  "pages.about.notReal.delivery",
];
const REAL: readonly DictionaryKey[] = ["pages.about.real.products", "pages.about.real.prices"];

export default function AboutPage() {
  return (
    <PageContainer className="py-12 sm:py-16">
      <h1 className="text-headline font-semibold">{t("pages.about.title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("pages.about.lead")}</p>
      <p className="mt-4 max-w-2xl rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 text-sm text-muted-foreground">
        {t("pages.about.prototypeNote")}
      </p>

      <section aria-labelledby="not-real-heading" className="mt-10 max-w-2xl">
        <h2 id="not-real-heading" className="text-xl font-semibold">
          {t("pages.about.notRealHeading")}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {NOT_REAL.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="real-heading" className="mt-10 max-w-2xl">
        <h2 id="real-heading" className="text-xl font-semibold">
          {t("pages.about.realHeading")}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {REAL.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
