import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "./security-headers";

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

describe("Content-Security-Policy", () => {
  it("matches the reviewed production policy exactly, so any weakening is a visible diff", () => {
    expect(buildContentSecurityPolicy({ isDev: false })).toBe(PRODUCTION_CSP);
  });

  it("is self-contained: no wildcard and no third-party origin in production", () => {
    const csp = buildContentSecurityPolicy({ isDev: false });
    expect(csp).not.toMatch(/\*/);
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("blocks plugins, framing, and base-tag or form hijacking in every mode", () => {
    for (const isDev of [true, false]) {
      const csp = buildContentSecurityPolicy({ isDev });
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    }
  });

  it("allows eval and the hot-reload websocket only in development", () => {
    const dev = buildContentSecurityPolicy({ isDev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
  });
});

describe("security headers", () => {
  const headers = buildSecurityHeaders({ isDev: false });
  const byKey = new Map(headers.map((h) => [h.key, h.value]));

  it("has no duplicate header names", () => {
    expect(byKey.size).toBe(headers.length);
  });

  it("sets the baseline set", () => {
    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(byKey.get("Content-Security-Policy")).toBe(PRODUCTION_CSP);
  });

  it("denies powerful browser features, including the Payment Request API", () => {
    const policy = byKey.get("Permissions-Policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
      expect(policy).toContain(`${feature}=()`);
    }
  });
});
