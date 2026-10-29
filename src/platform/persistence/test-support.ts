import { addLine, type Cart, type CartLine } from "@/modules/cart";
import {
  formatOrderCode,
  type PlaceOrderCommand,
  type PlaceOrderOutcome,
  type ResolvedLine,
  type VirtualOrder,
} from "@/modules/orders";
import type { OfferEvaluation } from "@/modules/pricing";
import type { IdGenerator } from "@/modules/shared/domain/ports";
import type { Persistence, PersistenceDeps } from "./types";

/** Helpers shared by the persistence test suites. Not imported by application code. */

export const T0 = Date.parse("2026-11-30T00:00:00Z");

export function testClock(start = T0) {
  let now = start;
  return {
    nowMs: () => now,
    set(ms: number) {
      now = ms;
    },
    advance(ms: number) {
      now += ms;
    },
  };
}
export type TestClock = ReturnType<typeof testClock>;

/** Deterministic ids: uuids and random bytes from a counter, so tests are reproducible. */
export function counterIds(seed = 1): IdGenerator {
  let n = seed;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`,
    randomBytes: (count) => Uint8Array.from({ length: count }, (_, i) => (n++ * 31 + i * 7) & 255),
  };
}

export function makeDeps(
  over: Partial<PersistenceDeps> = {},
): PersistenceDeps & { clock: TestClock } {
  return { clock: testClock(), ids: counterIds(), ...over } as PersistenceDeps & {
    clock: TestClock;
  };
}

const OK: OfferEvaluation = { state: "OBSERVED", addable: true, reason: null };

export const cartLine = (
  variantId = "v1",
  offerId = "o1",
  quantity = 1,
  amountMinor = 1_000_000,
): CartLine => ({
  variantId,
  offerId,
  quantity,
  unitPrice: { amountMinor, currency: "VND" },
});

/** Add lines through the real domain function and persist them; returns the saved cart. */
export async function saveCartWith(
  p: Persistence,
  ids: IdGenerator,
  ...lines: CartLine[]
): Promise<Cart> {
  let cart = await p.cart.get();
  for (const line of lines) {
    const next = addLine(cart, line, OK, ids.uuid());
    if (!next.ok) throw new Error(`setup: ${next.error}`);
    cart = next.cart;
  }
  const saved = await p.cart.save(cart);
  if (!saved.ok) throw new Error("setup: cart save was stale");
  return saved.cart;
}

export const resolveLine =
  (over: Partial<ResolvedLine> = {}) =>
  (): ResolvedLine => ({
    productId: "p1",
    brand: "Brand",
    titleVi: "Sản phẩm thử nghiệm",
    attributes: { color: "black" },
    merchantName: "Shop",
    sourceUrl: "https://example.com/p1",
    price: {
      amountMinor: 1_000_000,
      currency: "VND",
      observedAt: "2026-11-29T00:00:00Z",
      provenanceType: "curator_observed",
    },
    sourcePolicy: "snapshot_allowed",
    imageRef: null,
    ...over,
  });

export function placeCommand(
  clock: { nowMs(): number },
  ids: IdGenerator,
  idempotencyKey: string,
  over: Partial<PlaceOrderCommand> = {},
): PlaceOrderCommand {
  return {
    idempotencyKey,
    resolveLine: resolveLine(),
    nowMs: clock.nowMs(),
    scenario: "quick",
    destination: "dream_apartment",
    payment: "dream_credits",
    acknowledged: true,
    catalogVersion: "cat-test",
    orderId: ids.uuid(),
    code: formatOrderCode(ids.randomBytes(10)),
    nextCheckoutKey: ids.uuid(),
    ...over,
  };
}

/** Seed a one-line cart and place an order for it. */
export async function placeOne(
  p: Persistence,
  deps: { clock: { nowMs(): number }; ids: IdGenerator },
  over: Partial<PlaceOrderCommand> = {},
): Promise<{ outcome: PlaceOrderOutcome; order: VirtualOrder }> {
  const cart = await saveCartWith(p, deps.ids, cartLine());
  const outcome = await p.orders.placeOrder(
    placeCommand(deps.clock, deps.ids, cart.checkoutKey, over),
  );
  if (!outcome.ok) throw new Error(`setup: placeOrder ${outcome.error}`);
  return { outcome, order: outcome.order };
}
