import { describe, expect, it } from "vitest";
import {
  deriveVariantKey,
  readinessReport,
  validateCatalog,
  type CatalogData,
  type Category,
} from "@/modules/catalog";
import { deriveConfigurator, selectOption } from "@/modules/configurator";
import {
  buildCatalogView,
  buildSearchVocabulary,
  discover,
  EMPTY_DISCOVERY,
  EMPTY_FILTERS,
  filtersFor,
} from "@/modules/discovery";

/**
 * Computer and display schemas (Apple Store Vietnam program, Batch 1), exercised on a small FICTIONAL catalog built
 * here ("Testmark", example.test). Nothing in it describes a real product, and none of it is in a data directory:
 * these tests prove the rules, not any store's configurations.
 */
const NOW = Date.parse("2026-10-30T00:00:00Z");
const iso = "2026-10-20T00:00:00.000Z";

type Attrs = Record<string, string | number>;
const variant = (productId: string, category: Category, id: string, attributes: Attrs) => ({
  id: `${productId}:${id}`,
  productId,
  attributes,
  gtin: null,
  variantKey: deriveVariantKey(category, attributes),
});
const product = (id: string, category: Category, family: string, model: string) => ({
  id,
  brand: "Testmark",
  family,
  model,
  category,
  titleVi: `Testmark ${family} ${model}`,
  summaryVi: "Dữ liệu thử nghiệm, không phải sản phẩm thật.",
  verificationStatus: "verified" as const,
  createdAt: iso,
});
const offer = (v: { id: string }, amountMinor: number | null) => ({
  id: `${v.id}@test-store`,
  variantId: v.id,
  sourceId: "test-store",
  url: `https://store.example.test/p/${v.id.replace(":", "/")}`,
  merchantName: "Test Store",
  availability: "unknown" as const,
  price:
    amountMinor === null
      ? null
      : {
          amountMinor,
          currency: "VND" as const,
          observedAt: iso,
          provenanceType: "curator_observed" as const,
          observer: "test-curator",
          evidenceNote: "test fixture, not a real observation",
        },
});

/** Desktop: the 24 GB option exists only with the "tm2" chip, so chip and memory are NOT a full cross product. */
const desk = [
  variant("tm-desk", "desktop", "tm1-16-512", { chip: "tm1", ram_gb: 16, storage_gb: 512 }),
  variant("tm-desk", "desktop", "tm1-16-1024", { chip: "tm1", ram_gb: 16, storage_gb: 1024 }),
  variant("tm-desk", "desktop", "tm2-16-512-10-16", {
    chip: "tm2",
    ram_gb: 16,
    storage_gb: 512,
    cpu_cores: 10,
    gpu_cores: 16,
  }),
  variant("tm-desk", "desktop", "tm2-16-512-12-18", {
    chip: "tm2",
    ram_gb: 16,
    storage_gb: 512,
    cpu_cores: 12,
    gpu_cores: 18,
  }),
  variant("tm-desk", "desktop", "tm2-24-1024-12-18", {
    chip: "tm2",
    ram_gb: 24,
    storage_gb: 1024,
    cpu_cores: 12,
    gpu_cores: 18,
  }),
];
/** Display: the textured glass is offered only with the tilt stand. */
const view27 = [
  variant("tm-view", "display", "std-tilt", {
    screen_in: 27,
    resolution: "5k",
    glass: "standard",
    stand: "tilt",
  }),
  variant("tm-view", "display", "std-height", {
    screen_in: 27,
    resolution: "5k",
    glass: "standard",
    stand: "height",
  }),
  variant("tm-view", "display", "tex-tilt", {
    screen_in: 27,
    resolution: "5k",
    glass: "textured",
    stand: "tilt",
  }),
];

const data = (): CatalogData => ({
  sources: [
    {
      id: "test-store",
      name: "Test Store",
      domain: "store.example.test",
      kind: "retailer",
      termsReviewedAt: "2026-10-01",
      persistencePolicy: "snapshot_allowed",
    },
  ],
  products: [
    product("tm-desk", "desktop", "Desk", "D1"),
    product("tm-view", "display", "View", "V1"),
  ],
  variants: [...desk, ...view27],
  offers: [...desk, ...view27].map((v, i) => offer(v, i === 0 ? null : 20_000_000 + i * 1_000_000)),
  media: [],
  vocabulary: {
    chip: { tm1: { labelVi: "Chip TM1", aliases: [] }, tm2: { labelVi: "Chip TM2", aliases: [] } },
    resolution: { "5k": { labelVi: "5K", aliases: [] } },
    glass: {
      standard: { labelVi: "Kính tiêu chuẩn", aliases: [] },
      textured: { labelVi: "Kính nhám", aliases: [] },
    },
    stand: {
      tilt: { labelVi: "Chân nghiêng", aliases: [] },
      height: { labelVi: "Chân chỉnh độ cao", aliases: [] },
    },
  },
  featured: [],
});
const validate = (d: CatalogData) => validateCatalog(d, { mode: "real", nowMs: NOW });

describe("computer and display attributes", () => {
  it("a fictional computer and display catalog is valid, with an unpriced variant kept as unknown", () => {
    const result = validate(data());
    expect(result.errors).toEqual([]);
    expect(result.catalog!.offers.find((o) => o.price === null)).toBeDefined();
  });

  const withVariant = (v: ReturnType<typeof variant>) => {
    const d = data();
    return validate({ ...d, variants: [...d.variants, v], offers: d.offers });
  };
  const codes = (v: ReturnType<typeof variant>) => withVariant(v).errors.map((e) => e.code);

  it("a price needs its provenance: no observer or evidence means the catalog is refused", () => {
    const d = data();
    const bare = d.offers.map((o) =>
      o.price ? { ...o, price: { ...o.price, observer: undefined, evidenceNote: undefined } } : o,
    );
    const errors = validate({ ...d, offers: bare }).errors;
    expect(errors.some((e) => e.code === "price_without_provenance")).toBe(true);
  });

  it("coded values need a Vietnamese label, including the new display options", () => {
    const d = data();
    const errors = validate({ ...d, vocabulary: { ...d.vocabulary, glass: {} } }).errors;
    expect(errors.some((e) => e.code === "missing_label" && /glass/.test(e.path))).toBe(true);
  });

  it("a desktop needs a chip, memory and storage; a display needs a screen size", () => {
    expect(codes(variant("tm-desk", "desktop", "bad1", { chip: "tm1", ram_gb: 16 }))).toContain(
      "missing_attribute",
    );
    expect(codes(variant("tm-view", "display", "bad2", { glass: "standard" }))).toContain(
      "missing_attribute",
    );
  });

  it("an attribute that does not describe the category is refused (no RAM on a display, no headphone type on a desktop)", () => {
    const withRam = withVariant(
      variant("tm-view", "display", "bad3", { screen_in: 27, ram_gb: 16 }),
    ).errors;
    expect(withRam.some((e) => e.code === "unknown_attribute" && /ram_gb/.test(e.path))).toBe(true);
    const withType = withVariant(
      variant("tm-desk", "desktop", "bad4", {
        chip: "tm1",
        ram_gb: 16,
        storage_gb: 512,
        type: "earbuds",
      }),
    ).errors;
    expect(withType.some((e) => e.code === "unknown_attribute" && /type/.test(e.path))).toBe(true);
  });

  it("core counts are whole numbers; glass, stand and resolution are lowercase slugs", () => {
    expect(
      codes(
        variant("tm-desk", "desktop", "bad5", {
          chip: "tm1",
          ram_gb: 16,
          storage_gb: 512,
          cpu_cores: 9.5,
        }),
      ),
    ).toContain("invalid_attribute");
    expect(
      codes(variant("tm-view", "display", "bad6", { screen_in: 27, glass: "Nano Texture" })),
    ).toContain("invalid_attribute");
  });

  it("variants that share a chip but differ in core counts are different variants; true duplicates are rejected", () => {
    const keys = desk.map((v) => v.variantKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.join("|")).toContain("cpu_cores=10;gpu_cores=16");
    const duplicate = variant("tm-desk", "desktop", "dup", {
      chip: "tm2",
      ram_gb: 16,
      storage_gb: 512,
      cpu_cores: 10,
      gpu_cores: 16,
    });
    expect(codes(duplicate)).toContain("duplicate_variant_key");
  });

  it("adding categories does not raise the release gate: the original three still define it", () => {
    const { catalog } = validate(data());
    const report = readinessReport(catalog!);
    expect(report.shortfalls).toContain("no laptop products");
    expect(report.shortfalls.some((s) => /no (desktop|display) products/.test(s))).toBe(false);
    expect(report.byCategory).toMatchObject({ desktop: 1, display: 1 });
  });
});

describe("exact configurations: only listed combinations can be chosen", () => {
  const groups = ["chip", "ram_gb", "storage_gb", "cpu_cores", "gpu_cores"];
  const configVariants = desk.map((v) => ({ id: v.id, attributes: v.attributes }));

  it("a memory size that exists only with another chip is unavailable, not invented", () => {
    const view = deriveConfigurator(configVariants, groups, { chip: "tm1" });
    const ram = view.groups.find((g) => g.key === "ram_gb")!.options;
    expect(ram.find((o) => o.value === 16)!.state).toBe("available");
    expect(ram.find((o) => o.value === 24)!.state).toBe("unavailable");
  });

  it("choosing the unsupported pairing asks to reset the chip; nothing is applied silently", () => {
    const result = selectOption(configVariants, { chip: "tm1" }, "ram_gb", 24);
    expect(result.status).toBe("needs_reset");
    if (result.status === "needs_reset") {
      expect(result.conflicts).toEqual(["chip"]);
      expect(result.selection).toEqual({ chip: "tm1" });
    }
  });

  it("a complete selection resolves to exactly one listed variant; core counts decide between chip variants", () => {
    const base = { chip: "tm2", ram_gb: 16, storage_gb: 512 };
    expect(deriveConfigurator(configVariants, groups, base).resolvedVariantId).toBeNull(); // two core configurations
    const resolved = deriveConfigurator(configVariants, groups, {
      ...base,
      cpu_cores: 12,
      gpu_cores: 18,
    });
    expect(resolved.resolvedVariantId).toBe("tm-desk:tm2-16-512-12-18");
  });

  it("display glass and stand are dependent options", () => {
    const options = view27.map((v) => ({ id: v.id, attributes: v.attributes }));
    const order = ["screen_in", "resolution", "glass", "stand"];
    const view = deriveConfigurator(options, order, { glass: "textured" });
    const stand = view.groups.find((g) => g.key === "stand")!.options;
    expect(stand.find((o) => o.value === "tilt")!.state).toBe("available");
    expect(stand.find((o) => o.value === "height")!.state).toBe("unavailable");
    expect(selectOption(options, { glass: "textured" }, "stand", "height").status).toBe(
      "needs_reset",
    );
  });
});

describe("filters follow the category's verified attributes", () => {
  const keys = (category: Category) => filtersFor(category).map((f) => f.key);

  it("a display offers no RAM or storage filter, and a desktop no screen-size filter", () => {
    expect(keys("display")).toEqual(["brand", "screen_in", "resolution", "glass", "stand"]);
    expect(keys("desktop")).toEqual(["brand", "chip", "ram_gb", "storage_gb"]);
  });

  it("the facets of a display search carry no RAM group, and unpriced variants never count as zero in a price band", () => {
    const { catalog } = validate(data());
    const view = buildCatalogView(catalog!, NOW);
    const result = discover(
      view,
      { ...EMPTY_DISCOVERY, filters: { ...EMPTY_FILTERS, category: "display" } },
      buildSearchVocabulary(catalog!),
    );
    const groupKeys = result.facets.groups.map((g) => g.key);
    expect(groupKeys).toContain("stand");
    expect(groupKeys).not.toContain("ram_gb");
    expect(result.categoryCounts).toMatchObject({ display: 1, desktop: 1, laptop: 0 });
    // the cheapest variant of the desktop is unpriced: it must not make the product "free"
    const desktop = view.products.find((p) => p.product.id === "tm-desk")!;
    expect(desktop.variants.find((v) => v.variant.id === "tm-desk:tm1-16-512")!.best).toBeNull();
  });
});
