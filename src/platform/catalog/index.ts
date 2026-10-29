import {
  readinessReport,
  validateCatalog,
  type CatalogIssue,
  type CatalogMode,
  type ReadinessReport,
  type ValidatedCatalog,
} from "@/modules/catalog";
import { REAL_RAW } from "./real";

export interface ActiveCatalog {
  readonly catalog: ValidatedCatalog;
  readonly mode: CatalogMode;
  readonly warnings: readonly CatalogIssue[];
  readonly readiness: ReadinessReport;
}

export class CatalogError extends Error {
  readonly issues: readonly CatalogIssue[];
  constructor(message: string, issues: readonly CatalogIssue[] = []) {
    super(message);
    this.name = "CatalogError";
    this.issues = issues;
  }
}

/** Release builds contain no synthetic data: the flag is inlined at build time so the fixtures are dropped. */
const RELEASE_BUILD = process.env.NEXT_PUBLIC_DREAMCART_RELEASE === "1";

function validated(
  mode: CatalogMode,
  raw: Parameters<typeof validateCatalog>[0],
  nowMs: number,
): ActiveCatalog {
  const result = validateCatalog(raw, { mode, nowMs });
  if (!result.ok) {
    const first = result.errors
      .slice(0, 5)
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new CatalogError(
      `${mode} catalog is invalid (${result.errors.length} errors): ${first}`,
      result.errors,
    );
  }
  return {
    catalog: result.catalog!,
    mode,
    warnings: result.warnings,
    readiness: readinessReport(result.catalog!),
  };
}

/**
 * The catalog the application uses. A real catalog with at least one verified product always wins. Until one
 * exists, non-release builds fall back to the clearly labeled synthetic fixtures so the whole journey can be built
 * and tested; a release build refuses to start without real data. An invalid real catalog is an error, never
 * silently replaced by fixtures.
 */
export async function loadActiveCatalog(nowMs: number): Promise<ActiveCatalog> {
  const real = validated("real", REAL_RAW, nowMs);
  if (real.catalog.products.length > 0) return real;
  if (RELEASE_BUILD) {
    throw new CatalogError(
      "A release build needs a real catalog: data/catalog has no verified products (see docs/CATALOG_READINESS.md).",
    );
  }
  const { SYNTHETIC_RAW } = await import("./synthetic");
  return validated("synthetic", SYNTHETIC_RAW, nowMs);
}

export { REAL_RAW };
