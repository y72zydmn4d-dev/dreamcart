import { loadActiveCatalog, type ActiveCatalog } from "./index";

export interface Storefront {
  readonly active: ActiveCatalog;
  /** When the catalog was loaded (build time for prerendered pages). Prices are re-evaluated in the browser. */
  readonly builtAtMs: number;
}

let cached: Promise<Storefront> | null = null;

/** One validated catalog per server process or build; an invalid real catalog fails the build here. */
export function getStorefront(): Promise<Storefront> {
  cached ??= (async () => {
    const builtAtMs = Date.now();
    return { active: await loadActiveCatalog(builtAtMs), builtAtMs };
  })();
  return cached;
}
