import { beforeAll, describe, expect, it } from "vitest";
import { assessLine, lineKey, type CartLine } from "@/modules/cart";
import { userOfferId, type UserProduct } from "@/modules/catalog";
import { buildCatalogView, type CatalogView } from "@/modules/discovery";
import { loadActiveCatalog } from "@/platform/catalog";
import { buildLineIndex, evaluateUserProduct, resolveLine, type LineIndex } from "./resolve-line";

const NOW = Date.parse("2026-10-29T12:00:00Z");
let view: CatalogView;
const indexWith = (users: readonly UserProduct[] = []): LineIndex =>
  buildLineIndex(view, users, NOW);

beforeAll(async () => {
  const active = await loadActiveCatalog(NOW);
  view = buildCatalogView(active.catalog, NOW);
});

/** A real offer from the synthetic catalog: any variant that has a cartable VND offer. */
function cartableLine(): CartLine {
  for (const product of view.products) {
    for (const variant of product.variants) {
      const offer = variant.offers.find((o) => o.evaluation.addable && o.offer.price);
      if (offer?.offer.price) {
        return {
          variantId: variant.variant.id,
          offerId: offer.offer.id,
          quantity: 1,
          unitPrice: {
            amountMinor: offer.offer.price.amountMinor,
            currency: offer.offer.price.currency,
          },
        };
      }
    }
  }
  throw new Error("the synthetic catalog has no cartable offer");
}

const user = (over: Partial<UserProduct> = {}): UserProduct => ({
  id: "user-abc",
  title: "Tai nghe thử",
  sourceUrl: "https://shop.example/p/1",
  attributes: { Màu: "Đen" },
  price: { amountMinor: 1_290_000, currency: "VND" },
  unverified: true,
  createdAtMs: NOW - 1000,
  ...over,
});

describe("resolveLine: catalog lines", () => {
  it("shows the product, its configuration, the merchant and the live offer", () => {
    const line = cartableLine();
    const r = resolveLine(line, indexWith());
    expect(r.origin).toBe("catalog");
    expect(r.title.length).toBeGreaterThan(0);
    expect(r.merchant.length).toBeGreaterThan(0);
    expect(r.productId).not.toBeNull();
    expect(r.sourceUrl).toMatch(/^https:\/\//);
    expect(assessLine(line, r.current)).toEqual({ kind: "ok" });
  });

  it("detects a price that moved since the line was added", () => {
    const line = cartableLine();
    const moved = {
      ...line,
      unitPrice: { ...line.unitPrice, amountMinor: line.unitPrice.amountMinor + 1 },
    };
    const status = assessLine(moved, resolveLine(moved, indexWith()).current);
    expect(status).toEqual({ kind: "price_changed", current: line.unitPrice });
  });

  it("an offer that is not in the catalog is unavailable, never guessed", () => {
    const line = { ...cartableLine(), offerId: "nope@nowhere" };
    const r = resolveLine(line, indexWith());
    expect(r.origin).toBe("unknown");
    expect(assessLine(line, r.current)).toEqual({ kind: "unavailable" });
    const gone = { ...line, variantId: "fx-nothing:1" };
    expect(assessLine(gone, resolveLine(gone, indexWith()).current)).toEqual({
      kind: "unavailable",
    });
  });
});

describe("resolveLine: imported items", () => {
  const lineFor = (u: UserProduct): CartLine => ({
    variantId: u.id,
    offerId: userOfferId(u.id),
    quantity: 2,
    unitPrice: u.price!,
  });

  it("resolves to the user's own entry, labeled as theirs, with the link they gave", () => {
    const u = user();
    const r = resolveLine(lineFor(u), indexWith([u]));
    expect(r).toMatchObject({
      origin: "user",
      title: "Tai nghe thử",
      details: "Màu: Đen",
      sourceUrl: "https://shop.example/p/1",
      priceState: "USER_ENTERED",
    });
    expect(assessLine(lineFor(u), r.current)).toEqual({ kind: "ok" });
  });

  it("a deleted item leaves an unavailable line, not a vanished one", () => {
    const u = user();
    const r = resolveLine(lineFor(u), indexWith([]));
    expect(r.origin).toBe("unknown");
    expect(assessLine(lineFor(u), r.current).kind).toBe("unavailable");
  });

  it("only the item's own offer id matches it", () => {
    const u = user();
    const line = { ...lineFor(u), offerId: "something-else@user" };
    expect(assessLine(line, resolveLine(line, indexWith([u])).current).kind).toBe("unavailable");
  });

  it("is cartable only with a VND price; other currencies and no price are explained", () => {
    expect(evaluateUserProduct(user())).toMatchObject({ addable: true, state: "USER_ENTERED" });
    expect(evaluateUserProduct(user({ price: null }))).toMatchObject({
      addable: false,
      reason: "no_price",
    });
    expect(
      evaluateUserProduct(user({ price: { amountMinor: 1999, currency: "USD" } })),
    ).toMatchObject({ addable: false, reason: "currency_not_supported" });
  });

  it("a changed user price (edited store) is a price change like any other", () => {
    const u = user();
    const line = { ...lineFor(u), unitPrice: { amountMinor: 1_000_000, currency: "VND" as const } };
    const status = assessLine(line, resolveLine(line, indexWith([u])).current);
    expect(status).toEqual({ kind: "price_changed", current: u.price });
    expect(lineKey(line)).toBe(`${u.id}|${userOfferId(u.id)}`);
  });
});
