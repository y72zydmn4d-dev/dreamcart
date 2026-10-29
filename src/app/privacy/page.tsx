import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { t, type DictionaryKey } from "@/platform/i18n";

export const metadata: Metadata = { title: t("privacy.title") };

const SECTIONS: readonly {
  readonly id: string;
  readonly heading: DictionaryKey;
  readonly items: readonly DictionaryKey[];
}[] = [
  {
    id: "stored",
    heading: "privacy.storedHeading",
    items: ["privacy.stored.data", "privacy.stored.marker"],
  },
  {
    id: "not",
    heading: "privacy.notHeading",
    items: [
      "privacy.not.account",
      "privacy.not.tracking",
      "privacy.not.thirdParty",
      "privacy.not.fetch",
      "privacy.not.payment",
    ],
  },
  { id: "host", heading: "privacy.hostHeading", items: ["privacy.host"] },
  {
    id: "control",
    heading: "privacy.controlHeading",
    items: ["privacy.control.export", "privacy.control.delete", "privacy.control.clear"],
  },
  { id: "limit", heading: "privacy.limitHeading", items: ["privacy.limit"] },
];

export default function PrivacyPage() {
  return (
    <PageContainer className="max-w-3xl py-12 sm:py-16">
      <h1 className="text-headline font-semibold">{t("privacy.title")}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{t("privacy.lead")}</p>
      {SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-heading`} className="mt-10">
          <h2 id={`${section.id}-heading`} className="text-xl font-semibold">
            {t(section.heading)}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {section.items.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>
      ))}
      <div className="mt-10">
        <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
          {t("privacy.settings")}
        </Link>
      </div>
    </PageContainer>
  );
}
