import {
  deriveVariantKey,
  validateCatalog,
  type CatalogData,
  type Category,
  type MediaAsset,
  type Product,
} from "@/modules/catalog";

/**
 * Builders for FICTIONAL test catalogs ("Testmark", example.test). Nothing built here describes a real product
 * or store, and none of it is in a data directory: tests use it to prove rules, not any store's configurations.
 */
export const NOW = Date.parse("2026-10-30T00:00:00Z");
export const OBSERVED = "2026-10-20T00:00:00.000Z";

export type Attrs = Record<string, string | number>;

export const variant = (productId: string, category: Category, id: string, attributes: Attrs) => ({
  id: `${productId}:${id}`,
  productId,
  attributes,
  gtin: null,
  variantKey: deriveVariantKey(category, attributes),
});

export const product = (
  id: string,
  category: Category,
  family: string,
  model: string,
  extra: Partial<Product> = {},
): Product => ({
  id,
  brand: "Testmark",
  family,
  model,
  category,
  titleVi: `Testmark ${family} ${model}`,
  summaryVi: "Dữ liệu thử nghiệm, không phải sản phẩm thật.",
  verificationStatus: "verified",
  createdAt: OBSERVED,
  ...extra,
});

/** An offer carrying an exact VND price with full provenance, or no price at all (unknown, never zero). */
export const offer = (v: { id: string }, amountMinor: number | null) => ({
  id: `${v.id}@test-store`,
  variantId: v.id,
  sourceId: "test-store",
  url: `https://store.example.test/p/${v.id.replace(":", "/")}`,
  merchantName: "Test Store",
  availability: "unknown" as const,
  price:
    amountMinor === null
      ? null
      : {
          amountMinor,
          currency: "VND" as const,
          observedAt: OBSERVED,
          provenanceType: "curator_observed" as const,
          observer: "test-curator",
          evidenceNote: "test fixture, not a real observation",
        },
});

export const label = (labelVi: string) => ({ labelVi, aliases: [] as string[] });

export const source = {
  id: "test-store",
  name: "Test Store",
  domain: "store.example.test",
  kind: "retailer" as const,
  termsReviewedAt: "2026-10-01",
  persistencePolicy: "snapshot_allowed" as const,
};

export function catalog(
  products: Product[],
  variants: ReturnType<typeof variant>[],
  prices: (index: number) => number | null = (i) => 10_000_000 + i * 500_000,
  over: Partial<CatalogData> = {},
): CatalogData {
  return {
    sources: [source],
    products,
    variants,
    offers: variants.map((v, i) => offer(v, prices(i))),
    media: [] as MediaAsset[],
    vocabulary: {},
    featured: [],
    ...over,
  };
}

export const validate = (d: CatalogData) => validateCatalog(d, { mode: "real", nowMs: NOW });

/** Validate, and fail the test with the validator's messages if the catalog is not valid. */
export function mustValidate(d: CatalogData) {
  const result = validate(d);
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"));
  return result.catalog!;
}
