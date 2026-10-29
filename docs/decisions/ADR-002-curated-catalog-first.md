# ADR-002: Repository-hosted curated catalog first

**Status:** Proposed (owner direction D1, D3, D5 recorded)
**Date:** 2026-10-29

## Context
Marketplace APIs are gated by programs, partner approval, or terms that forbid caching (see `PRODUCT_SOURCE_MATRIX.md`). The simulator needs persistent snapshots and lawful images.

## Decision
The MVP catalog is a set of validated data files in the repository, curated by a human from sources whose terms are recorded. Categories: laptops/computers, smartphones, headphones/audio. About 20 verified products first, growing with data. Every price carries provenance and an observation time; every image carries a rights record. Test fixtures (`fx-` ids) are separate and rejected in production builds.

## Alternatives
- Live provider API in the MVP: blocked by access and caching terms; cost and quota risk.
- Database-hosted catalog (Supabase): adds a paused-project failure mode and a write surface for no MVP benefit.

## Consequences
- (+) Lawful by construction, free to host, fast, deterministic, easy to test.
- (−) Manual effort; prices go stale and need manual re-verification (14-day warning, 90-day cutoff).
- (−) Catalog changes need a pull request.

## Open items
Owner confirms that a person's manual recording of a visible price is an acceptable basis for a price snapshot. Blockers B1 and B2 in `PHASE1_ENTRY_CRITERIA.md`.
