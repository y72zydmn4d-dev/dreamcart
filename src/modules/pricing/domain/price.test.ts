import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isValidMoney } from "@/modules/shared/domain/money";
import {
  DEFAULT_FRESHNESS,
  derivePriceState,
  evaluateOffer,
  needsFreshnessWarning,
  priceAgeDays,
  priceObservationSchema,
  type FreshnessConfig,
  type OfferPricing,
} from "./price";

/** The Phase 0 pricing fixtures are the contract (fixtures/pricing/cases.json). */
const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/pricing/cases.json"), "utf8"),
) as {
  records: {
    id: string;
    record: { amountMinor: number; currency: string };
    expected: "valid" | "invalid";
  }[];
  offers: {
    id: string;
    now: string;
    config: FreshnessConfig;
    offer: OfferPricing;
    expected: { state: string; addable: boolean; reason: string | null };
  }[];
};

describe("money records (fixtures R01–R09)", () => {
  it.each(fixtures.records.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    expect(isValidMoney(c.record) ? "valid" : "invalid").toBe(c.expected);
  });
});

describe("price state and eligibility (fixtures O01–O15)", () => {
  it.each(fixtures.offers.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    expect(evaluateOffer(c.offer, Date.parse(c.now), c.config)).toEqual(c.expected);
  });
});

describe("price age", () => {
  const observedAt = "2026-11-01T00:00:00Z";
  it("never goes negative for a future observation", () => {
    expect(priceAgeDays(Date.parse("2026-10-01T00:00:00Z"), observedAt)).toBe(0);
  });
  it("is measured in fractional days", () => {
    expect(priceAgeDays(Date.parse("2026-11-02T12:00:00Z"), observedAt)).toBe(1.5);
  });
});

describe("derivePriceState", () => {
  const now = Date.parse("2026-11-30T00:00:00Z");
  const observed = (
    provenanceType: "curator_observed" | "manufacturer_listed",
    observedAt: string,
  ) => ({
    amountMinor: 1,
    currency: "VND" as const,
    observedAt,
    provenanceType,
  });

  it("uses the default freshness windows (P-1: 14 and 45 days, no block)", () => {
    expect(DEFAULT_FRESHNESS).toEqual({
      warnAfterDays: { curator_observed: 14, manufacturer_listed: 45 },
      blockAfterDays: null,
    });
    expect(derivePriceState(observed("curator_observed", "2026-11-16T00:00:00Z"), now)).toBe(
      "OBSERVED",
    );
    expect(derivePriceState(observed("curator_observed", "2026-11-15T23:59:59Z"), now)).toBe(
      "STALE",
    );
    expect(derivePriceState(observed("manufacturer_listed", "2020-01-01T00:00:00Z"), now)).toBe(
      "STALE",
    );
  });

  it("reports UNAVAILABLE for a null price and only STALE gets the warning", () => {
    expect(derivePriceState(null, now)).toBe("UNAVAILABLE");
    expect(needsFreshnessWarning("STALE")).toBe(true);
    expect(needsFreshnessWarning("OBSERVED")).toBe(false);
  });
});

describe("priceObservationSchema", () => {
  const valid = {
    amountMinor: 29_990_000,
    currency: "VND",
    observedAt: "2026-11-30T00:00:00Z",
    provenanceType: "curator_observed",
  };
  it("accepts a complete observation", () => {
    expect(priceObservationSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["zero amount", { ...valid, amountMinor: 0 }],
    ["fractional amount", { ...valid, amountMinor: 1.5 }],
    ["unknown currency", { ...valid, currency: "XXX" }],
    ["bad timestamp", { ...valid, observedAt: "yesterday" }],
    ["unknown provenance", { ...valid, provenanceType: "rumor" }],
    ["unknown key", { ...valid, discount: 20 }],
  ])("rejects %s", (_name, value) => {
    expect(priceObservationSchema.safeParse(value).success).toBe(false);
  });
});
