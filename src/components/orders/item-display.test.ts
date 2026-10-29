import { beforeAll, describe, expect, it } from "vitest";
import { buildCatalogView, type CatalogView } from "@/modules/discovery";
import type { OrderItemSnapshot } from "@/modules/orders";
import { loadActiveCatalog } from "@/platform/catalog";
import { describeItem, itemDetails, isUserItem } from "./item-display";

const NOW = Date.parse("2026-10-29T12:00:00Z");
let view: CatalogView;
beforeAll(async () => {
  view = buildCatalogView((await loadActiveCatalog(NOW)).catalog, NOW);
});

const item = (over: Partial<OrderItemSnapshot>): OrderItemSnapshot => ({
  productId: "fx-aero",
  variantId: "fx-aero:13-fx1-16-512",
  offerId: "fx-aero:13-fx1-16-512@fx-shop-a",
  brand: "Fixturia",
  titleVi: "Fixturia Aero",
  attributes: { storage_gb: 512, ram_gb: 16, chip: "fx1", screen_in: 13 },
  quantity: 1,
  merchantName: "Cửa hàng",
  sourceUrl: "https://shop.example/",
  price: {
    amountMinor: 1,
    currency: "VND",
    observedAt: "2026-10-20T00:00:00.000Z",
    provenanceType: "curator_observed",
  },
  priceStateAtPlacement: "OBSERVED",
  freshnessWarningShown: false,
  sourcePersistencePolicy: "snapshot_allowed",
  imageRef: null,
  ...over,
});

describe("order item display", () => {
  it("reads a catalog item in the catalog's words and in configurator order, whatever order it was stored in", () => {
    const text = describeItem(item({}), view);
    expect(text).toMatch(/^13 inch · .*FX1.* · 16 GB · 512 GB$/);
  });

  it("falls back to the stored values when the product has left the catalog", () => {
    expect(describeItem(item({ productId: "fx-gone" }), view)).toBe("512 · 16 · fx1 · 13");
  });

  it("shows an imported item exactly as the user wrote it", () => {
    const user = item({
      productId: "user-abc",
      attributes: { Màu: "Đen", "Bảo hành": "12 tháng" },
    });
    expect(isUserItem(user)).toBe(true);
    expect(itemDetails(user, view)).toBe("Màu: Đen · Bảo hành: 12 tháng");
  });

  it("is empty when there is nothing to say", () => {
    expect(itemDetails(item({ attributes: {} }), view)).toBe("");
  });
});
