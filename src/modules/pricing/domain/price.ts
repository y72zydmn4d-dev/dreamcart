import { z } from "zod";
import { amountMinorSchema, moneySchema, CHECKOUT_CURRENCY } from "@/modules/shared/domain/money";
import { isoToMs } from "@/modules/shared/domain/ports";

export const PROVENANCE_TYPES = [
  "curator_observed",
  "manufacturer_listed",
  "user_entered",
] as const;
export type ProvenanceType = (typeof PROVENANCE_TYPES)[number];

export const PERSISTENCE_POLICIES = ["snapshot_allowed", "reference_only", "unknown"] as const;
export type PersistencePolicy = (typeof PERSISTENCE_POLICIES)[number];

const isoDateTime = z.iso.datetime();

/** A price somebody saw (docs/CATALOG_SCHEMA.md PriceObservation). An unknown price is `null` on the offer, never 0. */
export const priceObservationSchema = z.strictObject({
  amountMinor: amountMinorSchema,
  currency: moneySchema.shape.currency,
  observedAt: isoDateTime,
  provenanceType: z.enum(PROVENANCE_TYPES),
  observer: z.string().min(1).max(80).optional(),
  evidenceUrl: z.string().max(2048).optional(),
  evidenceNote: z.string().max(500).optional(),
});
export type PriceObservation = z.infer<typeof priceObservationSchema>;

export type PriceState = "OBSERVED" | "STALE" | "EXPIRED" | "USER_ENTERED" | "UNAVAILABLE";

export type IneligibleReason =
  | "no_price"
  | "expired"
  | "currency_not_supported"
  | "source_reference_only"
  | "source_policy_unknown";

/**
 * Freshness is configuration (decision P-1, ADR-013). `blockAfterDays: null` means an old price is
 * labeled, never forbidden.
 */
export interface FreshnessConfig {
  readonly warnAfterDays: {
    readonly curator_observed: number;
    readonly manufacturer_listed: number;
  };
  readonly blockAfterDays: number | null;
}

export const DEFAULT_FRESHNESS: FreshnessConfig = {
  warnAfterDays: { curator_observed: 14, manufacturer_listed: 45 },
  blockAfterDays: null,
};

const DAY_MS = 86_400_000;

/** Whole-clock age in days; a future `observedAt` (clock skew) counts as age 0. */
export function priceAgeDays(nowMs: number, observedAt: string): number {
  return Math.max(0, (nowMs - isoToMs(observedAt)) / DAY_MS);
}

/** Derived, never stored. Boundaries are inclusive: exactly the window is still the earlier state. */
export function derivePriceState(
  price: PriceObservation | null,
  nowMs: number,
  config: FreshnessConfig = DEFAULT_FRESHNESS,
): PriceState {
  if (price === null) return "UNAVAILABLE";
  if (price.provenanceType === "user_entered") return "USER_ENTERED";
  const age = priceAgeDays(nowMs, price.observedAt);
  if (config.blockAfterDays !== null && age > config.blockAfterDays) return "EXPIRED";
  return age <= config.warnAfterDays[price.provenanceType] ? "OBSERVED" : "STALE";
}

export interface OfferPricing {
  readonly sourcePolicy: PersistencePolicy;
  readonly price: PriceObservation | null;
}

export interface OfferEvaluation {
  readonly state: PriceState;
  readonly addable: boolean;
  readonly reason: IneligibleReason | null;
}

/**
 * Price state plus cart eligibility. Checks run in the order of CATALOG_SCHEMA "Cart eligibility"
 * and the first failure wins: no price, expired, non-VND, then source policy (user-entered prices
 * are exempt from the source policy because the user supplied them).
 */
export function evaluateOffer(
  offer: OfferPricing,
  nowMs: number,
  config: FreshnessConfig = DEFAULT_FRESHNESS,
): OfferEvaluation {
  const state = derivePriceState(offer.price, nowMs, config);
  if (state === "UNAVAILABLE") return { state, addable: false, reason: "no_price" };
  if (state === "EXPIRED") return { state, addable: false, reason: "expired" };
  if (offer.price!.currency !== CHECKOUT_CURRENCY) {
    return { state, addable: false, reason: "currency_not_supported" };
  }
  if (state !== "USER_ENTERED" && offer.sourcePolicy !== "snapshot_allowed") {
    return {
      state,
      addable: false,
      reason:
        offer.sourcePolicy === "reference_only" ? "source_reference_only" : "source_policy_unknown",
    };
  }
  return { state, addable: true, reason: null };
}

/** True for a price that must show the "price may have changed" warning (and be repeated at checkout). */
export const needsFreshnessWarning = (state: PriceState): boolean => state === "STALE";
