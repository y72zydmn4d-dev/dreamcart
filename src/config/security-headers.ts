/**
 * Baseline HTTP security headers (ADR-011).
 *
 * CSP decision, verified against the pinned Next.js in Phase 1: pages are statically prerendered,
 * and the framework emits inline bootstrap scripts that carry no per-request nonce. A nonce would
 * force every page into dynamic rendering, which this app does not need. So `script-src` allows
 * `'unsafe-inline'` and the rest of the policy is strict. See docs/decisions/ADR-011.
 */

export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

interface Options {
  /** Development needs eval-based source maps and a hot-reload websocket. */
  readonly isDev: boolean;
}

export function buildContentSecurityPolicy({ isDev }: Options): string {
  const directives: Record<string, readonly string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

export function buildSecurityHeaders(options: Options): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];
}
