import { z } from "zod";
import {
  addMinor,
  CHECKOUT_CURRENCY,
  moneySchema,
  multiplyMinor,
  type CurrencyCode,
  type Money,
} from "@/modules/shared/domain/money";
import type { IneligibleReason, OfferEvaluation } from "@/modules/pricing";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

const idSchema = z.string().min(1).max(128);

/**
 * A cart line references one variant from one offer (docs/CATALOG_SCHEMA.md "Cart eligibility"). The same
 * variant from a different offer is a different line: there is no silent substitution. `unitPrice` is the
 * price the user saw when adding; it is re-evaluated against the catalog at checkout.
 */
export const cartLineSchema = z.strictObject({
  variantId: idSchema,
  offerId: idSchema,
  quantity: z.number().int().min(MIN_QUANTITY).max(MAX_QUANTITY),
  unitPrice: moneySchema,
});
export type CartLine = z.infer<typeof cartLineSchema>;

/**
 * `revision` increases on every change and is never reset. `checkoutKey` is the idempotency key for
 * placing this exact cart: it is regenerated whenever the cart changes and after an order succeeds, so a
 * refresh or a second tab with the same revision reuses the same key (ARCHITECTURE §4).
 */
export const cartSchema = z.strictObject({
  lines: z.array(cartLineSchema).max(200),
  revision: z.number().int().min(0).safe(),
  checkoutKey: z.string().min(8).max(128),
});
export type Cart = z.infer<typeof cartSchema>;

export type CartError = "invalid_quantity" | "quantity_limit" | "not_addable" | "line_not_found";

export type CartResult =
  | { readonly ok: true; readonly cart: Cart }
  | {
      readonly ok: false;
      readonly error: CartError;
      readonly reason?: IneligibleReason;
      /** The unchanged cart: a rejected change leaves everything as it was. */
      readonly cart: Cart;
    };

export const lineKey = (line: Pick<CartLine, "variantId" | "offerId">): string =>
  `${line.variantId}|${line.offerId}`;

export const emptyCart = (checkoutKey: string): Cart => ({ lines: [], revision: 0, checkoutKey });

const isQuantity = (q: number) => Number.isInteger(q) && q >= MIN_QUANTITY;

function changed(cart: Cart, lines: CartLine[], nextCheckoutKey: string): Cart {
  return { lines, revision: cart.revision + 1, checkoutKey: nextCheckoutKey };
}

/**
 * Add a line, merging quantities for the same variant and offer. Quantity must be an integer from 1 to 99;
 * going over 99 is rejected visibly and leaves the line unchanged (no silent clamp). `eligibility` is the
 * current `evaluateOffer` result for that offer. `nextCheckoutKey` is a fresh idempotency key supplied by
 * the caller because the domain has no randomness.
 */
export function addLine(
  cart: Cart,
  line: CartLine,
  eligibility: OfferEvaluation,
  nextCheckoutKey: string,
): CartResult {
  if (!isQuantity(line.quantity)) return { ok: false, error: "invalid_quantity", cart };
  if (!eligibility.addable) {
    return { ok: false, error: "not_addable", reason: eligibility.reason ?? undefined, cart };
  }
  const key = lineKey(line);
  const existing = cart.lines.find((l) => lineKey(l) === key);
  const quantity = (existing?.quantity ?? 0) + line.quantity;
  if (quantity > MAX_QUANTITY) return { ok: false, error: "quantity_limit", cart };
  const merged: CartLine = { ...line, quantity };
  const lines = existing
    ? cart.lines.map((l) => (lineKey(l) === key ? merged : l))
    : [...cart.lines, merged];
  return { ok: true, cart: changed(cart, lines, nextCheckoutKey) };
}

export function setQuantity(
  cart: Cart,
  key: string,
  quantity: number,
  nextCheckoutKey: string,
): CartResult {
  if (!isQuantity(quantity)) return { ok: false, error: "invalid_quantity", cart };
  if (quantity > MAX_QUANTITY) return { ok: false, error: "quantity_limit", cart };
  if (!cart.lines.some((l) => lineKey(l) === key))
    return { ok: false, error: "line_not_found", cart };
  const lines = cart.lines.map((l) => (lineKey(l) === key ? { ...l, quantity } : l));
  return { ok: true, cart: changed(cart, lines, nextCheckoutKey) };
}

export function removeLine(cart: Cart, key: string, nextCheckoutKey: string): CartResult {
  if (!cart.lines.some((l) => lineKey(l) === key))
    return { ok: false, error: "line_not_found", cart };
  return {
    ok: true,
    cart: changed(
      cart,
      cart.lines.filter((l) => lineKey(l) !== key),
      nextCheckoutKey,
    ),
  };
}

/** Integer subtotal per currency; currencies are never converted or mixed. */
export function subtotalsByCurrency(cart: Cart): Partial<Record<CurrencyCode, number>> {
  const totals: Partial<Record<CurrencyCode, number>> = {};
  for (const line of cart.lines) {
    const { currency, amountMinor } = line.unitPrice;
    totals[currency] = addMinor(totals[currency] ?? 0, multiplyMinor(amountMinor, line.quantity));
  }
  return totals;
}

export type CheckoutStatus =
  "ok" | "blocked:empty_cart" | "blocked:mixed_currency" | "blocked:currency_not_supported";

/** Checkout needs a non-empty cart in a single currency, and that currency must be VND (ADR-013). */
export function checkoutStatus(cart: Cart): CheckoutStatus {
  if (cart.lines.length === 0) return "blocked:empty_cart";
  const currencies = Object.keys(subtotalsByCurrency(cart));
  if (currencies.length > 1) return "blocked:mixed_currency";
  if (currencies[0] !== CHECKOUT_CURRENCY) return "blocked:currency_not_supported";
  return "ok";
}

export function cartTotal(cart: Cart, currency: CurrencyCode = CHECKOUT_CURRENCY): Money | null {
  const amountMinor = subtotalsByCurrency(cart)[currency];
  return amountMinor === undefined ? null : { amountMinor, currency };
}

/**
 * After an order is placed the cart is emptied. The revision keeps counting (never reset) and the
 * checkout key rotates so the next order cannot reuse the finished order's key.
 */
export function afterOrderPlaced(cart: Cart, nextCheckoutKey: string): Cart {
  return { lines: [], revision: cart.revision + 1, checkoutKey: nextCheckoutKey };
}
