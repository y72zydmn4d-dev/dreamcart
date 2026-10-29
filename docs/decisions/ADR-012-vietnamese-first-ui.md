# ADR-012: Vietnamese-first UI with a centralized dictionary

**Status:** Proposed (owner direction D2 recorded)
**Date:** 2026-10-29

## Decision
All UI strings live in `platform/i18n/vi.ts` as a typed object accessed through a small `t()` helper. No i18n library in the MVP. Dates and money are formatted with `Intl` (`vi-VN`). Code identifiers, logs, architecture contracts, and technical documentation stay in English. Search is diacritic-insensitive.

## Alternatives
- Full i18n framework now: more tooling than one language needs.
- Hard-coded strings: makes later English support and copy review expensive.

## Consequences
Adding English later means adding `en.ts` against the same key type and routing. A lint rule against raw literal strings in JSX is optional.
