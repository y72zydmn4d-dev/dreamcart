import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Standing guards for the 'unsafe-inline' CSP tradeoff (ADR-011): the app must never create an HTML or code
 * injection path of its own. These are source-level checks, cheap enough to run on every build.
 */
const ROOT = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(ROOT).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, "utf8"),
}));

const FORBIDDEN: readonly [string, RegExp][] = [
  ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
  ["innerHTML / outerHTML assignment", /\.(inner|outer)HTML\s*=/],
  ["insertAdjacentHTML", /insertAdjacentHTML/],
  ["document.write", /document\.write\s*\(/],
  ["eval", /(^|[^.\w])eval\s*\(/],
  ["Function constructor", /new\s+Function\s*\(/],
  ["string timers", /set(Timeout|Interval)\s*\(\s*["'`]/],
];

describe("code hygiene", () => {
  it.each(FORBIDDEN)("source never uses %s", (_name, pattern) => {
    const hits = files.filter((f) => pattern.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("only the URL validator knows the word javascript: (as the scheme it rejects)", () => {
    const hits = files
      .filter((f) => /javascript:/i.test(f.text))
      .map((f) => f.path)
      .filter((p) => !p.endsWith("safe-url.ts"));
    expect(hits).toEqual([]);
  });

  it("every external link opens with noopener and noreferrer", () => {
    const blank = files.filter((f) => /target="_blank"/.test(f.text));
    expect(blank.length).toBeGreaterThan(0);
    for (const f of blank) {
      expect(f.text, f.path).toMatch(/rel="[^"]*noopener[^"]*noreferrer[^"]*"/);
    }
  });

  it("no source file reads or embeds a secret-looking value", () => {
    const hits = files
      .filter((f) =>
        /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i.test(f.text),
      )
      .map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("environment variables are read only through the release flag (and Vercel's own VERCEL_ENV, in one place)", () => {
    const hits = files
      .filter((f) =>
        /process\.env\.(?!NODE_ENV\b|NEXT_PUBLIC_DREAMCART_RELEASE\b|NEXT_TELEMETRY_DISABLED\b|VERCEL_ENV\b)/.test(
          f.text,
        ),
      )
      .map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("VERCEL_ENV (a system variable, no secret) is read only by the catalog activation gate", () => {
    // It keeps the staged catalog out of production deployments; nothing else may branch on the deployment target.
    const hits = files.filter((f) => /process\.env\.VERCEL_ENV\b/.test(f.text)).map((f) => f.path);
    expect(hits.map((p) => p.replace(/\\/g, "/"))).toEqual(["platform/catalog/index.ts"]);
  });
});
