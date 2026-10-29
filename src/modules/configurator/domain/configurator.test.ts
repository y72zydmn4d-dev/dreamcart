import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearGroup,
  deriveConfigurator,
  selectOption,
  type ConfigVariant,
  type Selection,
} from "./configurator";

/** The Phase 0 conformance fixtures are the contract for this module. */
const load = (path: string) => JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
const catalog = load("fixtures/search/fixture-catalog.json") as {
  products: { id: string; category: string; variants: ConfigVariant[] }[];
};
const { cases } = load("fixtures/configurator/cases.json") as {
  cases: {
    id: string;
    product: string;
    selection: Selection;
    select?: { attr: string; value: string | number };
    expected: Record<string, unknown>;
  }[];
};
const GROUPS: Record<string, string[]> = {
  laptop: ["screen_in", "chip", "ram_gb", "storage_gb"],
  phone: ["storage_gb", "color"],
  audio: ["color"],
};

describe("configurator conformance (fixtures/configurator/cases.json)", () => {
  it.each(cases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const product = catalog.products.find((p) => p.id === c.product)!;
    if (c.select) {
      const result = selectOption(product.variants, c.selection, c.select.attr, c.select.value);
      const { status, selection } = result;
      const conflicts = result.status === "needs_reset" ? result.conflicts : undefined;
      expect(conflicts ? { status, conflicts, selection } : { status, selection }).toEqual(
        c.expected,
      );
      return;
    }
    const view = deriveConfigurator(product.variants, GROUPS[product.category]!, c.selection);
    const options = Object.fromEntries(
      view.groups.map((g) => [
        g.key,
        Object.fromEntries(g.options.map((o) => [String(o.value), o.state])),
      ]),
    );
    expect({ options, resolved: view.resolvedVariantId, missing: view.missing }).toEqual(
      c.expected,
    );
  });
});

describe("configurator behavior beyond the fixtures", () => {
  const aero = catalog.products.find((p) => p.id === "fx-aero")!.variants;
  const groups = GROUPS.laptop!;

  it("names the conflicting group for each unavailable option", () => {
    const view = deriveConfigurator(aero, groups, { screen_in: 13 });
    const ram32 = view.groups.find((g) => g.key === "ram_gb")!.options.find((o) => o.value === 32)!;
    expect(ram32).toEqual({ value: 32, state: "unavailable", conflicts: ["screen_in"] });
  });

  it("offers an explicit reset that keeps unrelated choices", () => {
    const result = selectOption(aero, { screen_in: 13, ram_gb: 16 }, "chip", "fx1");
    expect(result.status).toBe("ok");
    const conflict = selectOption(aero, { screen_in: 15, ram_gb: 16 }, "chip", "fx1");
    expect(conflict).toMatchObject({
      status: "needs_reset",
      conflicts: ["screen_in"],
      selection: { screen_in: 15, ram_gb: 16 },
      selectionIfReset: { ram_gb: 16, chip: "fx1" },
    });
  });

  it("keeps the matching variants honest for price ranges", () => {
    const view = deriveConfigurator(aero, groups, { screen_in: 13 });
    expect(view.matchingVariantIds).toEqual([
      "fx-aero:13-fx1-8-256",
      "fx-aero:13-fx1-16-512",
      "fx-aero:13-fx2-16-512",
    ]);
  });

  it("never resolves a variant whose required attribute is missing", () => {
    const titan = catalog.products.find((p) => p.id === "fx-titan")!.variants;
    const view = deriveConfigurator(titan, groups, { screen_in: 16, chip: "fx2", ram_gb: 32 });
    expect(view.missing).toEqual(["storage_gb"]);
    expect(view.resolvedVariantId).toBeNull();
  });

  it("clears a group without touching the others", () => {
    expect(clearGroup({ screen_in: 13, chip: "fx2" }, "chip")).toEqual({ screen_in: 13 });
  });
});
