# ADR-013: Integer money, VND checkout, no conversion, derived price states

**Status:** Proposed (owner direction D4 recorded)
**Date:** 2026-10-29

## Decision
Money is stored as integer minor units with an ISO 4217 exponent table (VND exponent 0). Checkout currency for the MVP is VND. Original currency and provenance from sources are preserved; there is no exchange-rate conversion, and carts are single-currency. Price states (`OBSERVED`, `STALE`, `EXPIRED`, `USER_ENTERED`, `UNAVAILABLE`) are derived from provenance and age, never stored. Freshness constants (14-day warning, 90-day cutoff) live in one config file and are proposals for owner confirmation. Eligibility rules are in `CATALOG_SCHEMA.md`.

## Alternatives
- Floating-point or decimal strings: rounding risk.
- Convert foreign prices: would require an unlicensed or invented rate.

## Consequences
Non-VND offers can be viewed but not carted in the MVP. Formatting uses `Intl.NumberFormat`.
