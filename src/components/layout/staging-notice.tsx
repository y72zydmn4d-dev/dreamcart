import { Badge } from "@/components/ui/badge";
import { PageContainer } from "./page-container";
import { t } from "@/platform/i18n";

/** Shown on every page of a Preview that serves the staged (not yet published) real catalog. */
export function StagingNotice() {
  return (
    <div role="region" aria-label={t("staging.badge")} className="border-b border-border bg-muted">
      <PageContainer className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm text-muted-foreground">
        <Badge tone="fixture">{t("staging.badge")}</Badge>
        <span>{t("staging.notice")}</span>
      </PageContainer>
    </div>
  );
}
