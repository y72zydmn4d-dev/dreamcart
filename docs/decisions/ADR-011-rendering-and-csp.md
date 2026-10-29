# ADR-011: Static prerendering and a CSP fitted to it

**Status:** Accepted (verified in Phase 1 against Next.js 16.4.3 in Chromium; owner direction in the Phase 0 authorization; 2026-10-29)
**Date:** 2026-10-29

## Context

Catalog content is static and cart state is client-side. A per-request nonce would force every page into dynamic rendering, giving up static caching without a matching need. The framework documentation could not be read in Phase 0, so the policy was verified empirically against the pinned version in Phase 1.

## Decision

Prerender pages at build; keep interactive state in client components. Do **not** adopt dynamic rendering solely for nonce-based CSP. Ship this production policy (`src/config/security-headers.ts`, pinned exactly by a test):

`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`

Development additionally allows `'unsafe-eval'` and websockets for hot reload. Companion headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` denying camera, microphone, geolocation, payment and USB, and `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy: same-origin`. HSTS is left to the host.

## Evidence (Chromium, `next start`)

- With the shipped policy: zero CSP violations, zero console errors, client-side navigation works (hydration intact), no third-party requests.
- Control with `script-src 'self'` only: three inline Next.js bootstrap scripts are blocked and hydration fails (navigation falls back to a full page load).
- Control with experimental Subresource Integrity (`experimental.sri`, sha256) and a strict `script-src 'self'; style-src 'self'`: integrity attributes were added to the external script files, but the same three inline scripts were still blocked and hydration still failed. The Next.js guide (bundled in `node_modules/next/dist/docs`) presents SRI as a way to keep a strict CSP with static pages; that did not hold for this static build.
- A hash allowlist is not workable with static headers: the inline scripts include per-page framework payload, so their hashes differ for every page. The same guide's non-nonce example also uses `'self' 'unsafe-inline'`, and states that nonces require dynamic rendering of all pages.

## Tradeoffs

`'unsafe-inline'` weakens script injection mitigation. It is accepted because there is no user-generated HTML and no server-rendered untrusted content, React escapes output, every user-supplied link must pass `SafeUrl` (`javascript:` is rejected), and the remaining directives block framing, plugins, base-tag and form hijacking, and any third-party connection or image. Revisit if accounts, user-generated content, or framework support for static hashes or nonces change this.
