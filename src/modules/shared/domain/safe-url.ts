declare const safeUrlBrand: unique symbol;

/** An absolute http(s) URL that has passed `parseSafeUrl`. Only this type may become an `href`. */
export type SafeUrl = string & { readonly [safeUrlBrand]: true };

export type SafeUrlFailure =
  "empty" | "too_long" | "invalid" | "unsupported_scheme" | "has_credentials";

export type SafeUrlResult =
  | { readonly ok: true; readonly url: SafeUrl; readonly removedParams: readonly string[] }
  | { readonly ok: false; readonly reason: SafeUrlFailure };

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^dclid$/i,
  /^msclkid$/i,
  /^igshid$/i,
  /^mc_eid$/i,
  /^mc_cid$/i,
];

/**
 * Parse untrusted text into a SafeUrl: http or https only, no embedded credentials, bounded length,
 * and well-known tracking parameters removed. Never fetches anything. Used for user-entered source
 * links (Phase 7) and to re-validate every stored URL before rendering it (ARCHITECTURE section 5).
 */
export function parseSafeUrl(input: string): SafeUrlResult {
  const text = input.trim();
  if (text === "") return { ok: false, reason: "empty" };
  if (text.length > MAX_URL_LENGTH) return { ok: false, reason: "too_long" };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return { ok: false, reason: "unsupported_scheme" };
  if (url.username !== "" || url.password !== "") return { ok: false, reason: "has_credentials" };

  const removedParams: string[] = [];
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM_PATTERNS.some((pattern) => pattern.test(name))) {
      removedParams.push(name);
      url.searchParams.delete(name);
    }
  }

  return { ok: true, url: url.href as SafeUrl, removedParams };
}

/** Render-time guard: the URL if it is safe, otherwise null. */
export function toSafeHref(input: string): SafeUrl | null {
  const result = parseSafeUrl(input);
  return result.ok ? result.url : null;
}
