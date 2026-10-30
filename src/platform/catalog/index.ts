import {
  resolveActivation,
  activationSchema,
  type ActivationMode,
  readinessReport,
  validateCatalog,
  type CatalogIssue,
  type CatalogMode,
  type ReadinessReport,
  type ValidatedCatalog,
} from "@/modules/catalog";
import activationFile from "../../../data/catalog/activation.json";
import { REAL_RAW } from "./real";

export interface ActiveCatalog {
  readonly catalog: ValidatedCatalog;
  readonly mode: CatalogMode;
  readonly warnings: readonly CatalogIssue[];
  readonly readiness: ReadinessReport;
  /** Which activation mode is actually being served (see `resolveActivation`). */
  readonly activation: ActivationMode;
  /** Set when the configured activation mode was not honored, so a fallback is never silent. */
  readonly activationNote: string | null;
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
  activation: ActivationMode,
  activationNote: string | null,
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
    activation,
    activationNote,
  };
}

/**
 * The catalog the application serves, chosen by the explicit activation setting (`data/catalog/activation.json`),
 * never by data merely being present: merging verified records must not publish them, because production follows
 * `main`. Verified records in `data/catalog/` are always validated (an invalid one breaks the build) but are served
 * only under VERIFIED_REAL_CATALOG, which needs a recorded owner authorization. The staged Apple catalog is served
 * only under REAL_CATALOG_STAGING and never in production. A release build serves only the verified catalog and
 * refuses to start otherwise. An invalid catalog is an error, never silently replaced by fixtures.
 */
export async function loadActiveCatalog(nowMs: number): Promise<ActiveCatalog> {
  const parsed = activationSchema.safeParse(activationFile);
  if (!parsed.success) {
    throw new CatalogError(
      `data/catalog/activation.json is invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  const decision = resolveActivation(parsed.data, {
    release: RELEASE_BUILD,
    vercelEnv: process.env.VERCEL_ENV,
  });
  const real = validated("real", REAL_RAW, nowMs, "VERIFIED_REAL_CATALOG", null);

  if (decision.effective === "VERIFIED_REAL_CATALOG") {
    if (real.catalog.products.length === 0) {
      throw new CatalogError(
        "VERIFIED_REAL_CATALOG is active but data/catalog has no verified products (see docs/CATALOG_READINESS.md).",
      );
    }
    return real;
  }
  if (RELEASE_BUILD) {
    throw new CatalogError(
      "A release build needs the verified catalog: set VERIFIED_REAL_CATALOG in data/catalog/activation.json with an owner authorization (see docs/CATALOG_READINESS.md).",
    );
  }
  if (decision.effective === "REAL_CATALOG_STAGING") {
    const { STAGING_RAW } = await import("./staging");
    const staged = validated("real", STAGING_RAW, nowMs, "REAL_CATALOG_STAGING", null);
    if (staged.catalog.products.length > 0) return staged;
    const { SYNTHETIC_RAW } = await import("./synthetic");
    return validated(
      "synthetic",
      SYNTHETIC_RAW,
      nowMs,
      "SYNTHETIC_DEMO",
      "REAL_CATALOG_STAGING is configured but the staged catalog has no products yet",
    );
  }
  const { SYNTHETIC_RAW } = await import("./synthetic");
  return validated("synthetic", SYNTHETIC_RAW, nowMs, "SYNTHETIC_DEMO", decision.note);
}

export { REAL_RAW };
