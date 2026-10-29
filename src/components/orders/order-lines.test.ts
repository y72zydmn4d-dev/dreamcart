import { beforeAll, describe, expect, it } from "vitest";
import type { MediaAsset, UserProduct } from "@/modules/catalog";
import { buildCatalogView, type CatalogView } from "@/modules/discovery";
import { placeOrder } from "@/modules/orders";
import { loadActiveCatalog } from "@/platform/catalog";
import { orderLineResolver, renderableOrderImage, USER_ITEM_BRAND } from "./order-lines";

const NOW = Date.parse("2026-10-29T12:00:00Z");
let view: CatalogView;
beforeAll(async () => {
  view = buildCatalogView((await loadActiveCatalog(NOW)).catalog, NOW);
});

const user: UserProduct = {
  id: "user-abc",
  title: "Tai nghe thử",
  sourceUrl: "https://shop.example/p/1",
  attributes: { Màu: "Đen" },
  price: { amountMinor: 1_290_000, currency: "VND" },
  unverified: true,
  createdAtMs: NOW - 1000,
};

describe("orderLineResolver", () => {
  it("resolves a catalog line from the live offer, including its source policy", () => {
    const product = view.products.find((p) =>
      p.variants.some((v) => v.offers.some((o) => o.evaluation.addable && o.offer.price)),
    )!;
    const variant = product.variants.find((v) => v.offers.some((o) => o.evaluation.addable))!;
    const offer = variant.offers.find((o) => o.evaluation.addable)!;
    const r = orderLineResolver(view, [])(variant.variant.id, offer.offer.id)!;
    expect(r.productId).toBe(product.product.id);
    expect(r.merchantName).toBe(offer.offer.merchantName);
    expect(r.price).toEqual(offer.offer.price);
    expect(r.sourcePolicy).toBe(offer.source.persistencePolicy);
    expect(r.attributes).toEqual(variant.variant.attributes);
  });

  it("resolves an imported item as the user's own claim, unverified and imageless", () => {
    const r = orderLineResolver(view, [user])(user.id, `${user.id}@user`)!;
    expect(r).toMatchObject({
      productId: user.id,
      brand: USER_ITEM_BRAND,
      sourcePolicy: "unknown",
      imageRef: null,
      price: { amountMinor: 1_290_000, currency: "VND", provenanceType: "user_entered" },
    });
  });

  it("refuses anything unknown instead of guessing", () => {
    const resolve = orderLineResolver(view, [user]);
    expect(resolve("fx-none:1", "fx-none:1@x")).toBeNull();
    expect(resolve(user.id, "other@user")).toBeNull();
    expect(orderLineResolver(view, [])(user.id, `${user.id}@user`)).toBeNull();
  });

  it("feeds the domain: a cart of imported items becomes an order snapshot", () => {
    const cart = {
      lines: [
        {
          variantId: user.id,
          offerId: `${user.id}@user`,
          quantity: 2,
          unitPrice: user.price!,
        },
      ],
      revision: 3,
      checkoutKey: "key-12345678",
    };
    const result = placeOrder(
      {
        idempotencyKey: cart.checkoutKey,
        cart,
        resolveLine: orderLineResolver(view, [user]),
        nowMs: NOW,
        scenario: "quick",
        destination: "dream_apartment",
        payment: "dream_credits",
        acknowledged: true,
        catalogVersion: "cat-test",
        orderId: "order-12345678",
        code: "DC-V-0123456789",
      },
      null,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.total.amountMinor).toBe(2_580_000);
      expect(result.order.items[0]).toMatchObject({
        priceStateAtPlacement: "USER_ENTERED",
        quantity: 2,
      });
    }
  });
});

describe("renderableOrderImage", () => {
  const asset = (over: Partial<MediaAsset["rights"]> = {}, file = "media/a.jpg"): MediaAsset => ({
    id: "m1",
    productId: "p1",
    kind: "photo",
    file,
    altVi: "Ảnh",
    width: 10,
    height: 10,
    rights: {
      status: "CLEARED",
      basis: "own_work",
      evidence: "ok",
      attributionText: "Nguồn X",
      ...over,
    },
  });
  const ref = { mediaId: "m1", file: "media/a.jpg", rightsStatus: "CLEARED" as const };

  it("shows the image only while the catalog still clears that exact file", () => {
    expect(renderableOrderImage(ref, [asset()])).toEqual({
      src: "/media/a.jpg",
      alt: "Ảnh",
      credit: "Nguồn X",
    });
  });

  it("falls back when rights were withdrawn, the file changed, the asset is gone or the ref was never cleared", () => {
    expect(renderableOrderImage(ref, [asset({ status: "NOT_CLEARED" })])).toBeNull();
    expect(renderableOrderImage(ref, [asset({}, "media/b.jpg")])).toBeNull();
    expect(renderableOrderImage(ref, [])).toBeNull();
    expect(renderableOrderImage({ ...ref, rightsStatus: "PENDING" }, [asset()])).toBeNull();
    expect(renderableOrderImage(null, [asset()])).toBeNull();
  });
});
