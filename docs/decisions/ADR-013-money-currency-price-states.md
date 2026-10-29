# ADR-013: Integer money, VND checkout, no conversion, derived price states

**Status:** Accepted (owner decisions D4, P-1; promoted per P-8; 2026-10-29)
**Date:** 2026-10-29

## Decision
Money is stored as integer minor units with an ISO 4217 exponent table (VND exponent 0). Checkout currency for the MVP is VND. Original currency and provenance from sources are preserved; there is no exchange-rate conversion, and carts are single-currency. Price states (`OBSERVED`, `STALE`, `EXPIRED`, `USER_ENTERED`, `UNAVAILABLE`) are derived from provenance and age, never stored. Freshness is configuration: a warn window per provenance type and an optional block threshold. **Decision P-1:** warn after 14 days for curator-observed merchant prices and after 45 days for manufacturer list prices, always showing the source and observation date, with *no* block threshold (`blockAfterDays: null`): an old price is labeled, not forbidden, and prices are never silently updated. This replaces the originally proposed 90-day cart block. Amounts are integers ≥ 1; an unknown price is `null`, never `0`. Eligibility rules and fixtures are in `CATALOG_SCHEMA.md` and `fixtures/pricing/`.

## Alternatives
- Floating-point or decimal strings: rounding risk.
- Convert foreign prices: would require an unlicensed or invented rate.

## Consequences
Non-VND offers can be viewed but not carted in the MVP. Formatting uses `Intl.NumberFormat`.
