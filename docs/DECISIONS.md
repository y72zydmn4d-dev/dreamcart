# DreamCart — Decision Log

Single index of decisions. Each ADR in `docs/decisions/` holds rationale and tradeoffs. Precedence when documents disagree: **ADRs > `PRD.md` > `PRODUCT_BLUEPRINT.md` v1.0**.

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

No Proposed ADR has been promoted. Promotion needs the owner's explicit approval.

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

## Pending owner decisions (recommendations only; nothing here is promoted)

| ID | Decision | Original proposal | Review recommendation | Needed by |
|---|---|---|---|---|
| **P-1** | Price freshness | Warn after 14 days; block cart after 90 days | Warn per provenance: 14 days (curator-observed), 45 days (manufacturer list price); **no block** (label stale prices and show the date; keep an advisory refresh report). Reasons: manufacturer list prices change rarely; a block makes the catalog decay into unsellable items and adds a refresh burden; a dated, labeled price is not fabricated. If you want a hard limit, make it long (for example 180 days). All values are configuration; fixtures O01–O08 cover either choice | before Phase 3 |
| **P-2** | Cancellation window | Allowed through `PACKED` | Keep. It matches real logistics and gives roughly 45 s in Quick and 15 min in Relaxed; Fast is user-paced. Show the action by state, never a countdown (urgency rule). Alternative: allow through `IN_TRANSIT` | before Phase 3 |
| **P-3** | Manually observed prices as snapshots | Acceptable | Accept as the working basis for private development and the pilot, **not** as a legal conclusion. Mitigations already specified: record facts only, curator-written text, no copied images or marketing copy, private evidence, per-source policy recorded, prefer manufacturer list prices. Make public launch contingent on RT-5 (owner or counsel reads the source terms). Decision needed: whether owner-curated sources default to `snapshot_allowed` once the owner has read that source's terms | before Phase 5 |
| **P-4** | Premium-first image plan | n/a (new risk) | Start brand-permission outreach for shortlisted brands now; use open-license sources where licenses allow; owner photography where possible; `brand_art` for editorial surfaces; treat image availability as a selection criterion. Fallback: if too few products have cleared imagery by Phase 6, narrow to brands that do rather than ship unlicensed images | at RT-2 start |
| **P-5** | Configurator interaction | Hybrid, dependent options | Guided steps with a persistent summary (bottom sheet on mobile); disabled options carry a reason; a reset flow names the groups it will clear. Designed and approved in Phase 2 | Phase 2 |
| **P-6** | Search scope | Shopee/Lazada-inspired | Facets (category, brand, price range, key attributes), sort (relevance, price ascending/descending), suggestions drawn from catalog titles; **no** recent-search history and no popularity signals. Vietnamese shorthand like `128G`: support only with category context, if you want it | Phase 3 (parsing), Phase 6 (UI) |
| **P-7** | UI/UX skill adoption | Optional later | Evaluate in Phase 2 only after reading its license and every file it would load, pin a commit, confirm no runtime network or secret access, and treat it as a development-time aid. Not installed now | Phase 2 |
| **P-8** | ADR promotions | n/a | Ready now: 003, 004, 005, 006, 012. After their pending decision: 002 (P-3), 007 (P-2), 010 (P-4), 013 (P-1). Keep Proposed until implemented against real data: 014. Keep Proposed until the Phase 1 spike: 011 | any time |
| **P-9** | Tooling and repository | Node 22 LTS, npm | Confirm; tell me whether the repository is public (CI minutes) and whether Playwright WebKit may run in CI | before Phase 1 |
| **P-10** | Revised roadmap | Earlier plan: spec freeze, then foundation + domain + persistence + UX in one phase | Approve `ROADMAP.md` (Phases 0–12, design phase before domain core so your sign-off overlaps engineering) | before Phase 1 |

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
| §8 Phase numbering (0–7) | Replaced by `ROADMAP.md` (Phases 0–12) |
| §8 Phase 0 deliverables `DATA_LICENSE_REGISTER.md`, `PRODUCT_SEARCH_POC.md` | Not produced as separate files: rights live in `Source` and `MediaAsset` records (`CATALOG_SCHEMA.md`); search proof of concept is the fixtures |
| §11 ADR register vs. previous `DECISIONS.md` lists | Merged into this index |
| §12 Twelve suggested docs | Replaced by: `PRD`, `ROADMAP`, `ARCHITECTURE`, `CATALOG_SCHEMA`, `CURATION_PROCESS`, `SEARCH_FIXTURES`, `PRODUCT_SOURCE_MATRIX`, `PHASE1_ENTRY_CRITERIA`, ADRs; a UX specification arrives in Phase 2 |
| `CLAUDE.md` Technical Direction listed Supabase | Updated to mark Supabase as deferred |

## Open items

Blockers B1–B5 in `docs/PHASE1_ENTRY_CRITERIA.md`; research tracks RT-1 to RT-5 in `docs/ROADMAP.md`.
