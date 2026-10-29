import { describe, expect, it } from "vitest";
import { t, type DictionaryKey } from "./index";
import { vi } from "./vi";

function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leaves(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("Vietnamese dictionary", () => {
  it("keeps the required simulation disclosure word for word", () => {
    // PRD section 2, principle 1. Changing this copy is a product decision, not a refactor.
    expect(t("simulation.notice")).toBe(
      "Mô phỏng — không thanh toán, không đặt hàng, không giao hàng thật.",
    );
  });

  it("has no empty strings and resolves every key through t()", () => {
    const entries = leaves(vi);
    expect(entries.length).toBeGreaterThan(40);
    for (const [key, value] of entries) {
      expect(value.trim(), key).not.toBe("");
      // Placeholders need params; supply a dummy for each so resolution itself is what is tested.
      const params = Object.fromEntries(
        [...value.matchAll(/\{(\w+)\}/g)].map((m) => [m[1] as string, "x"]),
      );
      expect(() => t(key as DictionaryKey, params), key).not.toThrow();
    }
  });

  it("fills placeholders and escapes nothing silently", () => {
    expect(t("pages.product.idLabel", { id: "abc-1" })).toBe("Mã sản phẩm: abc-1");
    expect(t("placeholder.body", { phase: "8–9" })).toContain("Giai đoạn 8–9");
  });

  it("fails loudly on a missing parameter or key instead of rendering a broken string", () => {
    expect(() => t("pages.product.idLabel")).toThrow(/Missing parameter "id"/);
    expect(() => t("nav.nope" as DictionaryKey)).toThrow(/Missing dictionary key/);
    expect(() => t("nav" as DictionaryKey)).toThrow(/Missing dictionary key/);
  });

  it("never claims a real purchase, payment, or delivery in positive terms", () => {
    // Guardrail for the non-negotiable rule: copy may negate these, never promise them.
    const risky =
      /(thanh toán thành công|đặt hàng thành công|đã giao thành công|đang giao đến bạn)/i;
    for (const [key, value] of leaves(vi)) {
      expect(value, key).not.toMatch(risky);
    }
  });
});
