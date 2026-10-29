# ADR-002: Repository-hosted curated catalog first

**Status:** Proposed (owner direction D1, D3, D5 recorded)
**Date:** 2026-10-29

## Context
Marketplace APIs are gated by programs, partner approval, or terms that forbid caching (see `PRODUCT_SOURCE_MATRIX.md`). The simulator needs persistent snapshots and lawful images.

## Decision
The MVP catalog is a set of validated data files in the repository, curated by a human from sources whose terms are recorded. Premium-first, about 20–30 verified products in laptops/computers, smartphones, headphones/audio, growing with data availability. Every price carries provenance and an observation time; every image carries a rights record; titles and summaries are written by the curator, not copied. Test fixtures (`fx-` ids) are separate and rejected in production builds.

## Alternatives
- Live provider API in the MVP: blocked by access and caching terms; cost and quota risk.
- Database-hosted catalog (Supabase): adds a paused-project failure mode and a write surface for no MVP benefit.

## Consequences
- (+) Lowest-risk path: avoids provider access and caching terms; free to host, fast, deterministic, easy to test.
- (−) **Not a cleared path.** Lawfulness still depends on source terms for recording prices, image rights per asset, and original text. None has been legally reviewed or demonstrated (see `PRODUCT_SOURCE_MATRIX.md`).
- (−) Manual effort; prices age and need manual re-verification (freshness policy decided in P-1: labeled, not blocked).
- (−) Catalog changes need a pull request.

## Open items
Decision P-3: manually observed prices, each with provenance and an observation timestamp, are acceptable for private development and pilot testing. That is **not** legal clearance for unrestricted redistribution or public deployment, so this ADR stays Proposed until RT-5 (source terms, image rights) is done. Blockers B1 and B2 in `PHASE1_ENTRY_CRITERIA.md`.
