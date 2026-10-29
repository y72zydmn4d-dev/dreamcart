import { describe, expect, it } from "vitest";
import type { OfferEvaluation } from "@/modules/pricing";
import { acceptPrices, emptyCart, lineKey, type Cart, type CartLine } from "./cart";
import { assessLine } from "./line-status";

const OK: OfferEvaluation = { state: "OBSERVED", addable: true, reason: null };
const line: CartLine = {
  variantId: "p:a",
  offerId: "p:a@s",
  quantity: 2,
  unitPrice: { amountMinor: 1_000_000, currency: "VND" },
};

describe("assessLine", () => {
  it("is ok when the current price equals the price the user saw", () => {
    expect(assessLine(line, { price: line.unitPrice, evaluation: OK })).toEqual({ kind: "ok" });
  });

  it("reports a changed amount, and a changed currency, with the current price", () => {
    const up = { amountMinor: 1_100_000, currency: "VND" } as const;
    expect(assessLine(line, { price: up, evaluation: OK })).toEqual({
      kind: "price_changed",
      current: up,
    });
    const usd = { amountMinor: 1_000_000, currency: "USD" } as const;
    expect(assessLine(line, { price: usd, evaluation: OK }).kind).toBe("price_changed");
  });

  it("reports an offer that is no longer known", () => {
    expect(assessLine(line, null)).toEqual({ kind: "unavailable" });
  });

  it("ineligibility wins over a price change, and keeps its reason", () => {
    const bad: OfferEvaluation = {
      state: "OBSERVED",
      addable: false,
      reason: "source_reference_only",
    };
    expect(
      assessLine(line, { price: { amountMinor: 5, currency: "VND" }, evaluation: bad }),
    ).toEqual({ kind: "ineligible", reason: "source_reference_only" });
  });

  it("treats a missing price as ineligible even if the evaluation said addable", () => {
    expect(assessLine(line, { price: null, evaluation: OK })).toEqual({
      kind: "ineligible",
      reason: "no_price",
    });
  });
});

describe("acceptPrices", () => {
  const cart: Cart = {
    lines: [line, { ...line, offerId: "p:a@t" }],
    revision: 4,
    checkoutKey: "key-old-1",
  };

  it("updates only the named lines, bumps the revision and rotates the checkout key", () => {
    const next = acceptPrices(
      cart,
      new Map([[lineKey(line), { amountMinor: 900_000, currency: "VND" as const }]]),
      "key-new-1",
    );
    expect(next.lines[0]!.unitPrice.amountMinor).toBe(900_000);
    expect(next.lines[0]!.quantity).toBe(2);
    expect(next.lines[1]).toEqual(cart.lines[1]);
    expect(next.revision).toBe(5);
    expect(next.checkoutKey).toBe("key-new-1");
  });

  it("returns the very same cart when no price actually differs", () => {
    const same = new Map([[lineKey(line), line.unitPrice]]);
    expect(acceptPrices(cart, same, "key-new-1")).toBe(cart);
    expect(acceptPrices(cart, new Map(), "key-new-1")).toBe(cart);
    expect(acceptPrices(emptyCart("key-empty-1"), same, "key-new-1").revision).toBe(0);
  });
});
