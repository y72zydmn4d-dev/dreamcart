import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { OfferEvaluation } from "@/modules/pricing";
import {
  addLine,
  afterOrderPlaced,
  cartSchema,
  cartTotal,
  checkoutStatus,
  emptyCart,
  lineKey,
  MAX_QUANTITY,
  removeLine,
  setQuantity,
  subtotalsByCurrency,
  type Cart,
  type CartError,
  type CartLine,
} from "./cart";

const OK: OfferEvaluation = { state: "OBSERVED", addable: true, reason: null };
const money = (amountMinor: number, currency: "VND" | "USD" = "VND") => ({ amountMinor, currency });
const line = (
  variantId: string,
  offerId: string,
  quantity: number,
  amountMinor = 1_000_000,
  currency: "VND" | "USD" = "VND",
): CartLine => ({
  variantId,
  offerId,
  quantity,
  unitPrice: money(amountMinor, currency),
});

/** Fixtures C01–C12 (fixtures/pricing/cases.json) drive the cart through the real domain functions. */
interface FixtureOp {
  variantId: string;
  offerId: string;
  qty: number;
  amountMinor: number;
  currency: "VND" | "USD";
}
const { carts } = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/pricing/cases.json"), "utf8"),
) as {
  carts: {
    id: string;
    ops?: FixtureOp[];
    lines?: FixtureOp[];
    expected: Record<string, unknown>;
  }[];
};

function runFixture(ops: FixtureOp[]) {
  let cart = emptyCart("key-0000");
  let error: CartError | undefined;
  for (const [i, o] of ops.entries()) {
    const result = addLine(
      cart,
      line(o.variantId, o.offerId, o.qty, o.amountMinor, o.currency),
      OK,
      `key-${i + 1}000`,
    );
    if (!result.ok) {
      error = result.error;
      break;
    }
    cart = result.cart;
  }
  const lines = cart.lines.map((l) => ({ key: lineKey(l), qty: l.quantity }));
  if (error) return lines.length ? { error, lines } : { error };
  return { lines, subtotals: subtotalsByCurrency(cart), checkout: checkoutStatus(cart) };
}

describe("cart conformance (fixtures C01–C12)", () => {
  it.each(carts.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    expect(runFixture(c.ops ?? c.lines ?? [])).toEqual(c.expected);
  });
});

describe("cart mutations", () => {
  const base = emptyCart("key-0000");

  it("increments the revision and rotates the checkout key on every change", () => {
    const a = addLine(base, line("v1", "o1", 1), OK, "key-1111");
    expect(a.ok && a.cart).toMatchObject({ revision: 1, checkoutKey: "key-1111" });
    const b = a.ok ? setQuantity(a.cart, "v1|o1", 4, "key-2222") : a;
    expect(b.ok && b.cart).toMatchObject({ revision: 2, checkoutKey: "key-2222" });
    const c = b.ok ? removeLine(b.cart, "v1|o1", "key-3333") : b;
    expect(c.ok && c.cart).toMatchObject({ lines: [], revision: 3, checkoutKey: "key-3333" });
  });

  it("leaves the cart untouched (revision and key included) when a change is rejected", () => {
    const added = addLine(base, line("v1", "o1", 60), OK, "key-1111");
    if (!added.ok) throw new Error("setup failed");
    const rejected = addLine(added.cart, line("v1", "o1", 50), OK, "key-9999");
    expect(rejected).toMatchObject({ ok: false, error: "quantity_limit", cart: added.cart });
    expect(setQuantity(added.cart, "v1|o1", MAX_QUANTITY + 1, "k")).toMatchObject({
      ok: false,
      error: "quantity_limit",
    });
    expect(setQuantity(added.cart, "v1|o1", 0, "k")).toMatchObject({
      ok: false,
      error: "invalid_quantity",
    });
    expect(setQuantity(added.cart, "nope|nope", 2, "k")).toMatchObject({
      ok: false,
      error: "line_not_found",
    });
    expect(removeLine(added.cart, "nope|nope", "k")).toMatchObject({
      ok: false,
      error: "line_not_found",
    });
  });

  it("refuses an ineligible offer and reports why", () => {
    const blocked: OfferEvaluation = {
      state: "OBSERVED",
      addable: false,
      reason: "source_reference_only",
    };
    expect(addLine(base, line("v1", "o1", 1), blocked, "k")).toMatchObject({
      ok: false,
      error: "not_addable",
      reason: "source_reference_only",
    });
  });

  it("allows exactly 99 and rejects 100 in one add", () => {
    expect(addLine(base, line("v1", "o1", 99), OK, "k").ok).toBe(true);
    expect(addLine(base, line("v1", "o1", 100), OK, "k")).toMatchObject({
      ok: false,
      error: "quantity_limit",
    });
  });

  it("never reuses the finished order's checkout key and keeps counting revisions", () => {
    const added = addLine(base, line("v1", "o1", 2), OK, "key-1111");
    if (!added.ok) throw new Error("setup failed");
    const after = afterOrderPlaced(added.cart, "key-2222");
    expect(after).toEqual({ lines: [], revision: 2, checkoutKey: "key-2222" });
    expect(checkoutStatus(after)).toBe("blocked:empty_cart");
  });

  it("totals only the requested currency", () => {
    const added = addLine(base, line("v1", "o1", 3, 250_000), OK, "k");
    if (!added.ok) throw new Error("setup failed");
    expect(cartTotal(added.cart)).toEqual({ amountMinor: 750_000, currency: "VND" });
    expect(cartTotal(added.cart, "USD")).toBeNull();
  });

  it("fails loudly instead of overflowing the safe integer range", () => {
    const huge = addLine(base, line("v1", "o1", 99, Number.MAX_SAFE_INTEGER), OK, "k");
    if (!huge.ok) throw new Error("setup failed");
    expect(() => subtotalsByCurrency(huge.cart)).toThrow(RangeError);
  });
});

describe("cartSchema (boundary validation for stored carts)", () => {
  const valid: Cart = { lines: [line("v1", "o1", 2)], revision: 3, checkoutKey: "key-12345678" };
  it("accepts a valid cart and strips nothing it should keep", () => {
    expect(cartSchema.parse(valid)).toEqual(valid);
  });
  it.each([
    ["quantity 0", { ...valid, lines: [line("v1", "o1", 0)] }],
    ["quantity 100", { ...valid, lines: [line("v1", "o1", 100)] }],
    ["negative revision", { ...valid, revision: -1 }],
    ["short key", { ...valid, checkoutKey: "x" }],
    ["unknown field", { ...valid, coupon: "FREE" }],
    [
      "unknown currency",
      {
        ...valid,
        lines: [{ ...line("v1", "o1", 1), unitPrice: { amountMinor: 1, currency: "XXX" } }],
      },
    ],
  ])("rejects %s", (_name, value) => {
    expect(cartSchema.safeParse(value).success).toBe(false);
  });
});
