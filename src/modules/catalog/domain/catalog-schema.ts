import { z } from "zod";
import { moneySchema } from "@/modules/shared/domain/money";
import { PERSISTENCE_POLICIES, priceObservationSchema } from "@/modules/pricing";

/**
 * Catalog entity schemas (docs/CATALOG_SCHEMA.md). Phase 5 builds the validated data pipeline on top of
 * these; here they are the typed contract. Nothing in them is invented: attributes are source-backed facts,
 * and an unknown price is `null`, never 0.
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9_.:@-]{0,127}$/, "lowercase slug");
const isoDate = z.iso.date();

/**
 * Storefront product categories. `laptop`, `desktop` and `display` cover computers and screens (Mac and Apple
 * displays in the Apple Store Vietnam program); each category has its own typed attributes below, and a category
 * never gets attributes that do not describe it (no RAM on a display).
 */
export const CATEGORIES = [
  "laptop",
  "desktop",
  "display",
  "tablet",
  "phone",
  "wearable",
  "audio",
  "smart_home",
  "accessory",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const sourceSchema = z.strictObject({
  id: slug,
  name: z.string().min(1).max(120),
  domain: z.string().regex(/^[a-z0-9.-]+$/, "lowercase host only"),
  kind: z.enum(["retailer", "manufacturer", "open_data", "owner_curated"]),
  termsReviewedAt: isoDate.nullable(),
  persistencePolicy: z.enum(PERSISTENCE_POLICIES),
  policyEvidence: z.string().max(1000).optional(),
});
export type Source = z.infer<typeof sourceSchema>;

/** Required attributes per category for a shipped variant (a variant missing one can never be matched). */
export const REQUIRED_ATTRIBUTES: Record<Category, readonly string[]> = {
  laptop: ["screen_in", "chip", "ram_gb", "storage_gb"],
  desktop: ["chip", "ram_gb", "storage_gb"],
  display: ["screen_in"],
  tablet: ["screen_in", "storage_gb"],
  phone: ["storage_gb", "color"],
  wearable: ["case_mm"],
  audio: ["type", "color"],
  smart_home: ["device_type"],
  accessory: ["accessory_type"],
};
/**
 * Optional attributes appear only when the source shows them. Core counts separate chip variants that share a chip
 * name; glass and stand are the purchase options of a display. Order matters: it is the variant-key order.
 */
export const OPTIONAL_ATTRIBUTES: Record<Category, readonly string[]> = {
  laptop: ["color", "cpu_cores", "gpu_cores"],
  desktop: ["screen_in", "color", "cpu_cores", "gpu_cores"],
  display: ["resolution", "glass", "stand", "color"],
  tablet: ["chip", "connectivity", "ram_gb", "color"],
  phone: ["chip"],
  // A watch is sold as an exact case-and-band combination: each listed variant is one orderable configuration.
  wearable: ["case_material", "connectivity", "color", "band_type", "band_size", "band_color"],
  audio: ["noise_control", "connector"],
  smart_home: ["color", "package_qty", "connectivity", "storage_gb"],
  // `fits_case_mm` is how a band says which cases it fits; broader fit lives on the product (`compatibleWith`).
  accessory: [
    "color",
    "size",
    "material",
    "connector",
    "length_cm",
    "power_w",
    "package_qty",
    "fits_case_mm",
  ],
};
export const AUDIO_TYPES = ["earbuds", "over_ear", "on_ear"] as const;

/** A repository media path: no scheme, no host, no `..`. Product images are self-hosted, never hotlinked. */
export const MEDIA_PATH_PATTERN = /^\/?[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/;
export const isMediaPath = (value: string): boolean =>
  value.length <= 512 && MEDIA_PATH_PATTERN.test(value) && !value.split("/").includes("..");

const attributeValue = z.union([z.string().min(1).max(80), z.number().finite()]);

/** A curated structured fact (battery life, weight…), recorded as data in the curator's own words, never pasted marketing text. */
export const factSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9_]{1,40}$/),
  labelVi: z.string().min(1).max(80),
  value: z.union([z.string().min(1).max(120), z.number().finite()]),
  unit: z.string().max(20).optional(),
});
export type Fact = z.infer<typeof factSchema>;

/**
 * What a product works with: the host device family (brand and family as the source names them), and optionally the
 * catalog product it refers to. Verified from the source, never inferred. Absent means "unknown", not "universal".
 */
export const compatibilitySchema = z.strictObject({
  brand: z.string().min(1).max(80),
  family: z.string().min(1).max(80),
  productId: slug.optional(),
});
export type Compatibility = z.infer<typeof compatibilitySchema>;

/**
 * Where a product's identity and specifications were checked: the page and a short note in the curator's own words.
 * A verified product in the real catalog must carry it (a claim marked verified without provenance is refused).
 */
export const specEvidenceSchema = z.strictObject({
  url: z.string().min(1).max(2048),
  note: z.string().min(1).max(500),
});
export type SpecEvidence = z.infer<typeof specEvidenceSchema>;

export const productSchema = z.strictObject({
  id: slug,
  brand: z.string().min(1).max(80),
  family: z.string().min(1).max(80),
  model: z.string().max(80),
  category: z.enum(CATEGORIES),
  titleVi: z.string().min(1).max(200),
  summaryVi: z.string().max(1000),
  verificationStatus: z.enum(["verified", "needs_review"]),
  createdAt: z.iso.datetime(),
  facts: z.array(factSchema).max(40).optional(),
  compatibleWith: z.array(compatibilitySchema).max(40).optional(),
  specEvidence: specEvidenceSchema.optional(),
});
export type Product = z.infer<typeof productSchema>;

export const variantSchema = z.strictObject({
  id: slug,
  productId: slug,
  attributes: z.record(z.string().max(40), attributeValue),
  gtin: z
    .string()
    .regex(/^\d{8,14}$/)
    .nullable(),
  variantKey: z.string().min(1).max(200),
});
export type Variant = z.infer<typeof variantSchema>;

export const offerSchema = z.strictObject({
  id: slug,
  variantId: slug,
  sourceId: slug,
  url: z.string().min(1).max(2048),
  merchantName: z.string().min(1).max(120),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]),
  price: priceObservationSchema.nullable(),
});
export type Offer = z.infer<typeof offerSchema>;

export const mediaAssetSchema = z
  .strictObject({
    id: slug,
    productId: slug.optional(),
    variantId: slug.optional(),
    kind: z.enum(["photo", "official_render", "brand_art", "placeholder"]),
    file: z
      .string()
      .regex(/^\/?[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/, "repository media path")
      .max(512),
    altVi: z.string().min(1).max(300),
    width: z.number().int().min(1),
    height: z.number().int().min(1),
    rights: z.strictObject({
      status: z.enum(["CLEARED", "PENDING", "NOT_CLEARED"]),
      basis: z
        .enum(["open_license", "written_permission", "published_terms", "own_work"])
        .optional(),
      licenseId: z.string().max(80).optional(),
      licenseUrl: z.string().max(2048).optional(),
      sourcePageUrl: z.string().max(2048).optional(),
      creator: z.string().max(200).optional(),
      attributionText: z.string().max(500).optional(),
      evidence: z.string().max(2048).optional(),
      restrictions: z.string().max(500).optional(),
      reviewedBy: z.string().max(80).optional(),
      reviewedAt: isoDate.optional(),
      expiresAt: isoDate.optional(),
    }),
  })
  .superRefine((m, ctx) => {
    if (!m.productId && !m.variantId) {
      ctx.addIssue({
        code: "custom",
        message: "a media asset targets a product or a variant",
        path: ["productId"],
      });
    }
    if (m.rights.status === "CLEARED") {
      if (!m.rights.basis)
        ctx.addIssue({
          code: "custom",
          message: "CLEARED requires a basis",
          path: ["rights", "basis"],
        });
      if (!m.rights.evidence)
        ctx.addIssue({
          code: "custom",
          message: "CLEARED requires evidence",
          path: ["rights", "evidence"],
        });
    }
    if (m.kind === "brand_art" && m.rights.basis !== undefined && m.rights.basis !== "own_work") {
      ctx.addIssue({ code: "custom", message: "brand_art is own_work", path: ["rights", "basis"] });
    }
  });
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

/** Only a CLEARED asset may render as a product image; anything else shows the placeholder (ADR-010). */
export const rendersAsProductImage = (m: Pick<MediaAsset, "rights">): boolean =>
  m.rights.status === "CLEARED";

/** Ids beginning `fx-` are reserved for synthetic fixtures; a production build must reject them. */
export const isFixtureId = (id: string): boolean => id.startsWith("fx-");

/** Missing required attributes for a category (empty when the variant is complete). */
export function missingRequiredAttributes(
  category: Category,
  attributes: Readonly<Record<string, unknown>>,
): string[] {
  return REQUIRED_ATTRIBUTES[category].filter((key) => attributes[key] === undefined);
}

/**
 * Deterministic key for a variant within a product: attribute values in the category's group order.
 * Two variants of one product with the same key are duplicates.
 */
export function deriveVariantKey(
  category: Category,
  attributes: Readonly<Record<string, unknown>>,
): string {
  const order = [...REQUIRED_ATTRIBUTES[category], ...OPTIONAL_ATTRIBUTES[category]];
  return order
    .filter((key) => attributes[key] !== undefined)
    .map((key) => `${key}=${String(attributes[key])}`)
    .join(";");
}

/**
 * A product the user entered by hand from a link (Phase 7). It is never part of the verified catalog:
 * `unverified` is always true, the price is the user's own claim (or null), and the link is re-validated
 * as a SafeUrl wherever it is shown.
 */
export const userProductSchema = z.strictObject({
  id: z.string().regex(/^user-[a-z0-9-]{1,100}$/),
  title: z.string().min(1).max(200),
  sourceUrl: z.string().min(1).max(2048),
  attributes: z.record(z.string().max(40), attributeValue),
  price: moneySchema.nullable(),
  unverified: z.literal(true),
  createdAtMs: z.number().int().safe().min(0),
});
export type UserProduct = z.infer<typeof userProductSchema>;
