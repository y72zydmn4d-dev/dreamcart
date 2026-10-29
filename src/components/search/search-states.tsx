import { Button } from "@/components/ui/button";
import { t } from "@/platform/i18n";

/** Shown when a search or filter combination matches nothing (never a fallback to unrelated products). */
export function EmptyResults({
  onReset,
  tooBroad = false,
}: {
  readonly onReset: () => void;
  readonly tooBroad?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">
        {tooBroad ? t("search.tooBroad.title") : t("search.empty.title")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">
        {tooBroad ? t("search.tooBroad.body") : t("search.empty.body")}
      </p>
      <Button variant="outline" className="mt-5" onClick={onReset}>
        {t("search.empty.reset")}
      </Button>
    </div>
  );
}

export function ResultsError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-border bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">{t("search.error.title")}</h2>
      <p className="mt-2 text-muted-foreground">{t("search.error.body")}</p>
      <Button className="mt-5" onClick={onRetry}>
        {t("search.error.retry")}
      </Button>
    </div>
  );
}
