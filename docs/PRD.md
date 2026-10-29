# DreamCart — Product Requirements (MVP)

**Status:** Phase 0 draft for owner approval (revised after self-review). **Date:** 2026-10-29.
**Precedence:** ADRs (`docs/decisions/`) > this PRD > `PRODUCT_BLUEPRINT.md` v1.0. Conflicts are reconciled in `docs/DECISIONS.md`. Phase plan: `docs/ROADMAP.md`.

## 1. Purpose

DreamCart is a **premium visual shopping simulator**: real products with sourced reference prices, a polished cart and checkout, a simulated shipping journey, and a personal collection. No money moves, nothing is ordered, nothing is shipped. Success is a transparent, voluntary, enjoyable, finished journey, not repeat purchases or time spent.

## 2. Principles (non-negotiable)

1. Every purchase-related surface says the transaction is simulated. Required copy: `Mô phỏng — không thanh toán, không đặt hàng, không giao hàng thật.` and `Đã tạo đơn mô phỏng`.
2. No real payments, orders, couriers, tracking numbers, bank or wallet marks, or financial credentials.
3. Never invent a product, source, price, availability, rating, sales figure, image, or license. User-entered values are labeled unverified.
4. Product, variant, offer, and price observation are separate concepts. Variants are never substituted silently.
5. No fake discounts, urgency, scarcity, countdowns, streaks, random rewards, popularity or social-proof badges, or re-engagement notifications.
6. No scraping that bypasses site restrictions. Third-party data and image rights are recorded and respected.
7. Zero paid services or API calls without owner approval. No credentials in the repository.
8. Psychological benefits are hypotheses. No therapeutic or clinical claims in copy.

## 3. Owner-confirmed product direction (requirements, not suggestions)

Confirmed by the owner after Phase 0. The UX specification (Phase 2) elaborates them; it does not reopen them.

| # | Requirement | Notes and guardrails |
|---|---|---|
| U1 | **Apple-inspired premium design with a DreamCart identity** | Inspired, not copied: no Apple logos, product imagery, trade dress, or proprietary fonts; self-hosted open-license fonts or the system font stack. One DreamCart accent and identity of its own. |
| U2 | **Apple-first editorial homepage** | Full-width editorial modules, large type, product storytelling per category, search always reachable. Content authored by the owner in the repository (validated); no claims beyond the catalog's sourced facts. Visual weight comes from `CLEARED` product images or DreamCart `brand_art`, never from fabricated product photography. |
| U3 | **Shopee/Lazada-inspired product search and discovery** | Take the *patterns*: dense result grid, persistent search with suggestions, filter panel with counts, sort, active-filter chips, result count, clear-all. Do **not** take ratings, "sold" counts, vouchers, flash sales, "% off" badges, countdowns, or popularity labels. They are fabricated or manipulative here. |
| U4 | **Apple-inspired product detail pages** | Large gallery, concise headline, structured specifications, sticky purchase summary, price and source provenance, image attribution when required. |
| U5 | **Hybrid configurator with dependent options** | Options come only from real variants. Unavailable options are shown disabled with a reason, never hidden; incompatible selections require an explicit reset, never a silent change. Rules: `docs/CATALOG_SCHEMA.md` (Configurator derivation) and `fixtures/configurator/`. The exact interaction (guided steps plus a persistent summary) is designed in Phase 2. |
| U6 | **Premium-first initial catalog of about 20–30 verified products** | Laptops/computers, smartphones, headphones/audio; not permanent restrictions. Process: `docs/CURATION_PROCESS.md`. |
| U7 | **Fully simulated checkout, tracking, and collections** | Sections 5–6 below. |

## 4. MVP scope

**In (P0):**
- Vietnamese-first UI with all strings in one dictionary module.
- Repository-hosted, validated catalog of about 20–30 products; credits and sources page listing image attributions.
- Editorial home, search and discovery, product detail with the hybrid configurator, as in section 3.
- Exact-variant search (`docs/SEARCH_FIXTURES.md`).
- Manual-first URL import with safe URL validation and manual completion; imported items private and local.
- Cart (IndexedDB), multi-source, grouped by source, single currency (VND), durable across refresh.
- Simulated checkout; one immutable virtual order per idempotency key.
- Orders, simulated tracking (Fast, Quick, Relaxed), cancellation, My Collection.
- Export/import of all local data; delete one order; reset everything.
- Simulation explainer page, privacy notice, storage-risk notice.
- Unit, integration, and end-to-end tests; accessibility baseline; responsive layouts.

**Later (own ADR and approval):** Supabase auth and sync, wishlist, rating survey, automated metadata extraction from explicitly authorized sources, licensed provider integrations, research module, English UI.

**Excluded:** real transactions or logistics, financial credentials, unauthorized scraping, price tracking, currency conversion, ratings or reviews of any kind, recommendation ML, chatbots, background workers, native apps, invasive analytics, virtual balances or spendable credits.

## 5. Journeys and acceptance criteria

**J1 Discover.** Editorial home (U2) and search (U3). *Accept:* all search fixtures pass; zero-result facet values are disabled and counts are shown; no match shows an honest empty state with the import option and a clearly outbound external-search link; every card shows title, key specs, source status, and price provenance (or an explicit missing-price label); `near` and `ambiguous` results are labeled "not an exact match" with reasons.

**J2 Inspect and configure.** Product detail (U4) and configurator (U5). *Accept:* configurator fixtures pass; add-to-cart is disabled until one variant resolves; image, spec, and price change only when backed by data; a combination that does not exist is shown as unavailable and never replaced; outbound source links open a "leaving DreamCart" notice.

**J3 Import.** The user pastes a URL; the app validates it (http/https only, no credentials, tracking parameters stripped), shows the cleaned URL for confirmation (a warning that remaining query parameters are stored on the device), and offers a form for title, attributes, price, and currency, all labeled unverified. *Accept:* malicious-URL fixtures rejected; no server-side fetch exists; imported items stay on the device; no remote image is loaded from an import.

**J4 Cart.** Add the resolved variant with a chosen offer and quantity 1–99; subtotal grouped by source; add acknowledgement within 200–350 ms with a screen-reader announcement. *Accept:* pricing and cart fixtures pass; a different variant or offer is a distinct line; refresh keeps the cart; ineligible offers cannot be added and the reason is shown.

**J5 Checkout.** Summary, scenario choice (Fast, Quick, Relaxed), virtual destination (`Dream Apartment`, `Dream Workspace`), payment label `Dream Credits (ảo)` (a label, no balance), and a required acknowledgement. One confirm creates one immutable order. *Accept:* repeated clicks, refresh, and two tabs yield exactly one order per idempotency key; zero cross-origin requests on the checkout flow.

**J6 Track.** Timeline in the order's scenario. *Accept:* reload, close and reopen, or a clock change never move state backward; terminal states are never left; cancelled orders stay cancelled.

**J7 Receive and collect.** `VIRTUALLY_DELIVERED` shows the delivered parcel and adds items to My Collection, a derived view of delivered orders that renders from order snapshots. Items reference products; they are not ownership claims. *Accept:* each delivered item appears exactly once; the collection works offline.

**J8 Manage data.** Settings offers export, import, delete one order, reset everything, each with confirmation. *Accept:* export then import in a clean browser restores everything; reset leaves no DreamCart data; imported content is re-validated (URLs, sizes, schema) before it is stored or rendered.

## 6. Simulation specification

States: `CONFIRMED → PREPARING → PACKED → IN_TRANSIT → OUT_FOR_VIRTUAL_DELIVERY → VIRTUALLY_DELIVERED`, plus `CANCELLED`. All labels are phrased as virtual. No carrier name, map, or tracking number.

| Scenario | Advancement | Offsets (share of duration) |
|---|---|---|
| Fast | manual: each press advances exactly one step | none |
| Quick | time-based, 180 s | 0, 10%, 25%, 45%, 75%, 100% |
| Relaxed | time-based, 3600 s | 0, 10%, 25%, 45%, 75%, 100% |

Ratios are illustrative, not transit estimates. State is a pure function evaluated with an injected clock:

1. if the order has a cancellation record: `CANCELLED` (terminal, wins over everything);
2. otherwise `state = max(time-derived milestone, stored high-water state, manual step index)`, where time-derived is the first state for Fast.

The high-water state is written whenever an order is viewed or the collection is computed, so a backward clock cannot regress what the user has seen. No timers provide durability. The UI may re-render on a timer for display only.

**Cancellation (PENDING P-2):** allowed while the computed state is `CONFIRMED`, `PREPARING`, or `PACKED`. The check runs inside the same transaction that records the cancellation, using the clock at that moment, so a cancel racing a state change is decided once. The UI shows the action by state, **never as a countdown**.

**Data control:** the user can delete an order or reset all data at any time. "Immutable" means no editing, not no deletion.

## 7. Price and eligibility

Integer minor units; original currency and provenance preserved; no exchange rates; VND checkout. States, freshness configuration (PENDING P-1), eligibility order, and the order snapshot are defined in `docs/CATALOG_SCHEMA.md`.

## 8. Experience requirements

The MVP must feel like a premium shopping product, not a set of CRUD screens.

- **Visual first.** Large product imagery wherever rights are `CLEARED`; designed placeholders (generic category art labeled "Ảnh minh hoạ chưa có") and DreamCart `brand_art` elsewhere. Image rights are tracked per asset. No fabricated product photography.
- **Product cards and detail pages**: strong hierarchy, calm whitespace, a single accent color, rounded cards, 8-pt spacing, clear price and source block.
- **Cart and checkout**: a cart drawer, a quiet add acknowledgement, and a checkout that is clear about being simulated without feeling cold.
- **Order confirmation** with a prominent simulated watermark and a `DC-V-…` code.
- **Shipping progress** that is engaging (progress visual, virtual parcel) but never pressuring. Notifications are in-app only, shown when the user opens the app. No push, email, SMS.
- **My Collection** as a gallery of delivered items with order context and source links.
- **Accessibility** target WCAG 2.2 AA: keyboard, visible focus, `prefers-reduced-motion` (all editorial motion respects it), live-region announcements, contrast, image fallbacks, skeleton loading.
- **Responsive** from 360 px to desktop. Fonts self-hosted; no third-party font or script requests.

## 9. Acceptance gates (MVP, local-first)

| # | Gate |
|---|---|
| G1 | Every purchase, confirmation, order, tracking, collection, and export surface shows the simulation label (automated per-route check plus pilot). |
| G2 | All search fixtures pass; no exact match is ever returned for a different variant; contradictory or ambiguous queries are never resolved silently. |
| G3 | All pricing, currency, and cart fixtures pass. |
| G4 | All configurator fixtures pass; add-to-cart is impossible until one variant resolves. |
| G5 | No product card without title, source status, and price provenance or an explicit missing-price label; no rating, sales, or discount element exists anywhere. |
| G6 | Only `CLEARED` images render as product images; build fails on malformed rights records, missing required attributes, or `fx-` ids. |
| G7 | One order per idempotency key under double-click, refresh, and two-tab races. |
| G8 | Cart, orders, and tracking survive refresh; tracking never regresses (time-shift and cancel-race tests). |
| G9 | Export then import restores state; corrupted records are quarantined; imported data is re-validated (only http/https URLs, size limits, schema) before storage and rendering. |
| G10 | Full journey passes end to end on desktop and mobile projects with zero cross-origin requests at checkout. |
| G11 | URL validator rejects non-http(s) schemes (including `javascript:`), credentials, and malformed URLs; no server-side fetch exists. |
| G12 | Automated accessibility checks pass on key routes; manual keyboard and screen-reader pass done. |
| G13 | Performance targets on a mid-range mobile profile in lab conditions for home, search, and product pages: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms (targets, measured in hardening). |
| G14 | Pilot of 5–10 participants: at least 80% complete the journey unaided, and 100% can state that no real purchase occurred; no personal data collected. |
| G15 | No paid dependency; build, test, and run instructions documented. |

Cloud-tier gates (user isolation, RLS, server-time orders) are deferred with Supabase.

## 10. Edge cases the design must handle

Typos; ambiguous, unknown, or contradictory attributes; too-specific query; invalid, oversized, or `javascript:` URL; missing, stale, expired price; broken image; non-VND offer; quantity 0, negative, or over 99; refresh during checkout; double submit; two tabs; storage unavailable, evicted, or corrupted; clock moved backward; unknown order id; repeated delivery; very long titles; offline use; catalog entry or image removed after an order referencing it.

## 11. Roadmap and pending decisions

The phase plan is `docs/ROADMAP.md`. Decisions awaiting the owner, with recommendations, are in `docs/DECISIONS.md` ("Pending owner decisions").
