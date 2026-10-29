# DreamCart — Decision Log

Single index of decisions. Each ADR in `docs/decisions/` holds the rationale and tradeoffs. Precedence when documents disagree: **ADRs > `PRD.md` > `PRODUCT_BLUEPRINT.md` v1.0**.

## ADR index

| ADR | Decision | Status |
|---|---|---|
| [001](decisions/ADR-001-transparent-simulation.md) | Transparent simulation only | Accepted |
| [002](decisions/ADR-002-curated-catalog-first.md) | Repository-hosted curated catalog first | Proposed |
| [003](decisions/ADR-003-manual-first-url-import.md) | Manual-first URL import; automated extraction stays on roadmap | Proposed |
| [004](decisions/ADR-004-provider-research-candidates.md) | External providers are documented research candidates | Proposed |
| [005](decisions/ADR-005-technology-stack.md) | Stack; Supabase deferred | Proposed |
| [006](decisions/ADR-006-local-first-persistence.md) | IndexedDB persistence behind repository ports | Proposed |
| [007](decisions/ADR-007-deterministic-simulation.md) | Deterministic, time-derived simulation | Proposed |
| [008](decisions/ADR-008-research-hypotheses.md) | Psychology claims are hypotheses; research opt-in | Accepted |
| [009](decisions/ADR-009-no-paid-services.md) | No paid service without owner approval | Accepted |
| [010](decisions/ADR-010-image-rights-and-provenance.md) | Image rights and provenance; visual-first | Proposed |
| [011](decisions/ADR-011-rendering-and-csp.md) | Static prerendering and a fitted CSP | Proposed |
| [012](decisions/ADR-012-vietnamese-first-ui.md) | Vietnamese-first UI, dictionary module | Proposed |
| [013](decisions/ADR-013-money-currency-price-states.md) | Integer money, VND, no conversion, derived price states | Proposed |
| [014](decisions/ADR-014-exact-variant-matching.md) | Deterministic exact-variant matching | Proposed |

"Proposed" ADRs are ready for owner promotion. They are not promoted here: promotion needs the owner's explicit approval after reviewing rationale and tradeoffs.

## Owner decisions recorded (2026-10-29)

- **D1** Local-first MVP: Next.js + TypeScript, repository-hosted validated catalog, IndexedDB, no authentication or Supabase yet, no unnecessary backend writes. Repository abstractions, clear layering, versioned export/import, documented eviction risks, compatibility with future Supabase.
- **D2** Vietnamese-first UI, centralized dictionary; English for code and technical docs.
- **D3** Initial categories: laptops/computers, smartphones, headphones/audio; about 20 verified products first; not permanent restrictions.
- **D4** VND checkout; preserve original currency and provenance; no invented or silent conversion.
- **D5** Curated, source-verified data. Visually rich product presentation, real images only where rights are confirmed, explicit image provenance, graceful placeholders, no fabricated product photography.
- **D6** Manual-first import; no arbitrary server-side fetch; automated extraction from authorized sources remains on the roadmap.
- **D7** Revised ADRs prepared; contradictions resolved before proposing promotion.
- **D8** Fast (manual), Quick (~3 min), Relaxed (~1 h); no courier integrations; no manipulative notifications; cancellation where logical; delete/reset any time; monotonic progression; modern-browser test matrix.
- Providers stay documented research candidates; none is integrated until demonstrated permitted.

## Reconciliation of Blueprint v1.0

| Blueprint item | Resolution |
|---|---|
| §7 Supabase for catalog and private data; RLS, pgTAP | Deferred (ADR-005). RLS and user-isolation gates move to the later cloud phase. |
| §7 Eleven-table schema incl. `offer_prices` history and `virtual_collections` | Replaced by the entity model in `CATALOG_SCHEMA.md`: one price observation per offer, collection derived (ADR-007). |
| §7 API draft (13 endpoints) | Not needed in the MVP; server components read static data, local services replace HTTP (ADR-006). |
| §5 Provider interface contract | Not built until a second source exists; `Provenance` is built now (ADR-004). |
| §3 URL import "approved-domain fetch" | MVP is manual-first with client-side validation (ADR-003). |
| §3 P0/P1 lists | Export/import, delete/reset, explainer page, category filter promoted to P0; wishlist, survey, history, onboarding tour deferred. |
| §4 gates mixing local and cloud (RLS, server time) | Split: local gates G1–G11 in the PRD; cloud gates deferred. |
| §5 / §9 Amazon, eBay, Lazada as providers; affiliate | Research only; conflict with a no-sales simulator and noncommercial hosting (matrix). |
| §6 "Image-optional" not stated, but photography assumed | Resolved by ADR-010: visual-first with rights-gated images and designed placeholders. |
| §8 Phase numbering (0–7) | Replaced by the PRD roadmap; Blueprint Phase 1 (spec freeze) is folded into Phase 0, scaffold and domain core are Phase 1. |
| §11 ADR register vs. previous `DECISIONS.md` lists | Merged into this index. |
| §12 Twelve suggested docs | Replaced by: `PRD`, `ARCHITECTURE`, `CATALOG_SCHEMA`, `CURATION_PROCESS`, `SEARCH_FIXTURES`, `PRODUCT_SOURCE_MATRIX`, `PHASE1_ENTRY_CRITERIA`, ADRs. A UX specification arrives in Phase 1. |
| `CLAUDE.md` Technical Direction listed Supabase | Updated to mark Supabase as deferred. |

## Open items

See `docs/PRD.md` §11 and blockers B1–B5 in `docs/PHASE1_ENTRY_CRITERIA.md`.
