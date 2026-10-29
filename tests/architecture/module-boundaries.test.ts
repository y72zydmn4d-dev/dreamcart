import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Modular-monolith contract (docs/ARCHITECTURE.md section 2): a module imports another module only through
 * its public `index.ts`. ESLint enforces this while editing; this test enforces it in CI. `shared` is the
 * shared kernel and may be imported directly.
 */
const root = join(process.cwd(), "src", "modules");
const moduleNames = readdirSync(root).filter((n) => statSync(join(root, n)).isDirectory());

export function deepImportsOfOtherModules(source: string, self: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(
    /(?:from|import\()\s*["']@\/modules\/([^/"']+)\/([^"']+)["']/g,
  )) {
    const [, name, rest] = match;
    if (name !== self && name !== "shared") found.push(`${name}/${rest}`);
  }
  return found;
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });
}

describe("module boundary detector", () => {
  it("flags deep imports of another module and allows indexes, own internals and shared", () => {
    expect(
      deepImportsOfOtherModules('import { a } from "@/modules/cart/domain/cart";', "orders"),
    ).toEqual(["cart/domain/cart"]);
    expect(deepImportsOfOtherModules('import { a } from "@/modules/cart";', "orders")).toEqual([]);
    expect(
      deepImportsOfOtherModules('import { a } from "@/modules/orders/domain/x";', "orders"),
    ).toEqual([]);
    expect(
      deepImportsOfOtherModules('import { a } from "@/modules/shared/domain/money";', "orders"),
    ).toEqual([]);
  });
});

describe("modules respect each other's public API", () => {
  it("has modules to check", () => {
    expect(moduleNames).toEqual(
      expect.arrayContaining([
        "cart",
        "orders",
        "pricing",
        "search",
        "catalog",
        "configurator",
        "shared",
      ]),
    );
  });

  it.each(moduleNames.filter((m) => m !== "shared"))(
    "%s exposes an index.ts and imports others only via their index",
    (name) => {
      expect(statSync(join(root, name, "index.ts")).isFile()).toBe(true);
      const violations = files(join(root, name)).flatMap((file) =>
        deepImportsOfOtherModules(readFileSync(file, "utf8"), name).map(
          (v) => `${relative(root, file).split(sep).join("/")}: ${v}`,
        ),
      );
      expect(violations).toEqual([]);
    },
  );
});
