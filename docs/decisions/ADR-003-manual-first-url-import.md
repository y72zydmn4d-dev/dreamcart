# ADR-003: Manual-first URL import; automated extraction stays on the roadmap

**Status:** Accepted (owner decision D6; promoted per P-8; 2026-10-29)
**Date:** 2026-10-29

## Context
Fetching arbitrary product URLs raises SSRF, terms-of-use, and image-rights problems. Retailer terms and robots rules for Vietnamese retailers are unknown (no evidence found).

## Decision
MVP import validates and normalizes URLs on the client (http/https only, no credentials, tracking parameters stripped) and lets the user complete title, attributes, price, and currency manually. Source URL and provenance are preserved; all fields are labeled unverified. Imported items are private, local, and never added to the shared catalog. No server-side fetch of arbitrary URLs and no remote images from imports.

**Automated metadata extraction from explicitly authorized sources remains a future Product Discovery capability.** It would be introduced through a new ADR covering approved hosts, a vetted parser per host, redirects disabled, connection-time IP validation (DNS-rebinding protection), timeouts, size limits, and rate limits.

## Alternatives
- Server-side scraping now: unauthorized-scraping rule, large security surface.
- Browser-side fetch: blocked by cross-origin rules and still a terms question.

## Consequences
(+) No SSRF surface. (−) More typing for the user; some users may find it tedious.
