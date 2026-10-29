import { describe, expect, it } from "vitest";
import { addLine, emptyCart, setQuantity, type Cart } from "@/modules/cart";
import type { OfferEvaluation, PriceObservation } from "@/modules/pricing";
import {
  formatOrderCode,
  ORDER_CODE_PATTERN,
  placeOrder,
  virtualOrderSchema,
  type PlaceOrderInput,
  type ResolvedLine,
} from "./order";
import { computeOrderState } from "./simulation";

const NOW = Date.parse("2026-11-30T00:00:00Z");
const OK: OfferEvaluation = { state: "OBSERVED", addable: true, reason: null };

const price = (over: Partial<PriceObservation> = {}): PriceObservation => ({
  amountMinor: 1_000_000,
  currency: "VND",
  observedAt: "2026-11-29T00:00:00Z",
  provenanceType: "curator_observed",
  ...over,
});
const resolved = (over: Partial<ResolvedLine> = {}): ResolvedLine => ({
  productId: "p1",
  brand: "Brand",
  titleVi: "Sản phẩm một",
  attributes: { color: "black" },
  merchantName: "Shop",
  sourceUrl: "https://example.com/p1",
  price: price(),
  sourcePolicy: "snapshot_allowed",
  imageRef: null,
  ...over,
});

function cartWith(...lines: [string, string, number, number?][]): Cart {
  let cart = emptyCart("key-00000000");
  lines.forEach(([variantId, offerId, quantity, amountMinor], i) => {
    const r = addLine(
      cart,
      {
        variantId,
        offerId,
        quantity,
        unitPrice: { amountMinor: amountMinor ?? 1_000_000, currency: "VND" },
      },
      OK,
      `key-${i + 1}0000000`,
    );
    if (!r.ok) throw new Error("setup failed");
    cart = r.cart;
  });
  return cart;
}

const input = (cart: Cart, over: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
  idempotencyKey: cart.checkoutKey,
  cart,
  resolveLine: () => resolved(),
  nowMs: NOW,
  scenario: "quick",
  destination: "dream_apartment",
  payment: "dream_credits",
  acknowledged: true,
  catalogVersion: "cat-abc123",
  orderId: "11111111-2222-4333-8444-555555555555",
  code: "DC-V-0123456789",
  ...over,
});

describe("formatOrderCode", () => {
  it("is DC-V- plus 10 Crockford base-32 characters, deterministic for given bytes", () => {
    const code = formatOrderCode(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 99]));
    expect(code).toBe("DC-V-0123456789");
    expect(ORDER_CODE_PATTERN.test(code)).toBe(true);
    expect(ORDER_CODE_PATTERN.test(formatOrderCode(new Uint8Array(10).fill(255)))).toBe(true);
  });
  it("never emits ambiguous letters (I, L, O, U) and needs enough randomness", () => {
    for (let b = 0; b < 256; b++)
      expect(formatOrderCode(new Uint8Array(10).fill(b))).not.toMatch(/[ILOU]/);
    expect(() => formatOrderCode(new Uint8Array(3))).toThrow(RangeError);
  });
});

describe("placeOrder: snapshot", () => {
  const cart = cartWith(["v1", "o1", 2], ["v2", "o2", 1, 500_000]);
  const resolver = (variantId: string) =>
    resolved(variantId === "v1" ? {} : { productId: "p2", price: price({ amountMinor: 500_000 }) });

  it("builds an immutable, virtual, schema-valid snapshot", () => {
    const result = placeOrder(input(cart, { resolveLine: resolver }), null);
    if (!result.ok) throw new Error(`unexpected ${result.error}`);
    expect(result.status).toBe("created");
    const { order } = result;
    expect(virtualOrderSchema.safeParse(order).success).toBe(true);
    expect(order).toMatchObject({
      virtual: true,
      acknowledgedSimulation: true,
      idempotencyKey: cart.checkoutKey,
      cartRevision: cart.revision,
      catalogVersion: "cat-abc123",
      total: { amountMinor: 2_500_000, currency: "VND" },
    });
    expect(
      order.items.map((i) => [
        i.variantId,
        i.quantity,
        i.priceStateAtPlacement,
        i.freshnessWarningShown,
      ]),
    ).toEqual([
      ["v1", 2, "OBSERVED", false],
      ["v2", 1, "OBSERVED", false],
    ]);
    expect(computeOrderState(order.simulation, NOW)).toBe("CONFIRMED");
    expect(order.simulation.scenario).toMatchObject({
      scenario: "quick",
      startedAtMs: NOW,
      durationSeconds: 180,
    });
  });

  it("does not alias the catalog objects it copied (a later catalog change cannot alter the order)", () => {
    const source = resolved({ attributes: { color: "black" }, price: price() });
    const result = placeOrder(
      input(cartWith(["v1", "o1", 1]), { resolveLine: () => source }),
      null,
    );
    if (!result.ok) throw new Error("setup failed");
    (source.attributes as Record<string, string>).color = "pink";
    (source.price as { amountMinor: number }).amountMinor = 1;
    expect(result.order.items[0]!.attributes).toEqual({ color: "black" });
    expect(result.order.items[0]!.price.amountMinor).toBe(1_000_000);
  });

  it("records a STALE price with the warning shown", () => {
    const stale = resolved({ price: price({ observedAt: "2026-10-01T00:00:00Z" }) });
    const result = placeOrder(input(cartWith(["v1", "o1", 1]), { resolveLine: () => stale }), null);
    if (!result.ok) throw new Error("setup failed");
    expect(result.order.items[0]).toMatchObject({
      priceStateAtPlacement: "STALE",
      freshnessWarningShown: true,
    });
  });
});

describe("placeOrder: idempotency", () => {
  const cart = cartWith(["v1", "o1", 1]);

  it("returns the existing order for the same key without building a new one", () => {
    const first = placeOrder(input(cart), null);
    if (!first.ok) throw new Error("setup failed");
    const replay = placeOrder(
      input(cart, { orderId: "99999999-9999-4999-8999-999999999999", code: "DC-V-ZZZZZZZZZZ" }),
      first.order,
    );
    expect(replay).toEqual({ ok: true, status: "existing", order: first.order });
  });

  it("replays even when the cart has since been emptied (a second tab after success)", () => {
    const first = placeOrder(input(cart), null);
    if (!first.ok) throw new Error("setup failed");
    const emptied = emptyCart("key-newnewnew");
    expect(
      placeOrder(input(emptied, { idempotencyKey: cart.checkoutKey }), first.order),
    ).toMatchObject({
      ok: true,
      status: "existing",
    });
  });

  it("rejects a stale tab: the key must be the cart's current checkout key", () => {
    const changed = setQuantity(cart, "v1|o1", 3, "key-changed00");
    if (!changed.ok) throw new Error("setup failed");
    expect(placeOrder(input(changed.cart, { idempotencyKey: cart.checkoutKey }), null)).toEqual({
      ok: false,
      error: "stale_cart",
    });
  });
});

describe("placeOrder: refusals (nothing is created)", () => {
  const cart = cartWith(["v1", "o1", 1]);
  const fails = (over: Partial<PlaceOrderInput>, c = cart) => {
    const r = placeOrder(input(c, over), null);
    if (r.ok) throw new Error("expected a refusal");
    return r;
  };

  it("requires the simulation acknowledgement", () => {
    expect(fails({ acknowledged: false })).toEqual({ ok: false, error: "not_acknowledged" });
  });
  it("refuses an empty cart", () => {
    const empty = emptyCart("key-empty0000");
    expect(fails({}, empty)).toMatchObject({
      error: "cart_not_checkoutable",
      status: "blocked:empty_cart",
    });
  });
  it("refuses a cart holding a non-VND line (no conversion)", () => {
    const usd = addLine(
      emptyCart("key-00000000"),
      {
        variantId: "v1",
        offerId: "o1",
        quantity: 1,
        unitPrice: { amountMinor: 1999, currency: "USD" },
      },
      OK,
      "key-usd00000",
    );
    if (!usd.ok) throw new Error("setup failed");
    expect(fails({}, usd.cart)).toMatchObject({
      error: "cart_not_checkoutable",
      status: "blocked:currency_not_supported",
    });
  });
  it("refuses an unresolvable line and reports it", () => {
    expect(fails({ resolveLine: () => null })).toEqual({
      ok: false,
      error: "line_unresolved",
      keys: ["v1|o1"],
    });
  });
  it("re-checks eligibility at placement (price removed, source now reference-only)", () => {
    expect(fails({ resolveLine: () => resolved({ price: null }) })).toMatchObject({
      error: "line_ineligible",
      reason: "no_price",
    });
    expect(
      fails({ resolveLine: () => resolved({ sourcePolicy: "reference_only" }) }),
    ).toMatchObject({
      error: "line_ineligible",
      reason: "source_reference_only",
    });
  });
  it("never silently updates a price that changed since it was added", () => {
    expect(
      fails({ resolveLine: () => resolved({ price: price({ amountMinor: 900_000 }) }) }),
    ).toEqual({
      ok: false,
      error: "price_changed",
      keys: ["v1|o1"],
    });
  });
  it("rejects an unknown scenario", () => {
    expect(fails({ scenario: "overnight" as never })).toEqual({
      ok: false,
      error: "invalid_scenario",
    });
  });
});

describe("virtualOrderSchema", () => {
  const good = (() => {
    const r = placeOrder(input(cartWith(["v1", "o1", 1])), null);
    if (!r.ok) throw new Error("setup failed");
    return r.order;
  })();

  it("round-trips and rejects anything that is not a virtual order", () => {
    expect(virtualOrderSchema.parse(good)).toEqual(good);
    expect(virtualOrderSchema.safeParse({ ...good, virtual: false }).success).toBe(false);
    expect(virtualOrderSchema.safeParse({ ...good, code: "ORDER-123" }).success).toBe(false);
    expect(virtualOrderSchema.safeParse({ ...good, items: [] }).success).toBe(false);
    expect(virtualOrderSchema.safeParse({ ...good, trackingNumber: "VN123" }).success).toBe(false);
    expect(virtualOrderSchema.safeParse({ ...good, destination: "123 Real Street" }).success).toBe(
      false,
    );
  });
});
