import { readinessReport, validateCatalog, type CatalogData } from "../domain/catalog-data";
import { activationSchema } from "../domain/activation";
import {
  IMPORT_BASES,
  checkImportBasis,
  complianceRegisterSchema,
  coverageReport,
  imageBasisMethod,
  methodPermitted,
  reconcileInventory,
  validateInventory,
} from "../domain/inventory";

/**
 * The activation checklist (ADR-015): everything that must hold before staged records are shown or published.
 * Pure: it reads data it is given, so it can be run by the CLI, by CI and by tests alike. A check is `pass`, `fail`
 * (blocks activation) or `info` (reported, never blocks). Nothing here activates anything.
 */
export type PreflightTarget = "staging" | "verified";

export interface PreflightCheck {
  readonly id: string;
  readonly label: string;
  readonly status: "pass" | "fail" | "info";
  readonly details: readonly string[];
}

export interface PreflightInput {
  readonly activation: unknown;
  readonly staged: CatalogData;
  readonly manifest: unknown;
  readonly register: unknown;
  readonly nowMs: number;
  readonly target: PreflightTarget;
}

const MAX_DETAILS = 8;
const clip = (lines: readonly string[]): string[] =>
  lines.length <= MAX_DETAILS
    ? [...lines]
    : [...lines.slice(0, MAX_DETAILS), `… and ${lines.length - MAX_DETAILS} more`];

export function preflight(input: PreflightInput): PreflightCheck[] {
  const checks: PreflightCheck[] = [];
  const add = (
    id: string,
    label: string,
    status: PreflightCheck["status"],
    details: readonly string[] = [],
  ) => checks.push({ id, label, status, details: clip(details) });

  const activation = activationSchema.safeParse(input.activation);
  add(
    "activation",
    "activation setting is valid",
    activation.success ? "pass" : "fail",
    activation.success
      ? [`mode: ${activation.data.mode}`]
      : activation.error.issues.map((i) => i.message),
  );

  const validation = validateCatalog(input.staged, { mode: "real", nowMs: input.nowMs });
  add(
    "staged_valid",
    "staged records, references, source links, price provenance, compatibility and image rights validate",
    validation.ok ? "pass" : "fail",
    validation.errors.map((e) => `[${e.code}] ${e.path}: ${e.message}`),
  );
  const products = input.staged.products.length;
  add("staged_nonempty", "there are staged products to activate", products > 0 ? "pass" : "fail", [
    `${products} products, ${input.staged.variants.length} variants, ${input.staged.offers.length} offers`,
  ]);

  const register = complianceRegisterSchema.safeParse(input.register);
  if (!register.success) {
    add(
      "compliance",
      "compliance register is valid",
      "fail",
      register.error.issues.map((i) => i.message),
    );
  } else {
    const permitted = IMPORT_BASES.filter((b) => checkImportBasis(register.data, b).ok);
    add(
      "compliance",
      "an acquisition basis is permitted in the compliance register",
      products === 0 || permitted.length > 0 ? (permitted.length > 0 ? "pass" : "info") : "fail",
      permitted.length > 0
        ? [`permitted: ${permitted.join(", ")}`]
        : ["no basis is permitted: staged records have no recorded permission to exist"],
    );
    const unpermitted = input.staged.media
      .filter((m) => m.rights.status === "CLEARED" && m.rights.basis !== undefined)
      .filter((m) => !methodPermitted(register.data, imageBasisMethod(m.rights.basis!)))
      .map(
        (m) =>
          `${m.id}: basis "${m.rights.basis}" is not permitted in the register (${imageBasisMethod(m.rights.basis!)})`,
      );
    add(
      "image_rights",
      "every CLEARED image rests on a basis the register permits",
      unpermitted.length === 0 ? "pass" : "fail",
      unpermitted,
    );
  }

  const inventory = validateInventory(input.manifest);
  add(
    "inventory_valid",
    "inventory manifest is valid (no duplicates, statuses consistent)",
    inventory.ok ? "pass" : "fail",
    inventory.errors.map((e) => `[${e.code}] ${e.path}: ${e.message}`),
  );
  if (inventory.manifest) {
    const issues = reconcileInventory(inventory.manifest, input.staged);
    add(
      "inventory_reconciled",
      "inventory manifest and staged catalog agree",
      issues.length === 0 ? "pass" : "fail",
      issues.map((i) => `[${i.code}] ${i.message}`),
    );
    const r = coverageReport(inventory.manifest);
    add("coverage", "coverage (each figure independent)", "info", [
      r.statement,
      `listings ${r.listingsDiscovered}, unique ${r.uniqueProducts}, verified ${r.verified}, blocked ${r.blocked}, excluded ${r.excluded}`,
      `prices exact ${r.priceExact}, starting-from ${r.priceStartingFrom}, unknown ${r.priceUnknown}, unverified ${r.priceUnverified}`,
      `images cleared ${r.imagesCleared}, pending ${r.imagesPending}, restricted ${r.imagesRestricted}, unavailable ${r.imagesUnavailable}`,
      `staged ${r.staged}, published ${r.published}`,
    ]);
  }

  if (validation.catalog) {
    const gate = readinessReport(validation.catalog);
    add(
      "release_gate",
      "release gate (minimum verified products and category coverage)",
      input.target === "verified" ? (gate.meetsMinimum ? "pass" : "fail") : "info",
      gate.meetsMinimum ? ["meets the minimum"] : gate.shortfalls,
    );
  }
  if (input.target === "verified") {
    const ok = activation.success && activation.data.ownerAuthorization !== null;
    add(
      "owner_authorization",
      "owner authorization is recorded for publishing the verified catalog",
      ok ? "pass" : "fail",
      ok
        ? [activation.data!.ownerAuthorization!.reference]
        : [
            "set activation.json to VERIFIED_REAL_CATALOG with an ownerAuthorization (the owner's explicit approval)",
          ],
    );
  }
  add("production_safety", "production safety", "info", [
    "the staged catalog is never served in a production deployment, whatever the setting",
  ]);
  return checks;
}

export const preflightPassed = (checks: readonly PreflightCheck[]): boolean =>
  checks.every((c) => c.status !== "fail");
