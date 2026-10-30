import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { getStorefront } from "@/platform/catalog/server";
import { t, type DictionaryKey } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.about.title") };

const OFFERS: readonly DictionaryKey[] = ["pages.about.offers.journey", "pages.about.offers.local"];
const NOT_REAL: readonly DictionaryKey[] = [
  "pages.about.notReal.payment",
  "pages.about.notReal.order",
  "pages.about.notReal.delivery",
];
const DEMO: readonly DictionaryKey[] = [
  "pages.about.demo.products",
  "pages.about.demo.prices",
  "pages.about.demo.sources",
];
const PLANNED: readonly DictionaryKey[] = ["pages.about.planned.catalog"];
const REAL: readonly DictionaryKey[] = ["pages.about.real.products", "pages.about.real.prices"];

/**
 * The page follows the catalog mode, so it never claims data it does not have: with the synthetic fixtures it
 * says they are fictional and that a verified catalog is planned; only a real catalog may say products are real.
 */
export default async function AboutPage() {
  const { active } = await getStorefront();
  const synthetic = active.mode === "synthetic";
  return (
    <PageContainer className="py-12 sm:py-16">
      <h1 className="text-headline font-semibold">{t("pages.about.title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("pages.about.lead")}</p>

      <Section id="offers" heading="pages.about.offersHeading" items={OFFERS} />
      <Section id="not-real" heading="pages.about.notRealHeading" items={NOT_REAL} />
      {synthetic ? (
        <>
          <Section id="demo" heading="pages.about.demoHeading" items={DEMO} />
          <Section id="planned" heading="pages.about.plannedHeading" items={PLANNED} />
        </>
      ) : (
        <Section id="real" heading="pages.about.realHeading" items={REAL} />
      )}
    </PageContainer>
  );
}

function Section({
  id,
  heading,
  items,
}: {
  readonly id: string;
  readonly heading: DictionaryKey;
  readonly items: readonly DictionaryKey[];
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-10 max-w-2xl">
      <h2 id={`${id}-heading`} className="text-xl font-semibold">
        {t(heading)}
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        {items.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </section>
  );
}
