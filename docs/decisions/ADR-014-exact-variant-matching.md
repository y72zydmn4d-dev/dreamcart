# ADR-014: Deterministic exact-variant matching

**Status:** Proposed
**Date:** 2026-10-29

## Decision
Explicit attributes in a query are hard constraints applied before any ranking. Missing attribute values mean unknown, never matched. Results are classified `match`, `ambiguous`, or `near` with machine-readable reasons, and the UI never preselects a different variant. Rules and 30 fixtures are in `docs/SEARCH_FIXTURES.md` and `fixtures/search/`. No AI or embeddings.

## Alternatives
- Fuzzy or semantic ranking over everything: can present a near variant as exact, which the Blueprint forbids.

## Consequences
Behavior is predictable and unit-testable. Grammar grows per category through attribute vocabularies; non-adjacent labels, ranges, and negations are out of scope for the MVP.
