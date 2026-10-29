"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CatalogMode, ValidatedCatalog } from "@/modules/catalog";
import { buildCatalogView, buildSearchVocabulary, type CatalogView } from "@/modules/discovery";
import type { SearchVocabulary } from "@/modules/search";

interface CatalogContextValue {
  readonly mode: CatalogMode;
  readonly synthetic: boolean;
  readonly view: CatalogView;
  readonly vocabulary: SearchVocabulary;
  readonly nowMs: number;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

const subscribeNever = () => () => undefined;
/** Whole minutes, so the snapshot is stable between renders. */
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

/**
 * Makes the validated catalog available to client components. Price states depend on the current time, so the
 * first render (and the server render) uses the build time, and the browser then switches to the real clock.
 */
export function CatalogProvider({
  catalog,
  mode,
  builtAtMs,
  children,
}: {
  readonly catalog: ValidatedCatalog;
  readonly mode: CatalogMode;
  readonly builtAtMs: number;
  readonly children: ReactNode;
}) {
  const nowMs = useSyncExternalStore(subscribeNever, currentMinute, () => builtAtMs);
  const value = useMemo<CatalogContextValue>(
    () => ({
      mode,
      synthetic: mode === "synthetic",
      view: buildCatalogView(catalog, nowMs),
      vocabulary: buildSearchVocabulary(catalog),
      nowMs,
    }),
    [catalog, mode, nowMs],
  );
  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog must be used inside <CatalogScope>");
  return value;
}
