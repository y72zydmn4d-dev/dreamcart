import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ResultsSkeleton } from "@/components/search/results-skeleton";
import { SearchExperience } from "@/components/search/search-experience";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.search.title") };

/** The page shell is prerendered; results render on the client from the URL (Suspense fallback = loading state). */
export default function SearchPage() {
  return (
    <PageContainer className="max-w-7xl">
      <Suspense
        fallback={
          <div className="py-10">
            <h1 className="text-headline font-semibold">{t("pages.search.title")}</h1>
            <div className="mt-8">
              <ResultsSkeleton />
            </div>
          </div>
        }
      >
        <SearchExperience />
      </Suspense>
    </PageContainer>
  );
}
