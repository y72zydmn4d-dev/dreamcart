import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { extractCredits } from "@/modules/catalog";
import { parseSafeUrl } from "@/modules/shared/domain/safe-url";
import { getStorefront } from "@/platform/catalog/server";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.credits.title") };

/** Attribution that image licenses require. Only CLEARED images with attribution text appear. */
export default async function CreditsPage() {
  const { active } = await getStorefront();
  const credits = extractCredits(active.catalog.media);
  const productTitle = new Map(active.catalog.products.map((p) => [p.id, p.titleVi]));
  return (
    <PageContainer className="py-12 sm:py-16">
      <h1 className="text-headline font-semibold">{t("pages.credits.title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("pages.credits.lead")}</p>
      {credits.length === 0 ? (
        <p className="mt-8 max-w-2xl rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 text-muted-foreground">
          {t("pages.credits.empty")}
        </p>
      ) : (
        <ul className="mt-8 flex max-w-2xl flex-col gap-4">
          {credits.map((c) => {
            const source = c.sourcePageUrl ? parseSafeUrl(c.sourcePageUrl) : null;
            const license = c.licenseUrl ? parseSafeUrl(c.licenseUrl) : null;
            return (
              <li key={c.mediaId} className="rounded-xl border border-border bg-surface p-4">
                {c.productId ? (
                  <p className="font-medium">{productTitle.get(c.productId) ?? c.productId}</p>
                ) : null}
                <p className="mt-1">{c.attributionText}</p>
                <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                  {c.licenseId ? (
                    license?.ok ? (
                      <a
                        href={license.url}
                        rel="noopener noreferrer nofollow"
                        className="underline underline-offset-2"
                      >
                        {t("pages.credits.license", { license: c.licenseId })}
                      </a>
                    ) : (
                      <span>{t("pages.credits.license", { license: c.licenseId })}</span>
                    )
                  ) : null}
                  {source?.ok ? (
                    <a
                      href={source.url}
                      rel="noopener noreferrer nofollow"
                      className="underline underline-offset-2"
                    >
                      {t("pages.credits.sourcePage")}
                    </a>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
