"use client";

import { PageContainer } from "@/components/layout/page-container";
import { ResultsError } from "@/components/search/search-states";

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer className="max-w-3xl py-16">
      <ResultsError onRetry={reset} />
    </PageContainer>
  );
}
