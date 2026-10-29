# ADR-011: Static prerendering and a CSP fitted to it

**Status:** Proposed (owner direction in section 4 of the Phase 0 authorization)
**Date:** 2026-10-29

## Context
Catalog content is static; cart state is client-side. Per search summaries of the Next.js documentation (not read directly in Phase 0), per-request nonces require dynamic rendering, which would give up static caching without a corresponding security need here. A reported alternative is hash-based integrity (experimental, webpack-only).

## Decision
Prerender catalog pages at build; keep interactive state in client components. Do **not** adopt dynamic rendering solely for nonce-based CSP. Use a strict policy for everything except inline script handling, and let a Phase 1 spike choose between (A) hash-based allowance and (B) `script-src 'self' 'unsafe-inline'`, recording the result and justification. See `ARCHITECTURE.md` §7 for the directive list.

## Rationale for accepting B if needed
No user-generated HTML, no server-rendered untrusted content, React escapes output, `connect-src 'self'` and `img-src 'self' data: blob:` block exfiltration and third-party loads, `object-src 'none'` and `frame-ancestors 'none'` are set.

## Consequences
(+) Fast, cheap, cacheable. (−) Weaker script CSP if B is chosen; revisit if user-generated content or accounts arrive.
