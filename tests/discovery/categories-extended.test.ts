import { describe, expect, it } from "vitest";
import type { CatalogData, MediaAsset } from "@/modules/catalog";
import { deriveConfigurator, selectOption } from "@/modules/configurator";
import {
  buildCatalogView,
  buildSearchVocabulary,
  discover,
  EMPTY_DISCOVERY,
  EMPTY_FILTERS,
  parseDiscoveryState,
  serializeDiscoveryState,
  type DiscoveryState,
} from "@/modules/discovery";
import {
  NOW,
  catalog,
  label,
  mustValidate,
  product,
  validate,
  variant,
  type Attrs,
} from "../support/fictional-catalog";

/**
 * Tablet, wearable, audio, smart-home and accessory schemas, on FICTIONAL records only (see support/fictional-catalog).
 * They prove the rules (exact configurations, compatibility, unknown prices, unknown image rights, filters, search),
 * not the contents of any store.
 */

/** A Vietnamese label for every coded value used, which the validator requires. */
function withVocabulary(d: CatalogData): CatalogData {
  const vocabulary: Record<string, Record<string, ReturnType<typeof label>>> = {};
  for (const v of d.variants)
    for (const [key, value] of Object.entries(v.attributes))
      if (typeof value === "string") (vocabulary[key] ??= {})[value] = label(value);
  return { ...d, vocabulary };
}
const build = (d: CatalogData) => mustValidate(withVocabulary(d));
const viewOf = (d: CatalogData) => {
  const c = build(d);
  return { c, view: buildCatalogView(c, NOW), vocab: buildSearchVocabulary(c) };
};
const run = (ctx: ReturnType<typeof viewOf>, over: Partial<DiscoveryState> = {}) =>
  discover(
    ctx.view,
    { ...EMPTY_DISCOVERY, ...over, filters: { ...EMPTY_FILTERS, ...(over.filters ?? {}) } },
    ctx.vocab,
  );

// ---- tablet ---------------------------------------------------------------------------------------------------
const tab = (id: string, a: Attrs) => variant("tm-tab", "tablet", id, a);
const tabletVariants = [
  tab("11-128-w", { screen_in: 11, storage_gb: 128, connectivity: "wifi" }),
  tab("11-256-w", { screen_in: 11, storage_gb: 256, connectivity: "wifi" }),
  tab("11-256-c", { screen_in: 11, storage_gb: 256, connectivity: "cellular" }),
  tab("13-256-w", { screen_in: 13, storage_gb: 256, connectivity: "wifi" }),
  tab("13-512-w", { screen_in: 13, storage_gb: 512, connectivity: "wifi" }),
  tab("13-512-c", { screen_in: 13, storage_gb: 512, connectivity: "cellular" }),
];
const tabletCatalog = () => catalog([product("tm-tab", "tablet", "Tab", "T1")], tabletVariants);

describe("tablet configurations", () => {
  const groups = ["screen_in", "storage_gb", "connectivity"];
  const configs = tabletVariants.map((v) => ({ id: v.id, attributes: v.attributes }));

  it("a cellular option that exists only with some storage is not offered with the others", () => {
    const view = deriveConfigurator(configs, groups, { storage_gb: 128 });
    const connectivity = view.groups.find((g) => g.key === "connectivity")!.options;
    expect(connectivity.find((o) => o.value === "wifi")!.state).toBe("available");
    expect(connectivity.find((o) => o.value === "cellular")!.state).toBe("unavailable");
    expect(selectOption(configs, { storage_gb: 128 }, "connectivity", "cellular").status).toBe(
      "needs_reset",
    );
  });

  it("resolves only to a listed configuration", () => {
    const resolved = deriveConfigurator(configs, groups, {
      screen_in: 13,
      storage_gb: 512,
      connectivity: "cellular",
    });
    expect(resolved.resolvedVariantId).toBe("tm-tab:13-512-c");
    const absent = deriveConfigurator(configs, groups, {
      screen_in: 13,
      storage_gb: 128,
      connectivity: "wifi",
    });
    expect(absent.resolvedVariantId).toBeNull();
    expect(absent.matchingVariantIds).toEqual([]);
  });

  it("a plain storage query binds to storage and returns exact variants (RAM is not searchable on tablets)", () => {
    const ctx = viewOf(tabletCatalog());
    const result = run(ctx, { q: "tablet 256gb" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.class).toBe("match");
    expect(result.items[0]!.variants.map((v) => v.variant.id).sort()).toEqual([
      "tm-tab:11-256-c",
      "tm-tab:11-256-w",
      "tm-tab:13-256-w",
    ]);
  });

  it("offers connectivity as a filter only because the data has two values, and counts it honestly", () => {
    const ctx = viewOf(tabletCatalog());
    const base = run(ctx, { filters: { ...EMPTY_FILTERS, category: "tablet" } });
    const group = base.facets.groups.find((g) => g.key === "connectivity")!;
    expect(group.values.map((v) => [v.value, v.count])).toEqual([
      ["cellular", 1],
      ["wifi", 1],
    ]);
    const cellular = run(ctx, {
      filters: { ...EMPTY_FILTERS, category: "tablet", selected: { connectivity: ["cellular"] } },
    });
    expect(cellular.items[0]!.variants.map((v) => v.variant.id).sort()).toEqual([
      "tm-tab:11-256-c",
      "tm-tab:13-512-c",
    ]);
  });
});

// ---- wearable: case and band ----------------------------------------------------------------------------------
const w = (id: string, a: Attrs) => variant("tm-watch", "wearable", id, a);
const watchVariants = [
  w("a", {
    case_mm: 41,
    case_material: "aluminium",
    connectivity: "gps",
    band_type: "sport",
    band_size: "sm",
    color: "silver",
    band_color: "blue",
  }),
  w("b", {
    case_mm: 41,
    case_material: "aluminium",
    connectivity: "gps",
    band_type: "sport",
    band_size: "ml",
    color: "silver",
    band_color: "blue",
  }),
  w("c", {
    case_mm: 45,
    case_material: "aluminium",
    connectivity: "gps",
    band_type: "sport",
    band_size: "ml",
    color: "silver",
    band_color: "blue",
  }),
  w("d", {
    case_mm: 45,
    case_material: "steel",
    connectivity: "cellular",
    band_type: "link",
    band_size: "one",
    color: "graphite",
    band_color: "graphite",
  }),
  w("e", {
    case_mm: 45,
    case_material: "steel",
    connectivity: "cellular",
    band_type: "sport",
    band_size: "ml",
    color: "graphite",
    band_color: "black",
  }),
];
const watchGroups = [
  "case_mm",
  "case_material",
  "connectivity",
  "color",
  "band_type",
  "band_size",
  "band_color",
];
const watchConfigs = watchVariants.map((v) => ({ id: v.id, attributes: v.attributes }));

describe("wearable case and band compatibility", () => {
  it("is valid: a watch is a list of orderable case-and-band combinations, each one its own variant", () => {
    expect(
      validate(
        withVocabulary(catalog([product("tm-watch", "wearable", "Watch", "W1")], watchVariants)),
      ).errors,
    ).toEqual([]);
  });

  it("a band size that exists only on one case size is unavailable on the other", () => {
    const withLarge = deriveConfigurator(watchConfigs, watchGroups, { case_mm: 45 });
    const size = withLarge.groups.find((g) => g.key === "band_size")!.options;
    expect(size.find((o) => o.value === "sm")!.state).toBe("unavailable");
    expect(size.find((o) => o.value === "ml")!.state).toBe("available");
    const result = selectOption(watchConfigs, { case_mm: 45 }, "band_size", "sm");
    expect(result.status).toBe("needs_reset");
    if (result.status === "needs_reset") expect(result.conflicts).toEqual(["case_mm"]);
  });

  it("a link band exists only with the steel case: choosing it over aluminium explains the conflict", () => {
    const result = selectOption(watchConfigs, { case_material: "aluminium" }, "band_type", "link");
    expect(result.status).toBe("needs_reset");
    if (result.status === "needs_reset") expect(result.conflicts).toEqual(["case_material"]);
  });

  it("never produces a combination that was not listed: the resolved variants are exactly the five", () => {
    const resolvedIds = new Set<string>();
    const values = (key: string) => [...new Set(watchVariants.map((v) => v.attributes[key]!))];
    for (const case_mm of values("case_mm"))
      for (const case_material of values("case_material"))
        for (const connectivity of values("connectivity"))
          for (const color of values("color"))
            for (const band_type of values("band_type"))
              for (const band_size of values("band_size"))
                for (const band_color of values("band_color")) {
                  const id = deriveConfigurator(watchConfigs, watchGroups, {
                    case_mm,
                    case_material,
                    connectivity,
                    color,
                    band_type,
                    band_size,
                    band_color,
                  }).resolvedVariantId;
                  if (id) resolvedIds.add(id);
                }
    expect([...resolvedIds].sort()).toEqual(watchVariants.map((v) => v.id).sort());
  });

  it("a band product states which case sizes it fits", () => {
    const band = (id: string, mm: number) =>
      variant("tm-band", "accessory", id, {
        accessory_type: "watch_band",
        fits_case_mm: mm,
        color: "blue",
      });
    const d = catalog(
      [product("tm-band", "accessory", "Band", "B1")],
      [band("41", 41), band("45", 45)],
    );
    expect(validate(withVocabulary(d)).errors).toEqual([]);
  });
});

// ---- audio ----------------------------------------------------------------------------------------------------
describe("audio variants", () => {
  const a = (id: string, attrs: Attrs) => variant("tm-buds", "audio", id, attrs);
  const buds = [
    a("black-anc-c", { type: "earbuds", color: "black", noise_control: "anc", connector: "usb_c" }),
    a("white-anc-c", { type: "earbuds", color: "white", noise_control: "anc", connector: "usb_c" }),
    a("white-none-l", {
      type: "earbuds",
      color: "white",
      noise_control: "none",
      connector: "lightning",
    }),
  ];

  it("accepts noise control and connector as optional audio attributes and offers them as filters", () => {
    const ctx = viewOf(catalog([product("tm-buds", "audio", "Buds", "B1")], buds));
    const base = run(ctx, { filters: { ...EMPTY_FILTERS, category: "audio" } });
    const keys = base.facets.groups.map((g) => g.key);
    expect(keys).toContain("noise_control");
    expect(keys).toContain("connector");
    const lightning = run(ctx, {
      filters: { ...EMPTY_FILTERS, category: "audio", selected: { connector: ["lightning"] } },
    });
    expect(lightning.items[0]!.variants.map((v) => v.variant.id)).toEqual(["tm-buds:white-none-l"]);
  });

  it("rejects an attribute that does not describe audio and a malformed value", () => {
    const bad = variant("tm-buds", "audio", "bad", {
      type: "earbuds",
      color: "black",
      case_mm: 41,
    });
    const errors = validate(
      withVocabulary(catalog([product("tm-buds", "audio", "Buds", "B1")], [...buds, bad])),
    ).errors;
    expect(errors.some((e) => e.code === "unknown_attribute" && /case_mm/.test(e.path))).toBe(true);
    const upper = variant("tm-buds", "audio", "bad2", {
      type: "earbuds",
      color: "black",
      noise_control: "Active",
    });
    const e2 = validate(
      withVocabulary(catalog([product("tm-buds", "audio", "Buds", "B1")], [upper])),
    ).errors;
    expect(e2.some((e) => e.code === "invalid_attribute")).toBe(true);
  });
});

// ---- smart home -----------------------------------------------------------------------------------------------
describe("smart-home devices and package quantities", () => {
  const tag = (id: string, qty: number) =>
    variant("tm-tag", "smart_home", id, {
      device_type: "tracker",
      package_qty: qty,
      color: "white",
    });

  it("a single unit and a four-pack are different sellable variants", () => {
    const d = catalog([product("tm-tag", "smart_home", "Tag", "G1")], [tag("1", 1), tag("4", 4)]);
    const c = build(d);
    expect(c.variants.map((v) => v.variantKey)).toEqual([
      "device_type=tracker;color=white;package_qty=1",
      "device_type=tracker;color=white;package_qty=4",
    ]);
  });

  it("the package quantity is a whole number", () => {
    const d = catalog([product("tm-tag", "smart_home", "Tag", "G1")], [tag("half", 1.5)]);
    expect(validate(withVocabulary(d)).errors.some((e) => e.code === "invalid_attribute")).toBe(
      true,
    );
  });
});

// ---- accessories and compatibility ----------------------------------------------------------------------------
describe("accessory compatibility", () => {
  const acc = (pid: string, id: string, a: Attrs) => variant(pid, "accessory", id, a);
  const products = [
    product("tm-phone", "phone", "Phoneo 1", "P1"),
    product("tm-case", "accessory", "Case", "C1", {
      compatibleWith: [
        { brand: "Hostbrand", family: "Phoneo 1", productId: "tm-phone" },
        { brand: "Hostbrand", family: "Phoneo 2" },
      ],
    }),
    product("tm-cable", "accessory", "Cable", "K1", {
      compatibleWith: [{ brand: "Hostbrand", family: "Phoneo 2" }],
    }),
    product("tm-stand", "accessory", "Stand", "S1"), // compatibility not stated: unknown, never "universal"
  ];
  const variants = [
    variant("tm-phone", "phone", "128-black", { storage_gb: 128, color: "black" }),
    variant("tm-phone", "phone", "256-black", { storage_gb: 256, color: "black" }),
    acc("tm-case", "black", { accessory_type: "case", color: "black" }),
    acc("tm-case", "blue", { accessory_type: "case", color: "blue" }),
    acc("tm-cable", "1m", {
      accessory_type: "cable",
      connector: "usb_c",
      length_cm: 100,
      power_w: 60,
    }),
    acc("tm-stand", "grey", { accessory_type: "stand", color: "grey" }),
  ];
  const ctx = () => viewOf(catalog(products, variants));

  it("validates compatibility references: a known product, never itself, never an unknown id", () => {
    expect(validate(withVocabulary(catalog(products, variants))).errors).toEqual([]);
    const unknown = products.map((p) =>
      p.id === "tm-case"
        ? { ...p, compatibleWith: [{ brand: "H", family: "F", productId: "tm-nope" }] }
        : p,
    );
    expect(
      validate(withVocabulary(catalog(unknown, variants))).errors.map((e) => e.code),
    ).toContain("unknown_reference");
    const self = products.map((p) =>
      p.id === "tm-case"
        ? { ...p, compatibleWith: [{ brand: "H", family: "F", productId: "tm-case" }] }
        : p,
    );
    expect(
      validate(withVocabulary(catalog(self, variants))).errors.some((e) =>
        /not compatible with itself/.test(e.message),
      ),
    ).toBe(true);
  });

  it("compatibility is a multi-valued filter over the host families an accessory works with", () => {
    const c = ctx();
    const base = run(c, { filters: { ...EMPTY_FILTERS, category: "accessory" } });
    const group = base.facets.groups.find((g) => g.key === "compatibility")!;
    expect(group.values.map((v) => [v.value, v.count])).toEqual([
      ["Phoneo 1", 1],
      ["Phoneo 2", 2],
    ]);
    const one = run(c, {
      filters: {
        ...EMPTY_FILTERS,
        category: "accessory",
        selected: { compatibility: ["Phoneo 1"] },
      },
    });
    expect(one.items.map((i) => i.product.product.id)).toEqual(["tm-case"]);
    const two = run(c, {
      filters: {
        ...EMPTY_FILTERS,
        category: "accessory",
        selected: { compatibility: ["Phoneo 2"] },
      },
    });
    expect(two.items.map((i) => i.product.product.id).sort()).toEqual(["tm-cable", "tm-case"]);
  });

  it("an accessory with no stated compatibility never matches a compatibility filter", () => {
    const filtered = run(ctx(), {
      filters: {
        ...EMPTY_FILTERS,
        category: "accessory",
        selected: { compatibility: ["Phoneo 1", "Phoneo 2"] },
      },
    });
    expect(filtered.items.map((i) => i.product.product.id)).not.toContain("tm-stand");
  });

  it("the compatibility filter survives the URL round trip", () => {
    const state: DiscoveryState = {
      ...EMPTY_DISCOVERY,
      filters: {
        ...EMPTY_FILTERS,
        category: "accessory",
        selected: { compatibility: ["Phoneo 2"] },
      },
    };
    const qs = serializeDiscoveryState(state);
    expect(qs).toContain("compatibility=Phoneo");
    expect(parseDiscoveryState(new URLSearchParams(qs)).filters.selected.compatibility).toEqual([
      "Phoneo 2",
    ]);
  });

  it("search finds an accessory by the host it fits, and by its category words", () => {
    const c = ctx();
    expect(run(c, { q: "phoneo 2" }).items.map((i) => i.product.product.id)).toEqual(
      expect.arrayContaining(["tm-case", "tm-cable"]),
    );
    const byCategory = run(c, { q: "phu kien" });
    expect(byCategory.items.every((i) => i.product.product.category === "accessory")).toBe(true);
    expect(byCategory.items.map((i) => i.product.product.id)).toContain("tm-stand");
  });

  it("rejects an accessory attribute that is not whole or not an attribute of accessories", () => {
    const bad = (a: Attrs) =>
      validate(
        withVocabulary(
          catalog(products, [
            ...variants,
            acc("tm-stand", "bad", { accessory_type: "stand", ...a }),
          ]),
        ),
      ).errors.map((e) => e.code);
    expect(bad({ length_cm: 99.5 })).toContain("invalid_attribute");
    expect(bad({ ram_gb: 8 })).toContain("unknown_attribute");
    const missing = validate(
      withVocabulary(catalog(products, [...variants, acc("tm-stand", "bad2", { color: "grey" })])),
    ).errors.map((e) => e.code);
    expect(missing).toContain("missing_attribute");
  });
});

// ---- unknowns: prices and image rights ------------------------------------------------------------------------
describe("unknown prices and unknown image rights stay unknown", () => {
  const products = [product("tm-tab", "tablet", "Tab", "T1")];
  const asset = (rights: MediaAsset["rights"], id = "m1"): MediaAsset => ({
    id,
    productId: "tm-tab",
    kind: "photo",
    file: "img/tm-tab.jpg",
    altVi: "Ảnh thử nghiệm",
    width: 800,
    height: 600,
    rights,
  });

  it("a variant with no price is unpriced, has no reference price, and never counts as zero", () => {
    const view = buildCatalogView(
      build(catalog(products, tabletVariants, (i) => (i === 0 ? null : 20_000_000))),
      NOW,
    );
    const p = view.products[0]!;
    expect(p.variants[0]!.status).toBe("unpriced");
    expect(p.variants[0]!.best).toBeNull();
    expect(p.startingPrice!.amountMinor).toBe(20_000_000);
    const allUnpriced = buildCatalogView(build(catalog(products, tabletVariants, () => null)), NOW)
      .products[0]!;
    expect(allUnpriced.startingPrice).toBeNull();
    expect(allUnpriced.pricedVariantCount).toBe(0);
  });

  it("an image whose rights are pending or not cleared is never shown; a cleared one needs its basis and evidence", () => {
    const cases: [string, MediaAsset["rights"]][] = [
      ["pending", { status: "PENDING" }],
      ["not cleared", { status: "NOT_CLEARED", restrictions: "no permission" }],
    ];
    for (const [, rights] of cases) {
      const view = buildCatalogView(
        build(catalog(products, tabletVariants, undefined, { media: [asset(rights)] })),
        NOW,
      );
      expect(view.products[0]!.images).toEqual([]);
    }
    const noBasis = validate(
      withVocabulary(
        catalog(products, tabletVariants, undefined, { media: [asset({ status: "CLEARED" })] }),
      ),
    );
    expect(noBasis.ok).toBe(false);
    const cleared = buildCatalogView(
      build(
        catalog(products, tabletVariants, undefined, {
          media: [
            asset({
              status: "CLEARED",
              basis: "written_permission",
              evidence: "grant ref 1, 2026-10-30",
            }),
          ],
        }),
      ),
      NOW,
    );
    expect(cleared.products[0]!.images).toHaveLength(1);
  });
});

// ---- duplicate identity ---------------------------------------------------------------------------------------
describe("duplicate detection", () => {
  it("two records for the same manufacturer, family and model are refused, whatever the case or accents", () => {
    const a = product("tm-one", "tablet", "Tab", "T1");
    const b = { ...product("tm-two", "tablet", "TAB", "t1"), brand: "TESTMARK" };
    const d = catalog(
      [a, b],
      [
        variant("tm-one", "tablet", "x", { screen_in: 11, storage_gb: 128 }),
        variant("tm-two", "tablet", "x", { screen_in: 11, storage_gb: 128 }),
      ],
    );
    expect(validate(d).errors.map((e) => e.code)).toContain("duplicate_product_identity");
  });
});

describe("URL state for the new filters", () => {
  const parse = (qs: string) => parseDiscoveryState(new URLSearchParams(qs)).filters.selected;

  it("numeric filters of the new categories round-trip as numbers, so they match numeric attributes", () => {
    expect(parse("category=wearable&case_mm=45")).toEqual({ case_mm: [45] });
    expect(parse("category=tablet&screen_in=11&storage_gb=256")).toEqual({
      screen_in: [11],
      storage_gb: [256],
    });
  });

  it("brand and compatibility values keep their capitals and spaces", () => {
    expect(parse("category=accessory&brand=Testmark&compatibility=Phoneo+2")).toEqual({
      brand: ["Testmark"],
      compatibility: ["Phoneo 2"],
    });
  });

  it("hostile or oversized values are ignored, never echoed", () => {
    expect(
      parse(
        "category=accessory&compatibility=%3Cscript%3Ealert(1)%3C%2Fscript%3E&brand=%22%3E%3Cimg%3E",
      ),
    ).toEqual({});
    expect(parse(`category=accessory&compatibility=${"x".repeat(200)}`)).toEqual({});
    expect(parse("category=wearable&case_mm=<b>")).toEqual({});
  });
});
