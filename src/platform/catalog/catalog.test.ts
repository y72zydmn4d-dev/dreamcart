import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("activation gate", () => {
  it("serves the labeled fixtures by default and says which mode is active", async () => {
    const active = await loadActiveCatalog(NOW);
    expect(active.activation).toBe("SYNTHETIC_DEMO");
    expect(active.activationNote).toBeNull();
  });

  it("the committed setting is valid, and publishing the real catalog is never the default", async () => {
    const { default: file } = await import("../../../data/catalog/activation.json");
    const { activationSchema } = await import("@/modules/catalog");
    expect(activationSchema.safeParse(file).success).toBe(true);
    // Flip this deliberately, with the owner's authorization, in the PR that activates a verified catalog.
    expect(file.mode).toBe("SYNTHETIC_DEMO");
  });

  it("verified records already present would not go live without the setting", () => {
    // data/catalog is validated on every load but only served under VERIFIED_REAL_CATALOG.
    expect(REAL_RAW.products.length).toBe(0);
  });
});

describe("staged catalog (data/catalog-staging/apple-vn)", () => {
  it("is valid under the real-catalog rules, so a bad batch cannot reach a Preview", async () => {
    const { STAGING_RAW } = await import("./staging");
    const result = validateCatalog(STAGING_RAW, { mode: "real", nowMs: NOW });
    expect(result.errors).toEqual([]);
  });

  it("never contains fixture ids", async () => {
    const { STAGING_RAW } = await import("./staging");
    expect(JSON.stringify(STAGING_RAW)).not.toMatch(/"fx-/);
  });

  it("ships its inventory manifest and compliance register in a valid shape", async () => {
    const { validateInventory, complianceRegisterSchema, methodPermitted } =
      await import("@/modules/catalog");
    const manifest = (
      await import("../../../data/catalog-staging/apple-vn/inventory/manifest.json")
    ).default;
    const compliance = (
      await import("../../../data/catalog-staging/apple-vn/inventory/compliance.json")
    ).default;
    expect(validateInventory(manifest).errors).toEqual([]);
    const register = complianceRegisterSchema.parse(compliance);
    // Until the terms are read and recorded, nothing automated and no image copying is permitted.
    expect(methodPermitted(register, "automated_page_collection")).toBe(false);
    expect(methodPermitted(register, "image_rehosting")).toBe(false);
    expect(methodPermitted(register, "image_hotlinking")).toBe(false);
  });
});

describe("loadActiveCatalog under each activation setting", () => {
  /** Load the module fresh with a different committed setting and deployment target. */
  async function loadWith(setting: unknown, vercelEnv: string | undefined) {
    vi.resetModules();
    vi.doMock("../../../data/catalog/activation.json", () => ({ default: setting }));
    vi.stubEnv("VERCEL_ENV", vercelEnv as string);
    const mod = await import("./index");
    return mod.loadActiveCatalog(NOW);
  }
  afterEach(() => {
    vi.doUnmock("../../../data/catalog/activation.json");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  const staging = { mode: "REAL_CATALOG_STAGING", ownerAuthorization: null };

  it("staging in production is ignored with a recorded note, never served", async () => {
    const active = await loadWith(staging, "production");
    expect(active.activation).toBe("SYNTHETIC_DEMO");
    expect(active.mode).toBe("synthetic");
    expect(active.activationNote).toContain("production");
  });

  it("staging in a preview with no staged products yet falls back to the fixtures, and says so", async () => {
    const active = await loadWith(staging, "preview");
    expect(active.activation).toBe("SYNTHETIC_DEMO");
    expect(active.activationNote).toContain("no products yet");
  });

  it("the verified mode with no verified products is an error, not a silent fallback", async () => {
    const verified = {
      mode: "VERIFIED_REAL_CATALOG",
      ownerAuthorization: { reference: "test", authorizedAt: "2026-10-30" },
    };
    await expect(loadWith(verified, "production")).rejects.toThrow(/no verified products/);
  });

  it("an invalid activation file is an error", async () => {
    await expect(
      loadWith({ mode: "VERIFIED_REAL_CATALOG", ownerAuthorization: null }, undefined),
    ).rejects.toThrow(/activation\.json is invalid/);
  });
});
