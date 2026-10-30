import { beforeAll, describe, expect, it } from "vitest";
import { assessLine, type CartLine } from "@/modules/cart";
import { buildCatalogView, type CatalogView } from "@/modules/discovery";
import {
  computeOrderState,
  placeOrder,
  virtualOrderSchema,
  type VirtualOrder,
} from "@/modules/orders";
import { buildLineIndex, resolveLine } from "@/components/cart/resolve-line";
import { orderLineResolver, renderableOrderImage } from "@/components/orders/order-lines";
import { loadActiveCatalog } from "@/platform/catalog";
import { NOW, catalog, mustValidate, product, variant } from "../support/fictional-catalog";

/**
 * Historical Fixturia orders must keep working when the active catalog changes (the Apple catalog program swaps
 * the catalog under existing browsers). An order is a self-contained snapshot: it must still parse, still show
 * what was bought and the price paid, and never be re-resolved against, or silently re-priced by, a new catalog.
 */

const PLACED_AT = Date.parse("2026-10-29T12:00:00Z");
let oldView: CatalogView;
let oldLine: CartLine;
let order: VirtualOrder;

/** The first cartable VND offer of the active (synthetic) catalog, as a cart line. */
function cartableLine(view: CatalogView): CartLine {
  for (const p of view.products)
    for (const v of p.variants) {
      const o = v.offers.find((x) => x.evaluation.addable && x.offer.price);
      if (o?.offer.price)
        return {
          variantId: v.variant.id,
          offerId: o.offer.id,
          quantity: 2,
          unitPrice: {
            amountMinor: o.offer.price.amountMinor,
            currency: o.offer.price.currency,
          },
        };
    }
  throw new Error("the synthetic catalog has no cartable offer");
}

/** A different catalog, as a staged real catalog would be: other products, other ids, no old image files. */
function newCatalog() {
  const v = [variant("tm-new", "tablet", "11-256", { screen_in: 11, storage_gb: 256 })];
  return mustValidate({
    ...catalog([product("tm-new", "tablet", "Tab", "T1")], v),
    vocabulary: {},
  });
}

beforeAll(async () => {
  oldView = buildCatalogView((await loadActiveCatalog(PLACED_AT)).catalog, PLACED_AT);
  oldLine = cartableLine(oldView);
  const cart = { lines: [oldLine], revision: 1, checkoutKey: "key-12345678" };
  const result = placeOrder(
    {
      idempotencyKey: cart.checkoutKey,
      cart,
      resolveLine: orderLineResolver(oldView, []),
      nowMs: PLACED_AT,
      scenario: "quick",
      destination: "dream_apartment",
      payment: "dream_credits",
      acknowledged: true,
      catalogVersion: "cat-fixturia",
      orderId: "order-legacy-01",
      code: "DC-V-0123456789",
    },
    null,
  );
  if (!result.ok) throw new Error(`could not place the fixture order: ${result.error}`);
  order = result.order;
});

describe("a historical order after the active catalog changes", () => {
  it("survives storage: it round-trips through JSON and still satisfies the order schema", () => {
    const restored = virtualOrderSchema.parse(JSON.parse(JSON.stringify(order)));
    expect(restored).toEqual(order);
  });

  it("keeps what was bought and the price paid, independent of any catalog", () => {
    const item = order.items[0]!;
    const paid = oldLine.unitPrice.amountMinor * oldLine.quantity;
    expect(order.total.amountMinor).toBe(paid);
    expect(item.price.amountMinor).toBe(oldLine.unitPrice.amountMinor);
    expect(item.titleVi.length).toBeGreaterThan(0);
    expect(order.catalogVersion).toBe("cat-fixturia");
    expect(order.virtual).toBe(true);
    expect(order.acknowledgedSimulation).toBe(true);
  });

  it("keeps simulating on its own clock: the state needs no catalog", () => {
    const later = PLACED_AT + 3 * 24 * 3600 * 1000;
    expect(computeOrderState(order.simulation, PLACED_AT)).toBe("CONFIRMED");
    expect(computeOrderState(order.simulation, later)).toBe("VIRTUALLY_DELIVERED");
  });

  it("is not re-resolved against the new catalog: the old offer is unknown there, so it cannot be re-bought", () => {
    const view = buildCatalogView(newCatalog(), NOW);
    const item = order.items[0]!;
    expect(orderLineResolver(view, [])(item.variantId, item.offerId)).toBeNull();
  });

  it("a cart line saved before the change becomes unavailable rather than guessed or re-priced", () => {
    const view = buildCatalogView(newCatalog(), NOW);
    const resolved = resolveLine(oldLine, buildLineIndex(view, [], NOW));
    expect(resolved.origin).toBe("unknown");
    expect(assessLine(oldLine, resolved.current)).toEqual({ kind: "unavailable" });
  });

  it("the stored image is shown only while the active catalog still clears that exact file", () => {
    const ref = order.items[0]!.imageRef;
    // A new catalog without that media: the order falls back to the placeholder, never to someone else's image.
    expect(renderableOrderImage(ref, newCatalog().media)).toBeNull();
    // A reference the order never had cleared is never rendered.
    expect(
      renderableOrderImage({ mediaId: "m", file: "media/x.jpg", rightsStatus: "PENDING" }, []),
    ).toBeNull();
  });

  it("an unrelated new catalog cannot change an existing order: placing again returns the same order", () => {
    const again = placeOrder(
      {
        idempotencyKey: order.idempotencyKey,
        cart: { lines: [oldLine], revision: 1, checkoutKey: order.idempotencyKey },
        resolveLine: orderLineResolver(buildCatalogView(newCatalog(), NOW), []),
        nowMs: NOW,
        scenario: "fast",
        destination: "dream_workspace",
        payment: "dream_credits",
        acknowledged: true,
        catalogVersion: "cat-new",
        orderId: "order-other-02",
        code: "DC-V-ABCDEFGHJK",
      },
      order,
    );
    expect(again).toMatchObject({ ok: true, status: "existing" });
    if (again.ok) expect(again.order).toBe(order);
  });
});
