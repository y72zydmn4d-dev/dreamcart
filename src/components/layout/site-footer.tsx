import Link from "next/link";
import { t } from "@/platform/i18n";
import { PageContainer } from "./page-container";

export function SiteFooter({ synthetic }: { readonly synthetic: boolean }) {
  return (
    <footer className="mt-section border-t border-border bg-muted">
      <PageContainer className="flex flex-col gap-2 py-8 text-sm text-muted-foreground">
        <p>{t("footer.disclosure")}</p>
        <p>{t(synthetic ? "footer.statusSynthetic" : "footer.statusReal")}</p>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2"
          >
            {t("simulation.learnMore")}
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2"
          >
            {t("footer.privacy")}
          </Link>
          <Link
            href="/credits"
            className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2"
          >
            {t("footer.credits")}
          </Link>
          {process.env.NEXT_PUBLIC_DREAMCART_RELEASE === "1" ? null : (
            <Link
              href="/design"
              className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2"
            >
              {t("footer.designSystem")}
            </Link>
          )}
        </p>
      </PageContainer>
    </footer>
  );
}
