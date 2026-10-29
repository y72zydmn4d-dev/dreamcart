import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the design tokens in src/app/globals.css: WCAG 2.2 AA contrast for every text/background
 * pair the components use, in both themes, plus the accessibility rules the shell depends on.
 */
const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map((m) => [m[1], m[2]]),
  );
}

const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const light = tokens(css.slice(css.indexOf(":root"), darkStart));
const dark = tokens(css.slice(darkStart, css.indexOf("@theme inline")));

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "surface"],
  ["muted-foreground", "muted"],
  ["accent", "background"],
  ["accent-foreground", "accent"],
  ["accent-soft-foreground", "accent-soft"],
  ["destructive-foreground", "destructive"],
  ["simulation-foreground", "simulation"],
];

describe("contrast helper", () => {
  it("matches known WCAG values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme tokens", (_name, theme) => {
  it.each(TEXT_PAIRS)("%s on %s has at least 4.5:1 contrast (AA text)", (fg, bg) => {
    expect(theme[fg], `missing --${fg}`).toBeDefined();
    expect(theme[bg], `missing --${bg}`).toBeDefined();
    expect(contrast(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("has a focus ring with at least 3:1 contrast against the page (AA non-text)", () => {
    expect(contrast(theme["ring"]!, theme["background"]!)).toBeGreaterThanOrEqual(3);
  });
});

describe("token coverage and accessibility rules", () => {
  it("defines every light token in the dark theme too", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("keeps a visible focus style and honors reduced motion", () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ring\)/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses a system font stack only, with no remote font loading", () => {
    expect(css).not.toMatch(/@import\s+url\(/);
    expect(css).not.toMatch(/https?:\/\//);
  });
});
