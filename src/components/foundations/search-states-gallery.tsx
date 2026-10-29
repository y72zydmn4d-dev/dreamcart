"use client";

import { EmptyResults, ResultsError } from "@/components/search/search-states";
import { ResultsSkeleton } from "@/components/search/results-skeleton";
import { t } from "@/platform/i18n";

/** The shared loading, empty and error states, shown side by side for design review. */
export function SearchStatesGallery() {
  const noop = () => undefined;
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 font-semibold">{t("design.stateLoading")}</h3>
        <ResultsSkeleton count={2} />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="mb-3 font-semibold">{t("design.stateEmpty")}</h3>
          <EmptyResults onReset={noop} />
        </div>
        <div>
          <h3 className="mb-3 font-semibold">{t("design.stateError")}</h3>
          <ResultsError onRetry={noop} />
        </div>
      </div>
    </div>
  );
}
