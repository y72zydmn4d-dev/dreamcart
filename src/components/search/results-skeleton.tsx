import { t } from "@/platform/i18n";

/** Loading state for result grids: reserves the final layout so nothing shifts. */
export function ResultsSkeleton({ count = 6 }: { readonly count?: number }) {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        {t("search.loading")}
      </p>
      <ul aria-hidden="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="aspect-4/3 animate-pulse bg-muted" />
            <div className="space-y-2 p-5">
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
