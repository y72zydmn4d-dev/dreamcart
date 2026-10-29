import { describe, expect, it } from "vitest";
import { buildCatalogView } from "@/modules/discovery";
import { validateCatalog } from "@/modules/catalog";
import { loadActiveCatalog, REAL_RAW } from "./index";
import { SYNTHETIC_RAW } from "./synthetic";

const NOW = Date.parse("2026-11-30T00:00:00Z");

describe("catalog data files", () => {
  it("the real catalog is valid and honestly empty until verified records are supplied", () => {
    const real = validateCatalog(REAL_RAW, { mode: "real", nowMs: NOW });
    expect(real.errors).toEqual([]);
    expect(REAL_RAW.products.length).toBe(0); // no product is invented; update this when owner data lands
  });
  it("no fixture id can be in the real catalog files", () => {
    const text = JSON.stringify(REAL_RAW);
    expect(text).not.toMatch(/"fx-/);
  });
  it("the synthetic catalog is valid in synthetic mode and invalid in real mode", () => {
    expect(validateCatalog(SYNTHETIC_RAW, { mode: "synthetic", nowMs: NOW }).errors).toEqual([]);
    const asReal = validateCatalog(SYNTHETIC_RAW, { mode: "real", nowMs: NOW });
    expect(asReal.ok).toBe(false);
    expect(asReal.errors.some((e) => e.code === "fixture_id_in_real_catalog")).toBe(true);
  });
});

describe("loadActiveCatalog", () => {
  it("falls back to the labeled synthetic catalog while the real one is empty, and says so", async () => {
    const active = await loadActiveCatalog(NOW);
    expect(active.mode).toBe("synthetic");
    expect(active.catalog.products.length).toBe(8);
    expect(active.readiness).toMatchObject({ mode: "synthetic", meetsMinimum: false });
    expect(active.readiness.shortfalls[0]).toContain("synthetic fixtures only");
  });
  it("exposes advisories without failing: stale price, reference-only source", async () => {
    const { warnings } = await loadActiveCatalog(NOW);
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain("stale_price");
    expect(codes).toContain("source_policy_blocks_cart");
    expect(codes).toContain("product_without_price");
  });
});

describe("synthetic catalog exercises every state the UI must handle", () => {
  it("has multi-merchant, stale, unpriced, non-VND and reference-only offers", async () => {
    const { catalog } = await loadActiveCatalog(NOW);
    const view = buildCatalogView(catalog, NOW);
    const variant = (id: string) =>
      view.products.flatMap((p) => p.variants).find((v) => v.variant.id === id)!;
    expect(variant("fx-aero:13-fx1-16-512").offers).toHaveLength(2); // two merchants
    expect(variant("fx-aero:13-fx1-16-512").best!.amountMinor).toBe(29_990_000); // cheapest first
    expect(variant("fx-nova:512-graphite").best!.state).toBe("STALE");
    expect(variant("fx-buds-lite:earbuds-black").status).toBe("unpriced");
    expect(variant("fx-aero:15-fx2-32-1024").offers.map((o) => o.offer.price?.currency)).toEqual([
      "VND",
      "USD",
    ]);
    expect(
      variant("fx-pulse:128-black").offers.some(
        (o) => o.source.persistencePolicy === "reference_only" && !o.evaluation.addable,
      ),
    ).toBe(true);
  });
});
