import Link from "next/link";
import { t } from "@/platform/i18n";
import { PageContainer } from "./page-container";

export function SiteFooter() {
  return (
    <footer className="mt-section border-t border-border bg-muted">
      <PageContainer className="flex flex-col gap-2 py-8 text-sm text-muted-foreground">
        <p>{t("footer.disclosure")}</p>
        <p>{t("footer.status")}</p>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2"
          >
            {t("simulation.learnMore")}
          </Link>
          <Link
            href="/design"
            className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2"
          >
            {t("footer.designSystem")}
          </Link>
        </p>
      </PageContainer>
    </footer>
  );
}
