import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/platform/i18n";

export default function Loading() {
  return (
    <PageContainer className="min-h-dvh py-12" aria-busy="true">
      <p role="status" className="sr-only">
        {t("a11y.loading")}
      </p>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-10 w-2/3 max-w-md animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-muted" />
        <div className="h-40 w-full max-w-2xl animate-pulse rounded-lg bg-muted" />
      </div>
    </PageContainer>
  );
}
