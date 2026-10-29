import { z } from "zod";
import { DEFAULT_FRESHNESS, derivePriceState, type FreshnessConfig } from "@/modules/pricing";
import { canonicalJson, sha256Hex } from "@/modules/shared/domain/sha256";
import { parseSafeUrl } from "@/modules/shared/domain/safe-url";
import {
  AUDIO_TYPES,
  CATEGORIES,
  isFixtureId,
  mediaAssetSchema,
  OPTIONAL_ATTRIBUTES,
  offerSchema,
  productSchema,
  REQUIRED_ATTRIBUTES,
  sourceSchema,
  variantSchema,
  deriveVariantKey,
  type Category,
  type MediaAsset,
  type Offer,
  type Product,
  type Source,
  type Variant,
} from "./catalog-schema";

/**
 * The catalog as data (docs/CATALOG_SCHEMA.md): sources, products, variants, offers, media and a vocabulary of
 * display labels. `validateCatalog` is the single gate every record passes before it can be used: the build
 * fails on any error, and nothing invalid is ever "repaired". Two modes keep fiction and reality apart:
 * `real` rejects every fixture id and unverified product; `synthetic` accepts only `fx-` products.
 */

export const NUMERIC_ATTRIBUTES = ["screen_in", "ram_gb", "storage_gb"] as const;
export const SLUG_ATTRIBUTES = ["chip", "color", "type"] as const;
export const MAX_MEDIA_PER_PRODUCT = 6;
export const MAX_SOURCE_IMAGE_BYTES = 1_500_000;
const SLUG_VALUE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export const vocabularyEntrySchema = z.strictObject({
  labelVi: z.string().min(1).max(80),
  /** Single normalized words (lowercase ASCII, no spaces) that a search query may use for this value. */
  aliases: z.array(z.string().regex(/^[a-z0-9]+$/)).max(8),
});
export const vocabularySchema = z.record(
  z.string().regex(/^[a-z_]{1,40}$/),
  z.record(z.string().regex(/^[a-z0-9_]{1,60}$/), vocabularyEntrySchema),
);
export type Vocabulary = z.infer<typeof vocabularySchema>;

export interface CatalogData {
  readonly sources: readonly Source[];
  readonly products: readonly Product[];
  readonly variants: readonly Variant[];
  readonly offers: readonly Offer[];
  readonly media: readonly MediaAsset[];
  readonly vocabulary: Vocabulary;
  /** Product ids the owner chose to feature on the homepage, in order. Editorial choice, never computed. */
  readonly featured: readonly string[];
}

export const EMPTY_CATALOG: CatalogData = {
  sources: [],
  products: [],
  variants: [],
  offers: [],
  media: [],
  vocabulary: {},
  featured: [],
};

export type CatalogMode = "real" | "synthetic";

export type IssueCode =
  | "schema"
  | "duplicate_id"
  | "duplicate_variant_key"
  | "unknown_reference"
  | "unverified_product"
  | "fixture_id_in_real_catalog"
  | "real_id_in_synthetic_catalog"
  | "product_without_variants"
  | "missing_attribute"
  | "unknown_attribute"
  | "invalid_attribute"
  | "variant_key_mismatch"
  | "unsafe_url"
  | "url_not_cleaned"
  | "url_domain_mismatch"
  | "future_observation"
  | "price_without_provenance"
  | "user_entered_in_catalog"
  | "source_terms_not_reviewed"
  | "too_many_images"
  | "missing_label"
  | "ambiguous_alias"
  | "bad_featured"
  | "stale_price"
  | "source_policy_blocks_cart"
  | "product_without_price"
  | "product_without_image";

export interface CatalogIssue {
  readonly code: IssueCode;
  /** Collection and position, for example `offers[3].url`. */
  readonly path: string;
  readonly message: string;
}

export interface ValidatedCatalog extends CatalogData {
  readonly mode: CatalogMode;
  /** Content hash of the whole catalog: changes whenever any record changes. */
  readonly version: string;
}

export interface CatalogValidation {
  readonly ok: boolean;
  readonly errors: readonly CatalogIssue[];
  /** Advisory only: never fails the build. */
  readonly warnings: readonly CatalogIssue[];
  readonly catalog: ValidatedCatalog | null;
}

export interface ValidateOptions {
  readonly mode: CatalogMode;
  readonly nowMs: number;
  readonly freshness?: FreshnessConfig;
}

export function catalogVersion(data: CatalogData): string {
  return `cat-${sha256Hex(canonicalJson(data)).slice(0, 16)}`;
}

const hostOf = (url: string): string => new URL(url).hostname.toLowerCase();

export function validateCatalog(input: CatalogData, options: ValidateOptions): CatalogValidation {
  const errors: CatalogIssue[] = [];
  const warnings: CatalogIssue[] = [];
  const err = (code: IssueCode, path: string, message: string) =>
    errors.push({ code, path, message });
  const warn = (code: IssueCode, path: string, message: string) =>
    warnings.push({ code, path, message });
  const real = options.mode === "real";
  const freshness = options.freshness ?? DEFAULT_FRESHNESS;

  // 1. Every record must match its schema. Records that do not are reported and skipped by later checks.
  function parseAll<T>(name: string, schema: z.ZodType<T>, rows: readonly unknown[]): (T | null)[] {
    return rows.map((row, i) => {
      const parsed = schema.safeParse(row);
      if (parsed.success) return parsed.data;
      for (const issue of parsed.error.issues) {
        err(
          "schema",
          `${name}[${i}]${issue.path.length ? "." + issue.path.join(".") : ""}`,
          issue.message,
        );
      }
      return null;
    });
  }
  const sources = parseAll("sources", sourceSchema, input.sources);
  const products = parseAll("products", productSchema, input.products);
  const variants = parseAll("variants", variantSchema, input.variants);
  const offers = parseAll("offers", offerSchema, input.offers);
  const media = parseAll("media", mediaAssetSchema, input.media);
  const vocabulary = vocabularySchema.safeParse(input.vocabulary);
  if (!vocabulary.success) {
    for (const issue of vocabulary.error.issues)
      err("schema", `vocabulary.${issue.path.join(".")}`, issue.message);
  }

  // 2. Unique ids.
  const index = <T extends { id: string }>(name: string, rows: (T | null)[]) => {
    const map = new Map<string, T>();
    rows.forEach((row, i) => {
      if (!row) return;
      if (map.has(row.id))
        err("duplicate_id", `${name}[${i}].id`, `duplicate id "${row.id}" in ${name}`);
      else map.set(row.id, row);
    });
    return map;
  };
  const sourceById = index("sources", sources);
  const productById = index("products", products);
  const variantById = index("variants", variants);
  index("offers", offers);
  index("media", media);

  // 3. Fixture isolation: fiction can never be mistaken for the real catalog, or the reverse.
  const allIds: [string, string, string][] = [
    ...products.flatMap((p, i) =>
      p ? [["products", `products[${i}].id`, p.id] as [string, string, string]] : [],
    ),
    ...variants.flatMap((v, i) =>
      v ? [["variants", `variants[${i}].id`, v.id] as [string, string, string]] : [],
    ),
    ...offers.flatMap((o, i) =>
      o ? [["offers", `offers[${i}].id`, o.id] as [string, string, string]] : [],
    ),
    ...sources.flatMap((s, i) =>
      s ? [["sources", `sources[${i}].id`, s.id] as [string, string, string]] : [],
    ),
  ];
  for (const [, path, id] of allIds) {
    if (real && isFixtureId(id))
      err(
        "fixture_id_in_real_catalog",
        path,
        `"${id}" is reserved for synthetic fixtures and cannot ship in the real catalog`,
      );
    if (!real && !isFixtureId(id))
      err(
        "real_id_in_synthetic_catalog",
        path,
        `"${id}" must start with "fx-" in the synthetic catalog`,
      );
  }

  // 4. Products.
  const variantsByProduct = new Map<string, Variant[]>();
  products.forEach((product, i) => {
    if (!product) return;
    if (real && product.verificationStatus !== "verified") {
      err(
        "unverified_product",
        `products[${i}].verificationStatus`,
        `product "${product.id}" is not verified; only verified products ship`,
      );
    }
  });

  // 5. Variants.
  variants.forEach((variant, i) => {
    if (!variant) return;
    const path = `variants[${i}]`;
    const product = productById.get(variant.productId);
    if (!product) {
      err(
        "unknown_reference",
        `${path}.productId`,
        `variant "${variant.id}" refers to unknown product "${variant.productId}"`,
      );
      return;
    }
    const list = variantsByProduct.get(product.id) ?? [];
    list.push(variant);
    variantsByProduct.set(product.id, list);
    if (!variant.id.startsWith(`${product.id}:`)) {
      err(
        "invalid_attribute",
        `${path}.id`,
        `variant id "${variant.id}" must start with "${product.id}:"`,
      );
    }
    const category = product.category as Category;
    const required = REQUIRED_ATTRIBUTES[category];
    const allowed = new Set([...required, ...OPTIONAL_ATTRIBUTES[category]]);
    for (const key of required) {
      if (variant.attributes[key] === undefined)
        err(
          "missing_attribute",
          `${path}.attributes`,
          `variant "${variant.id}" is missing required attribute "${key}" for ${category}`,
        );
    }
    for (const [key, value] of Object.entries(variant.attributes)) {
      if (!allowed.has(key)) {
        err(
          "unknown_attribute",
          `${path}.attributes.${key}`,
          `"${key}" is not an attribute of ${category}`,
        );
        continue;
      }
      if ((NUMERIC_ATTRIBUTES as readonly string[]).includes(key)) {
        if (typeof value !== "number" || !(value > 0))
          err(
            "invalid_attribute",
            `${path}.attributes.${key}`,
            `"${key}" must be a positive number`,
          );
        else if (key !== "screen_in" && !Number.isInteger(value))
          err("invalid_attribute", `${path}.attributes.${key}`, `"${key}" must be a whole number`);
      } else if (typeof value !== "string" || !SLUG_VALUE.test(value)) {
        err(
          "invalid_attribute",
          `${path}.attributes.${key}`,
          `"${key}" must be a lowercase slug such as "natural_titanium"`,
        );
      } else if (key === "type" && !(AUDIO_TYPES as readonly string[]).includes(value)) {
        err(
          "invalid_attribute",
          `${path}.attributes.type`,
          `"type" must be one of ${AUDIO_TYPES.join(", ")}`,
        );
      }
    }
    const derived = deriveVariantKey(category, variant.attributes);
    if (variant.variantKey !== derived) {
      err(
        "variant_key_mismatch",
        `${path}.variantKey`,
        `variantKey "${variant.variantKey}" does not match its attributes (expected "${derived}")`,
      );
    }
  });

  const seenKeys = new Map<string, string>();
  variants.forEach((variant, i) => {
    if (!variant) return;
    const key = `${variant.productId}|${variant.variantKey}`;
    const first = seenKeys.get(key);
    if (first)
      err(
        "duplicate_variant_key",
        `variants[${i}].variantKey`,
        `variant "${variant.id}" duplicates "${first}" (same attributes)`,
      );
    else seenKeys.set(key, variant.id);
  });

  products.forEach((product, i) => {
    if (product && !variantsByProduct.has(product.id)) {
      err(
        "product_without_variants",
        `products[${i}]`,
        `product "${product.id}" has no variants and could never be selected`,
      );
    }
  });

  // 6. Offers: source, link, price provenance.
  const pricedVariants = new Set<string>();
  offers.forEach((offer, i) => {
    if (!offer) return;
    const path = `offers[${i}]`;
    const variant = variantById.get(offer.variantId);
    if (!variant)
      err(
        "unknown_reference",
        `${path}.variantId`,
        `offer "${offer.id}" refers to unknown variant "${offer.variantId}"`,
      );
    const source = sourceById.get(offer.sourceId);
    if (!source)
      err(
        "unknown_reference",
        `${path}.sourceId`,
        `offer "${offer.id}" refers to unknown source "${offer.sourceId}"`,
      );

    const url = parseSafeUrl(offer.url);
    if (!url.ok)
      err("unsafe_url", `${path}.url`, `offer link is not a safe http(s) URL (${url.reason})`);
    else {
      if (url.url !== offer.url)
        err(
          "url_not_cleaned",
          `${path}.url`,
          `offer link still carries tracking parameters; use "${url.url}"`,
        );
      if (source) {
        const host = hostOf(url.url);
        if (host !== source.domain && !host.endsWith(`.${source.domain}`)) {
          err(
            "url_domain_mismatch",
            `${path}.url`,
            `offer link host "${host}" is not on source "${source.id}" (${source.domain})`,
          );
        }
      }
    }

    if (offer.price) {
      if (offer.price.provenanceType === "user_entered")
        err(
          "user_entered_in_catalog",
          `${path}.price.provenanceType`,
          "user-entered prices belong to imported products, not the verified catalog",
        );
      if (
        real &&
        (!offer.price.observer || (!offer.price.evidenceUrl && !offer.price.evidenceNote))
      ) {
        err(
          "price_without_provenance",
          `${path}.price`,
          `price on "${offer.id}" needs an observer and an evidence URL or note`,
        );
      }
      if (offer.price.evidenceUrl !== undefined && !parseSafeUrl(offer.price.evidenceUrl).ok) {
        err(
          "unsafe_url",
          `${path}.price.evidenceUrl`,
          "price evidence link is not a safe http(s) URL",
        );
      }
      if (Date.parse(offer.price.observedAt) > options.nowMs) {
        err(
          "future_observation",
          `${path}.price.observedAt`,
          `price observed in the future (${offer.price.observedAt})`,
        );
      } else if (offer.price.provenanceType !== "user_entered") {
        const state = derivePriceState(offer.price, options.nowMs, freshness);
        if (state === "STALE" || state === "EXPIRED")
          warn(
            "stale_price",
            `${path}.price`,
            `price on "${offer.id}" is past its freshness period and needs a re-check`,
          );
      }
      if (offer.price.currency === "VND") pricedVariants.add(offer.variantId);
    }
    if (source) {
      if (
        source.persistencePolicy === "snapshot_allowed" &&
        real &&
        source.termsReviewedAt === null
      ) {
        err(
          "source_terms_not_reviewed",
          `${path}.sourceId`,
          `source "${source.id}" allows snapshots but its terms were never reviewed`,
        );
      }
      if (source.persistencePolicy !== "snapshot_allowed") {
        warn(
          "source_policy_blocks_cart",
          path,
          `offer "${offer.id}" is on a "${source.persistencePolicy}" source and cannot be added to the cart`,
        );
      }
    }
  });

  // 7. Media.
  const mediaPerProduct = new Map<string, number>();
  media.forEach((asset, i) => {
    if (!asset) return;
    const path = `media[${i}]`;
    const variant = asset.variantId ? variantById.get(asset.variantId) : undefined;
    const productId = asset.productId ?? variant?.productId;
    if (asset.productId && !productById.has(asset.productId))
      err(
        "unknown_reference",
        `${path}.productId`,
        `media "${asset.id}" refers to unknown product "${asset.productId}"`,
      );
    if (asset.variantId && !variant)
      err(
        "unknown_reference",
        `${path}.variantId`,
        `media "${asset.id}" refers to unknown variant "${asset.variantId}"`,
      );
    if (productId) mediaPerProduct.set(productId, (mediaPerProduct.get(productId) ?? 0) + 1);
  });
  for (const [productId, count] of mediaPerProduct) {
    if (count > MAX_MEDIA_PER_PRODUCT)
      err(
        "too_many_images",
        `media(${productId})`,
        `product "${productId}" has ${count} images; the budget is ${MAX_MEDIA_PER_PRODUCT}`,
      );
  }

  // 8. Vocabulary: Vietnamese labels for every coded value, unambiguous search aliases.
  const vocab = vocabulary.success ? vocabulary.data : {};
  const used = new Map<string, Set<string>>();
  for (const variant of variants) {
    if (!variant) continue;
    for (const key of SLUG_ATTRIBUTES) {
      const value = variant.attributes[key];
      if (typeof value === "string") used.set(key, (used.get(key) ?? new Set()).add(value));
    }
  }
  for (const [key, values] of used) {
    for (const value of values) {
      if (!vocab[key]?.[value])
        err(
          "missing_label",
          `vocabulary.${key}.${value}`,
          `no Vietnamese label for ${key} "${value}"`,
        );
    }
  }
  for (const [key, entries] of Object.entries(vocab)) {
    const owner = new Map<string, string>();
    for (const [value, entry] of Object.entries(entries)) {
      for (const alias of entry.aliases) {
        const previous = owner.get(alias);
        if (previous && previous !== value)
          err(
            "ambiguous_alias",
            `vocabulary.${key}.${value}.aliases`,
            `alias "${alias}" is used for both "${previous}" and "${value}"`,
          );
        owner.set(alias, value);
      }
    }
  }

  // 8b. Featured products must exist and be listed once.
  const featuredParsed = z.array(z.string()).max(12).safeParse(input.featured);
  if (!featuredParsed.success)
    err("bad_featured", "featured", "featured must be a list of at most 12 product ids");
  else {
    const seenFeatured = new Set<string>();
    featuredParsed.data.forEach((id, i) => {
      if (!productById.has(id))
        err("bad_featured", `featured[${i}]`, `featured product "${id}" does not exist`);
      if (seenFeatured.has(id))
        err("bad_featured", `featured[${i}]`, `featured product "${id}" is listed twice`);
      seenFeatured.add(id);
    });
  }

  // 9. Advisory: products a shopper could not price or see.
  products.forEach((product, i) => {
    if (!product) return;
    const vs = variantsByProduct.get(product.id) ?? [];
    if (vs.length > 0 && !vs.some((v) => pricedVariants.has(v.id)))
      warn(
        "product_without_price",
        `products[${i}]`,
        `product "${product.id}" has no verified VND price on any variant`,
      );
    if (!mediaPerProduct.has(product.id))
      warn(
        "product_without_image",
        `products[${i}]`,
        `product "${product.id}" has no image and will show the placeholder`,
      );
  });

  if (errors.length > 0) return { ok: false, errors, warnings, catalog: null };
  const data: CatalogData = {
    sources: sources as Source[],
    products: products as Product[],
    variants: variants as Variant[],
    offers: offers as Offer[],
    media: media as MediaAsset[],
    vocabulary: vocab,
    featured: featuredParsed.success ? featuredParsed.data : [],
  };
  return {
    ok: true,
    errors,
    warnings,
    catalog: { ...data, mode: options.mode, version: catalogVersion(data) },
  };
}

export interface ReadinessReport {
  readonly mode: CatalogMode;
  readonly products: number;
  readonly verifiedProducts: number;
  readonly variants: number;
  readonly pricedVariants: number;
  readonly offers: number;
  readonly clearedImages: number;
  readonly byCategory: Readonly<Record<Category, number>>;
  /** True only for a real catalog that meets the documented minimum for a first release. */
  readonly meetsMinimum: boolean;
  readonly shortfalls: readonly string[];
}

export const MINIMUM_PRODUCTS = 20;

/** Honest status of the catalog against the release gate (docs/CURATION_PROCESS.md). */
export function readinessReport(catalog: ValidatedCatalog): ReadinessReport {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const p of catalog.products) byCategory[p.category] += 1;
  const priced = new Set(
    catalog.offers.filter((o) => o.price?.currency === "VND").map((o) => o.variantId),
  );
  const shortfalls: string[] = [];
  if (catalog.mode === "synthetic") shortfalls.push("synthetic fixtures only: no real products");
  if (catalog.products.length < MINIMUM_PRODUCTS)
    shortfalls.push(`${catalog.products.length} of ${MINIMUM_PRODUCTS} minimum verified products`);
  for (const category of CATEGORIES)
    if (byCategory[category] === 0) shortfalls.push(`no ${category} products`);
  const cleared = catalog.media.filter((m) => m.rights.status === "CLEARED").length;
  return {
    mode: catalog.mode,
    products: catalog.products.length,
    verifiedProducts: catalog.products.filter((p) => p.verificationStatus === "verified").length,
    variants: catalog.variants.length,
    pricedVariants: catalog.variants.filter((v) => priced.has(v.id)).length,
    offers: catalog.offers.length,
    clearedImages: cleared,
    byCategory,
    meetsMinimum: catalog.mode === "real" && shortfalls.length === 0,
    shortfalls,
  };
}

/** Image files must exist and stay within the size budget (ARCHITECTURE §8). `files` maps repo path to bytes. */
export function checkMediaFiles(
  media: readonly MediaAsset[],
  files: Readonly<Record<string, number>>,
): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  media.forEach((asset, i) => {
    const size = files[asset.file.replace(/^\//, "")];
    if (size === undefined) {
      if (asset.rights.status === "CLEARED")
        issues.push({
          code: "unknown_reference",
          path: `media[${i}].file`,
          message: `image file "${asset.file}" does not exist`,
        });
    } else if (size > MAX_SOURCE_IMAGE_BYTES) {
      issues.push({
        code: "too_many_images",
        path: `media[${i}].file`,
        message: `image "${asset.file}" is ${size} bytes; the budget is ${MAX_SOURCE_IMAGE_BYTES}`,
      });
    }
  });
  return issues;
}

export interface CreditEntry {
  readonly mediaId: string;
  readonly productId: string | null;
  readonly creator: string | null;
  readonly licenseId: string | null;
  readonly licenseUrl: string | null;
  readonly sourcePageUrl: string | null;
  readonly attributionText: string;
}

/** Attribution required by image licenses, for the Credits page. Only CLEARED images are listed. */
export function extractCredits(media: readonly MediaAsset[]): CreditEntry[] {
  return media
    .filter((m) => m.rights.status === "CLEARED" && m.rights.attributionText)
    .map((m) => ({
      mediaId: m.id,
      productId: m.productId ?? null,
      creator: m.rights.creator ?? null,
      licenseId: m.rights.licenseId ?? null,
      licenseUrl: m.rights.licenseUrl ?? null,
      sourcePageUrl: m.rights.sourcePageUrl ?? null,
      attributionText: m.rights.attributionText!,
    }))
    .sort((a, b) => (a.mediaId < b.mediaId ? -1 : 1));
}
