import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Domain code is pure TypeScript (docs/ARCHITECTURE.md section 2). ESLint enforces this while editing;
 * this test enforces it in CI and proves the detector works on known-bad input.
 */
const FORBIDDEN_IMPORT = /^(react|react-dom|next)(\/|$)|^@\/(components|app|platform|config)(\/|$)/;
const FORBIDDEN_USAGE =
  /\b(window|document|localStorage|sessionStorage|indexedDB)\b|Date\.now\(|Math\.random\(/;

export function findViolations(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const found: string[] = [];
  for (const match of code.matchAll(
    /(?:from|import\()\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g,
  )) {
    const specifier = match[1] ?? match[2] ?? "";
    if (FORBIDDEN_IMPORT.test(specifier)) found.push(`import ${specifier}`);
  }
  const usage = FORBIDDEN_USAGE.exec(code);
  if (usage) found.push(`usage ${usage[0]}`);
  return found;
}

function domainFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return domainFiles(path);
    const inDomain = path.split(sep).includes("domain");
    return inDomain && path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

describe("violation detector", () => {
  it.each([
    ['import { useState } from "react";', "import react"],
    ['import Link from "next/link";', "import next/link"],
    ['import { t } from "@/platform/i18n";', "import @/platform/i18n"],
    ['import { Button } from "@/components/ui/button";', "import @/components/ui/button"],
    ['const m = await import("react-dom/client");', "import react-dom/client"],
    ["const id = Math.random();", "usage Math.random("],
    ["const now = Date.now();", "usage Date.now("],
    ["localStorage.setItem('a','b');", "usage localStorage"],
  ])("flags %s", (source, expected) => {
    expect(findViolations(source)).toContain(expected);
  });

  it("ignores comments and unrelated imports", () => {
    expect(findViolations('// import x from "react"\nimport { a } from "./local";')).toEqual([]);
    expect(findViolations('/* window */ import { b } from "zod";')).toEqual([]);
  });
});

describe("domain purity", () => {
  const root = join(process.cwd(), "src", "modules");
  const files = domainFiles(root);

  it("finds the domain files it is meant to check", () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it("has no framework, UI, infrastructure, browser, clock, or randomness dependencies", () => {
    for (const file of files) {
      expect(findViolations(readFileSync(file, "utf8")), relative(process.cwd(), file)).toEqual([]);
    }
  });
});
