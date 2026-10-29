import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { t } from "@/platform/i18n";
import { NAV_ITEMS } from "./site";

describe("primary navigation", () => {
  it("links only to routes that have a page, so navigation can never dead-end", () => {
    for (const item of NAV_ITEMS) {
      const page = join(process.cwd(), "src", "app", item.href, "page.tsx");
      expect(existsSync(page), `${item.href} -> ${page}`).toBe(true);
    }
  });

  it("has unique targets and a Vietnamese label for each", () => {
    expect(new Set(NAV_ITEMS.map((i) => i.href)).size).toBe(NAV_ITEMS.length);
    for (const item of NAV_ITEMS) {
      expect(t(item.labelKey).length).toBeGreaterThan(0);
    }
  });

  it("does not expose checkout directly: it is reached from the cart", () => {
    expect(NAV_ITEMS.map((i) => i.href)).not.toContain("/checkout");
  });
});
