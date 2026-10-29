# DreamCart — Decision Log

Single index of decisions. Each ADR in `docs/decisions/` holds rationale and tradeoffs. Precedence when documents disagree: **ADRs > `PRD.md` > `PRODUCT_BLUEPRINT.md` v1.0**.

## ADR index

| ADR | Decision | Status |
|---|---|---|
| [001](decisions/ADR-001-transparent-simulation.md) | Transparent simulation only | Accepted |
| [002](decisions/ADR-002-curated-catalog-first.md) | Repository-hosted curated catalog first | Proposed |
| [003](decisions/ADR-003-manual-first-url-import.md) | Manual-first URL import; automated extraction stays on roadmap | Accepted |
| [004](decisions/ADR-004-provider-research-candidates.md) | External providers are documented research candidates | Accepted |
| [005](decisions/ADR-005-technology-stack.md) | Stack; Supabase deferred | Accepted |
| [006](decisions/ADR-006-local-first-persistence.md) | IndexedDB persistence behind repository ports | Accepted |
| [007](decisions/ADR-007-deterministic-simulation.md) | Deterministic, time-derived simulation | Accepted |
| [008](decisions/ADR-008-research-hypotheses.md) | Psychology claims are hypotheses; research opt-in | Accepted |
| [009](decisions/ADR-009-no-paid-services.md) | No paid service without owner approval | Accepted |
| [010](decisions/ADR-010-image-rights-and-provenance.md) | Image rights and provenance; visual-first | Proposed |
| [011](decisions/ADR-011-rendering-and-csp.md) | Static prerendering and a fitted CSP | Proposed |
| [012](decisions/ADR-012-vietnamese-first-ui.md) | Vietnamese-first UI, dictionary module | Accepted |
| [013](decisions/ADR-013-money-currency-price-states.md) | Integer money, VND, no conversion, derived price states | Accepted |
| [014](decisions/ADR-014-exact-variant-matching.md) | Deterministic exact-variant matching | Proposed |

Per decision P-8, ADRs are promoted only when genuinely resolved. **Still Proposed, and why:** 002 (price snapshots are cleared only for private development and the pilot, not for public deployment; RT-5), 010 (image rights are not yet demonstrated for any real product; blocker B2), 011 (CSP behavior needs verification against the pinned Next.js; Phase 1), 014 (rules must be implemented and tested against the real catalog).

## Owner decisions recorded

**Architecture and scope (Phase 0 authorization)**
- **D1** Local-first MVP: Next.js + TypeScript, repository-hosted validated catalog, IndexedDB, no authentication or Supabase yet, no unnecessary backend writes; repository abstractions, layering, versioned export/import, documented eviction risks, Supabase compatibility.
- **D2** Vietnamese-first UI, centralized dictionary; English for code and technical docs.
- **D3** Initial categories: laptops/computers, smartphones, headphones/audio (not permanent restrictions).
- **D4** VND checkout; preserve original currency and provenance; no invented or silent conversion.
- **D5** Curated, source-verified data; visually rich presentation; real images only where rights are confirmed; explicit image provenance; graceful placeholders; no fabricated product photography.
- **D6** Manual-first import; no arbitrary server-side fetch; automated extraction from authorized sources stays on the roadmap.
- **D7** Revised ADRs prepared; contradictions resolved before proposing promotion.
- **D8** Fast (manual), Quick (~3 min), Relaxed (~1 h); no courier integrations; no manipulative notifications; cancellation where logical; delete/reset any time; monotonic progression; modern-browser matrix.
- Providers remain documented research candidates; none is integrated until demonstrated permitted.

**Product direction (confirmed after Phase 0; now requirements U1–U7 in `PRD.md` §3)**
- Apple-inspired premium design with DreamCart identity; Apple-first editorial homepage; Shopee/Lazada-inspired search and discovery; Apple-inspired product detail pages; hybrid configurator with dependent options; premium-first catalog of about 20–30 verified products (this replaces the earlier "about 20"); fully simulated checkout, tracking, and collections.
- `nextlevelbuilder/ui-ux-pro-max-skill` may be integrated later during UI/UX implementation. It is not installed.

## Final owner decisions P-1 to P-10 (recorded 2026-10-29)

| ID | Decision | Applied in |
|---|---|---|
| **P-1** | Price freshness: warn after 14 days for curator-observed merchant prices and 45 days for manufacturer list prices; always show source and observation date; never block the cart solely because a price is old; label uncertain or outdated prices; never fabricate or silently update | `CATALOG_SCHEMA.md`, ADR-013, PRD §7 |
| **P-2** | Cancellation through `PACKED`; afterwards the lifecycle continues logically; users can always delete orders or reset local data; no manipulative countdowns | PRD §6, ADR-007 |
| **P-3** | Manually observed prices are acceptable for private development and pilot testing, each with provenance and a timestamp. Not legal clearance for unrestricted redistribution or public deployment | `CATALOG_SCHEMA.md`, `CURATION_PROCESS.md`, ADR-002 (stays Proposed) |
| **P-4** | Premium-first catalog of about 20–30 verified real products in laptops/computers, smartphones, headphones/audio; correct identity and configuration; verifiable source URLs; approximate but honestly represented prices; legitimately usable images where available, high-quality placeholders otherwise; never invent metadata or claim unverified image rights; the lack of catalog entries must not block engineering foundation work | `CURATION_PROCESS.md`, ADR-010 (stays Proposed) |
| **P-5** | **Hybrid Continuous Configurator** (final, supersedes the proposed guided wizard): all major groups on one page, collapsible sections, revisit earlier selections, quick navigation between groups, sticky summary, dependent-option validation, only genuine variants, no silent substitution, no fabricated price | PRD U5, `CATALOG_SCHEMA.md` |
| **P-6** | Search: name, model, attributes; category filters; supported sort fields; autocomplete and suggestions; exact-variant matching; conflict and ambiguity detection; safe shorthand (`128GB`, `128G`, `1TB`, `1T`) when unambiguous; no artificial popularity, fake ratings, fake sales counts, or fabricated discounts | `SEARCH_FIXTURES.md` (fixtures F38–F42), ADR-014 (stays Proposed) |
| **P-7** | `nextlevelbuilder/ui-ux-pro-max-skill` is evaluated and integrated in **Phase 2**, not Phase 1: inspect its actual files and license, verify Claude Code Cloud compatibility, prefer a version-controlled project-level integration, pin a reviewed commit, and treat its recommendations as subordinate to DreamCart requirements. Not installed | `ROADMAP.md` Phase 2 |
| **P-8** | Promote ADRs only when genuinely resolved; keep Proposed where technical verification, provider licensing evidence, or owner decisions remain; no unnecessary new ADRs | ADR index above |
| **P-9** | Private GitHub repository; Node.js 24 LTS; npm; versions compatible with the chosen stable Next.js; committed lockfile; `npm ci` in CI; Playwright WebKit allowed in CI when relevant but avoided in Phase 1; no paid infrastructure or third-party services | ADR-005, `ROADMAP.md` Phase 1 |
| **P-10** | Roadmap Phases 0–12 approved. Names: 1 Engineering Foundation; 2 UI/UX Design System; 3 Domain & Simulation Core; 4 Persistence & Import Foundation; 5 Real Product Catalog & Search; 6 Storefront Implementation; 7 Cart & Manual Import; 8 Virtual Checkout & Orders; 9 Virtual Tracking & My Collection; 10 Comprehensive QA, Security and Performance; 11 Pilot Testing and UX Polish; 12 Optional Public MVP Launch | `ROADMAP.md` |

Review policy from the owner: one concise self-review per phase; comprehensive system-wide audits are reserved for Phase 10 unless a critical security, licensing, or data-integrity issue requires immediate action.

## Reconciliation of Blueprint v1.0

| Blueprint item | Resolution |
|---|---|
| §7 Supabase for catalog and private data; RLS, pgTAP | Deferred (ADR-005). RLS and user-isolation gates move to a later cloud phase |
| §7 Eleven-table schema incl. `offer_prices` history and `virtual_collections` | Replaced by the entity model in `CATALOG_SCHEMA.md`: one price observation per offer, collection derived (ADR-007) |
| §7 API draft (13 endpoints) | Not needed in the MVP; server components read static data, local services replace HTTP (ADR-006) |
| §5 Provider interface contract | Not built until a second source exists; `Provenance` is built now (ADR-004) |
| §3 URL import "approved-domain fetch" | MVP is manual-first with client-side validation (ADR-003) |
| §3 P0/P1 lists | Export/import, delete/reset, explainer page, category filter, credits page promoted to P0; wishlist, survey, history, onboarding tour deferred |
| §4 gates mixing local and cloud (RLS, server time) | Split: local gates G1–G15 in the PRD; cloud gates deferred |
| §5 / §9 Amazon, eBay, Lazada as providers; affiliate | Research only; conflict with a no-sales simulator and noncommercial hosting (matrix) |
| §6 visual direction ("calm premium", Shopee/Lazada cart density) and photography assumed without a rights path | Replaced by owner-confirmed U1–U7 and ADR-010 (rights-gated imagery, `brand_art`, placeholders) |
| §8 Phase numbering (0–7) | Replaced by `ROADMAP.md` (Phases 0–12, approved as P-10) |
| §8 Phase 0 deliverables `DATA_LICENSE_REGISTER.md`, `PRODUCT_SEARCH_POC.md` | Not produced as separate files: rights live in `Source` and `MediaAsset` records (`CATALOG_SCHEMA.md`); search proof of concept is the fixtures |
| §11 ADR register vs. previous `DECISIONS.md` lists | Merged into this index |
| §12 Twelve suggested docs | Replaced by: `PRD`, `ROADMAP`, `ARCHITECTURE`, `CATALOG_SCHEMA`, `CURATION_PROCESS`, `SEARCH_FIXTURES`, `PRODUCT_SOURCE_MATRIX`, `PHASE1_ENTRY_CRITERIA`, ADRs; a UX specification arrives in Phase 2 |
| `CLAUDE.md` Technical Direction listed Supabase | Updated to mark Supabase as deferred |

## Open items

Blockers B1–B5 in `docs/PHASE1_ENTRY_CRITERIA.md`; research tracks RT-1 to RT-5 in `docs/ROADMAP.md`.
