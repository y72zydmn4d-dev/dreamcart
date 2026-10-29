# ADR-004: External providers are documented research candidates

**Status:** Proposed (owner direction in Phase 0 authorization)
**Date:** 2026-10-29

## Context
The owner rejected the conclusion that every external provider is impossible. Each provider must be judged on six separate questions: technical capability, access and authentication, licensing, fit with a virtual-shopping model, caching/snapshot/image permissions, and phase suitability. The Phase 0 research could not read primary terms (network allowlist), so most answers are UNKNOWN.

## Decision
Keep Shopify Global Catalog and the other providers in `PRODUCT_SOURCE_MATRIX.md` as research candidates. Do not integrate any provider until its use is demonstrated to be permitted by primary-source terms, with clause, URL, and date recorded. Provider work never blocks the curated-catalog MVP. A provider that forbids persistence may later be explored in a reference-only mode (store an identifier, re-resolve live, keep no copies) only after written confirmation.

## Alternatives
- Abandon providers: contradicts owner direction and loses the long-term discovery path.
- Integrate a provider speculatively: violates the licensing rules.

## Consequences
Research tasks R1–R5 remain open. The provider interface is not built until a second source exists (avoids speculative abstraction); the `Provenance` model is built now.
