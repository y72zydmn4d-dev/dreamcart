import { z } from "zod";

/**
 * Inventory manifest for a manufacturer-store catalog program (first source: Apple Store Vietnam).
 *
 * Discovery and verification are separate stages: a listing can be discovered without a verified price, a complete
 * configuration or a reusable image. Four statuses are tracked independently and are never merged into one
 * "completeness" figure: inventory (is the listing known), product verification, price, and image rights.
 * Nothing here is invented: a count of zero is reported as zero, and coverage stays "unknown" unless the manifest
 * carries an auditable basis for calling the enumeration complete.
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9_.:@-]{0,127}$/, "lowercase slug");

/** Program categories A to I of the Apple Store Vietnam catalog program (not the storefront's product categories). */
export const PROGRAM_CATEGORIES = [
  "mac",
  "display",
  "iphone",
  "ipad",
  "watch",
  "audio",
  "airtag_home",
  "accessory_apple",
  "accessory_third_party",
] as const;
export type ProgramCategory = (typeof PROGRAM_CATEGORIES)[number];

export const LISTING_STATUSES = ["currently_offered", "not_offered", "unknown"] as const;
/** discovered: seen, not yet checked. verified: identity and specifications traced to evidence. */
export const VERIFICATION_STATUSES = ["discovered", "verified", "blocked", "excluded"] as const;
export const PRICE_STATUSES = [
  "unverified",
  "exact",
  "starting_from",
  "unknown",
  "not_applicable",
] as const;
/** Inventory-level image coverage. Asset-level rights stay on `MediaAsset.rights` (CLEARED | PENDING | NOT_CLEARED). */
export const IMAGE_STATUSES = ["CLEARED", "PENDING_REVIEW", "RESTRICTED", "UNAVAILABLE"] as const;
export const IMPORT_STATUSES = ["not_imported", "staged", "published"] as const;

/** A listing URL on the manufacturer's own store host (no credentials, https only). */
const listingUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.username === "" && url.password === "";
    } catch {
      return false;
    }
  }, "an https URL without credentials");

export const inventoryListingSchema = z
  .strictObject({
    id: slug,
    manufacturer: z.string().min(1).max(80),
    /** The seller: Apple Store Vietnam, even for a third-party product. Never the manufacturer by assumption. */
    merchant: z.string().min(1).max(80),
    title: z.string().min(1).max(200),
    primaryCategory: z.enum(PROGRAM_CATEGORIES),
    secondaryCategories: z.array(z.enum(PROGRAM_CATEGORIES)).max(4).default([]),
    family: z.string().min(1).max(80),
    model: z.string().max(80).nullable(),
    /** Distinguishes sellable units, e.g. a single AirTag and a four-pack. */
    packageQuantity: z.number().int().min(1).max(1000).default(1),
    listingUrl,
    discoveryUrl: listingUrl,
    discoveredAt: z.iso.datetime(),
    region: z.literal("VN"),
    listingStatus: z.enum(LISTING_STATUSES),
    verificationStatus: z.enum(VERIFICATION_STATUSES),
    priceStatus: z.enum(PRICE_STATUSES),
    imageStatus: z.enum(IMAGE_STATUSES),
    importStatus: z.enum(IMPORT_STATUSES),
    lastVerifiedAt: z.iso.datetime().nullable(),
    /** Required when a listing is blocked or excluded: the evidence-backed reason. */
    dispositionReason: z.string().max(500).nullable(),
  })
  .superRefine((l, ctx) => {
    if (
      (l.verificationStatus === "blocked" || l.verificationStatus === "excluded") &&
      !l.dispositionReason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dispositionReason"],
        message: `a ${l.verificationStatus} listing needs a reason`,
      });
    }
    if (l.verificationStatus === "verified" && l.lastVerifiedAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["lastVerifiedAt"],
        message: "a verified listing records when it was verified",
      });
    }
    if (l.verificationStatus === "discovered" && l.importStatus !== "not_imported") {
      ctx.addIssue({
        code: "custom",
        path: ["importStatus"],
        message: "an unverified listing cannot be imported",
      });
    }
    if (
      l.importStatus === "published" &&
      l.imageStatus !== "CLEARED" &&
      l.imageStatus !== "UNAVAILABLE"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["importStatus"],
        message: "published records may use only cleared images or none (a placeholder)",
      });
    }
    if (l.priceStatus === "exact" && l.verificationStatus !== "verified") {
      ctx.addIssue({
        code: "custom",
        path: ["priceStatus"],
        message: "an exact price needs a verified listing",
      });
    }
  });
export type InventoryListing = z.infer<typeof inventoryListingSchema>;

export const COVERAGE_BASES = ["complete", "partial", "unknown"] as const;

export const inventoryManifestSchema = z.strictObject({
  source: z.strictObject({
    id: slug,
    name: z.string().min(1).max(120),
    region: z.literal("VN"),
    currency: z.literal("VND"),
  }),
  /**
   * How completely the store was enumerated. `complete` needs evidence (what was walked and when); without it the
   * coverage is `partial` or `unknown` and no completion percentage may be reported.
   */
  coverage: z
    .strictObject({
      basis: z.enum(COVERAGE_BASES),
      evidence: z.string().max(1000).nullable(),
      enumeratedAt: z.iso.datetime().nullable(),
    })
    .superRefine((c, ctx) => {
      if (c.basis === "complete" && (!c.evidence || !c.enumeratedAt)) {
        ctx.addIssue({
          code: "custom",
          path: ["evidence"],
          message: "complete coverage needs evidence and a timestamp",
        });
      }
    }),
  /** Category and subcategory pages walked during discovery, with the outcome. */
  pages: z
    .array(
      z.strictObject({
        url: listingUrl,
        category: z.enum(PROGRAM_CATEGORIES).nullable(),
        status: z.enum(["inspected", "inaccessible"]),
        note: z.string().max(300).nullable(),
      }),
    )
    .max(2000),
  listings: z.array(inventoryListingSchema).max(20000),
});
export type InventoryManifest = z.infer<typeof inventoryManifestSchema>;

/** Query and fragment never identify a product: strip them, lowercase the host, drop a trailing slash. */
export function normalizeListingUrl(value: string): string {
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
}

const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Identity of a sellable item independent of where it was discovered: the same product listed under several
 * categories, seasonal collections or recommendations collapses to one key. Package quantity is part of identity.
 */
export function canonicalKey(
  l: Pick<InventoryListing, "manufacturer" | "family" | "model" | "packageQuantity">,
): string {
  return [fold(l.manufacturer), fold(l.family), fold(l.model ?? ""), `x${l.packageQuantity}`].join(
    "|",
  );
}

export interface InventoryIssue {
  readonly code:
    | "schema"
    | "duplicate_id"
    | "duplicate_listing_url"
    | "duplicate_identity"
    | "category_mismatch";
  readonly path: string;
  readonly message: string;
}

export interface InventoryValidation {
  readonly ok: boolean;
  readonly errors: readonly InventoryIssue[];
  readonly manifest: InventoryManifest | null;
}

/** Schema plus the cross-record rules: unique ids, one record per listing URL, one per product identity. */
export function validateInventory(raw: unknown): InventoryValidation {
  const parsed = inventoryManifestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      manifest: null,
      errors: parsed.error.issues.map((i) => ({
        code: "schema" as const,
        path: i.path.join(".") || "(root)",
        message: i.message,
      })),
    };
  }
  const manifest = parsed.data;
  const errors: InventoryIssue[] = [];
  const ids = new Map<string, number>();
  const urls = new Map<string, number>();
  const identities = new Map<string, number>();
  manifest.listings.forEach((l, i) => {
    const at = `listings[${i}]`;
    const seenId = ids.get(l.id);
    if (seenId !== undefined)
      errors.push({
        code: "duplicate_id",
        path: `${at}.id`,
        message: `${l.id} repeats listings[${seenId}]`,
      });
    ids.set(l.id, i);

    const url = normalizeListingUrl(l.listingUrl);
    const seenUrl = urls.get(url);
    if (seenUrl !== undefined)
      errors.push({
        code: "duplicate_listing_url",
        path: `${at}.listingUrl`,
        message: `same listing as listings[${seenUrl}]; record one listing and add the extra category as secondary`,
      });
    urls.set(url, i);

    const identity = canonicalKey(l);
    const seenIdentity = identities.get(identity);
    if (seenIdentity !== undefined)
      errors.push({
        code: "duplicate_identity",
        path: at,
        message: `same product identity as listings[${seenIdentity}] (${identity})`,
      });
    identities.set(identity, i);

    if (l.secondaryCategories.includes(l.primaryCategory))
      errors.push({
        code: "category_mismatch",
        path: `${at}.secondaryCategories`,
        message: "the primary category is not repeated as a secondary one",
      });
  });
  return { ok: errors.length === 0, errors, manifest: errors.length === 0 ? manifest : null };
}

/** Counts the program reports. Each figure is independent; none is derived from another. */
export interface CoverageReport {
  readonly coverageBasis: (typeof COVERAGE_BASES)[number];
  readonly pagesDiscovered: number;
  readonly pagesInspected: number;
  readonly pagesInaccessible: number;
  readonly listingsDiscovered: number;
  readonly uniqueProducts: number;
  readonly verified: number;
  readonly blocked: number;
  readonly excluded: number;
  readonly priceExact: number;
  readonly priceStartingFrom: number;
  readonly priceUnknown: number;
  readonly priceUnverified: number;
  readonly imagesCleared: number;
  readonly imagesPending: number;
  readonly imagesRestricted: number;
  readonly imagesUnavailable: number;
  readonly staged: number;
  readonly published: number;
  readonly byCategory: Readonly<Record<ProgramCategory, number>>;
  /** Only present when the enumeration is attested complete; otherwise null (never a made-up percentage). */
  readonly verifiedShareOfDiscovered: number | null;
  readonly statement: string;
}

export function coverageReport(manifest: InventoryManifest): CoverageReport {
  const L = manifest.listings;
  const count = (predicate: (l: InventoryListing) => boolean) => L.filter(predicate).length;
  const byCategory = Object.fromEntries(
    PROGRAM_CATEGORIES.map((c) => [c, count((l) => l.primaryCategory === c)]),
  ) as Record<ProgramCategory, number>;
  const basis = manifest.coverage.basis;
  const unique = new Set(L.map((l) => canonicalKey(l))).size;
  const verified = count((l) => l.verificationStatus === "verified");
  const statement =
    basis === "complete"
      ? `Enumeration attested complete: ${manifest.coverage.evidence}`
      : basis === "partial"
        ? "Enumeration is PARTIAL: do not describe this as the complete store."
        : "Coverage is UNKNOWN: the store has not been enumerated on an auditable basis.";
  return {
    coverageBasis: basis,
    pagesDiscovered: manifest.pages.length,
    pagesInspected: manifest.pages.filter((p) => p.status === "inspected").length,
    pagesInaccessible: manifest.pages.filter((p) => p.status === "inaccessible").length,
    listingsDiscovered: L.length,
    uniqueProducts: unique,
    verified,
    blocked: count((l) => l.verificationStatus === "blocked"),
    excluded: count((l) => l.verificationStatus === "excluded"),
    priceExact: count((l) => l.priceStatus === "exact"),
    priceStartingFrom: count((l) => l.priceStatus === "starting_from"),
    priceUnknown: count((l) => l.priceStatus === "unknown"),
    priceUnverified: count((l) => l.priceStatus === "unverified"),
    imagesCleared: count((l) => l.imageStatus === "CLEARED"),
    imagesPending: count((l) => l.imageStatus === "PENDING_REVIEW"),
    imagesRestricted: count((l) => l.imageStatus === "RESTRICTED"),
    imagesUnavailable: count((l) => l.imageStatus === "UNAVAILABLE"),
    staged: count((l) => l.importStatus === "staged"),
    published: count((l) => l.importStatus === "published"),
    byCategory,
    verifiedShareOfDiscovered: basis === "complete" && L.length > 0 ? verified / L.length : null,
    statement,
  };
}

/**
 * Source compliance register: which acquisition methods may be used for a source, on what evidence. A method is
 * usable only when it is `permitted`; `unreviewed` blocks use until someone has read the terms and recorded them.
 * This repository records decisions and evidence; it does not paraphrase a site's terms from memory.
 */
export const ACQUISITION_METHODS = [
  "manual_reading_of_public_pages",
  "automated_page_collection",
  "documented_structured_feed",
  "owner_supplied_files",
  "image_rehosting",
  "image_hotlinking",
] as const;

export const complianceRegisterSchema = z.strictObject({
  source: slug,
  entries: z
    .array(
      z
        .strictObject({
          method: z.enum(ACQUISITION_METHODS),
          status: z.enum(["permitted", "restricted", "unreviewed"]),
          /** What was read (a URL and its date) or the project decision that settles it. Required unless unreviewed. */
          evidence: z.string().max(1000).nullable(),
          reviewedAt: z.iso.date().nullable(),
          reviewedBy: z.string().max(80).nullable(),
          note: z.string().max(500).nullable(),
        })
        .superRefine((e, ctx) => {
          if (e.status !== "unreviewed" && (!e.evidence || !e.reviewedAt)) {
            ctx.addIssue({
              code: "custom",
              path: ["evidence"],
              message: `${e.status} needs evidence and a review date`,
            });
          }
        }),
    )
    .max(20),
});
export type ComplianceRegister = z.infer<typeof complianceRegisterSchema>;

/** Whether a method may be used. Unknown or unreviewed methods are blocked. */
export function methodPermitted(
  register: ComplianceRegister,
  method: (typeof ACQUISITION_METHODS)[number],
): boolean {
  return register.entries.some((e) => e.method === method && e.status === "permitted");
}
