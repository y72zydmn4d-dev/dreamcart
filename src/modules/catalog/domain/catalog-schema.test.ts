import { describe, expect, it } from "vitest";
import {
  deriveVariantKey,
  isFixtureId,
  mediaAssetSchema,
  missingRequiredAttributes,
  offerSchema,
  productSchema,
  rendersAsProductImage,
  sourceSchema,
  variantSchema,
} from "./catalog-schema";

const product = {
  id: "acme-book-14",
  brand: "Acme",
  family: "Book",
  model: "14",
  category: "laptop",
  titleVi: "Acme Book 14",
  summaryVi: "Mô tả do người biên tập tự viết.",
  verificationStatus: "verified",
  createdAt: "2026-11-30T00:00:00Z",
};

describe("entity schemas", () => {
  it("accepts a well-formed product, variant, offer and source", () => {
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(
      variantSchema.safeParse({
        id: "acme-book-14:13-8-256",
        productId: product.id,
        attributes: { screen_in: 14 },
        gtin: null,
        variantKey: "k",
      }).success,
    ).toBe(true);
    expect(
      sourceSchema.safeParse({
        id: "shop-a",
        name: "Shop A",
        domain: "shop-a.example",
        kind: "retailer",
        termsReviewedAt: null,
        persistencePolicy: "unknown",
      }).success,
    ).toBe(true);
    expect(
      offerSchema.safeParse({
        id: "o1",
        variantId: "v1",
        sourceId: "shop-a",
        url: "https://shop-a.example/p",
        merchantName: "Shop A",
        availability: "unknown",
        price: null,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["uppercase id", { ...product, id: "Acme" }],
    ["unknown category", { ...product, category: "toaster" }],
    ["unknown key", { ...product, rating: 4.8 }],
    ["missing verification", { ...product, verificationStatus: undefined }],
  ])("rejects a product with %s", (_name, value) => {
    expect(productSchema.safeParse(value).success).toBe(false);
  });

  it("an offer may have a null price but never a zero price", () => {
    const base = {
      id: "o1",
      variantId: "v1",
      sourceId: "s",
      url: "https://s.example",
      merchantName: "S",
      availability: "unknown",
    };
    expect(offerSchema.safeParse({ ...base, price: null }).success).toBe(true);
    expect(
      offerSchema.safeParse({
        ...base,
        price: {
          amountMinor: 0,
          currency: "VND",
          observedAt: "2026-11-30T00:00:00Z",
          provenanceType: "curator_observed",
        },
      }).success,
    ).toBe(false);
  });
});

describe("media rights", () => {
  const asset = {
    id: "m1",
    productId: "p1",
    kind: "photo",
    file: "media/p1/front.avif",
    altVi: "Mặt trước",
    width: 800,
    height: 600,
    rights: { status: "CLEARED", basis: "written_permission", evidence: "docs/rights/p1.md" },
  };
  it("CLEARED requires a basis and evidence; only CLEARED renders as a product image", () => {
    expect(mediaAssetSchema.safeParse(asset).success).toBe(true);
    expect(mediaAssetSchema.safeParse({ ...asset, rights: { status: "CLEARED" } }).success).toBe(
      false,
    );
    const pending = mediaAssetSchema.parse({ ...asset, rights: { status: "PENDING" } });
    expect(rendersAsProductImage(pending)).toBe(false);
    expect(rendersAsProductImage(mediaAssetSchema.parse(asset))).toBe(true);
  });
  it("must target a product or variant, use a repository path and never hotlink", () => {
    expect(mediaAssetSchema.safeParse({ ...asset, productId: undefined }).success).toBe(false);
    expect(
      mediaAssetSchema.safeParse({ ...asset, file: "https://cdn.example.com/x.jpg" }).success,
    ).toBe(false);
    expect(mediaAssetSchema.safeParse({ ...asset, file: "../../etc/passwd" }).success).toBe(false);
  });
  it("brand art is own work", () => {
    expect(
      mediaAssetSchema.safeParse({
        ...asset,
        kind: "brand_art",
        rights: { status: "CLEARED", basis: "open_license", evidence: "x" },
      }).success,
    ).toBe(false);
    expect(
      mediaAssetSchema.safeParse({
        ...asset,
        kind: "brand_art",
        rights: { status: "CLEARED", basis: "own_work", evidence: "x" },
      }).success,
    ).toBe(true);
  });
});

describe("variant rules", () => {
  it("reports missing required attributes per category (nothing is defaulted)", () => {
    expect(missingRequiredAttributes("laptop", { screen_in: 13, chip: "x", ram_gb: 8 })).toEqual([
      "storage_gb",
    ]);
    expect(missingRequiredAttributes("phone", { storage_gb: 128, color: "black" })).toEqual([]);
    expect(missingRequiredAttributes("audio", { color: "black" })).toEqual(["type"]);
  });
  it("derives a deterministic variant key in group order", () => {
    const a = deriveVariantKey("laptop", { chip: "m", storage_gb: 256, ram_gb: 8, screen_in: 13 });
    const b = deriveVariantKey("laptop", { screen_in: 13, chip: "m", ram_gb: 8, storage_gb: 256 });
    expect(a).toBe(b);
    expect(a).toBe("screen_in=13;chip=m;ram_gb=8;storage_gb=256");
    expect(
      deriveVariantKey("laptop", {
        screen_in: 13,
        chip: "m",
        ram_gb: 8,
        storage_gb: 256,
        color: "silver",
      }),
    ).toContain(";color=silver");
  });
  it("flags reserved fixture ids", () => {
    expect(isFixtureId("fx-aero")).toBe(true);
    expect(isFixtureId("acme-book-14")).toBe(false);
  });
});
