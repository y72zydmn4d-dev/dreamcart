# DreamCart — Product Requirements (MVP)

**Status:** Phase 0 draft for owner approval. **Date:** 2026-10-29.
**Precedence:** ADRs (`docs/decisions/`) > this PRD > `PRODUCT_BLUEPRINT.md` v1.0. Where they conflict, see the reconciliation table in `docs/DECISIONS.md`.

## 1. Purpose

DreamCart is a **visual shopping simulator**: real products with sourced reference prices, a polished cart and checkout, a simulated shipping journey, and a personal collection. No money moves, nothing is ordered, nothing is shipped. Success is a transparent, voluntary, enjoyable and finished journey, not repeat purchases or time spent.

## 2. Principles (non-negotiable)

1. Every purchase-related surface says the transaction is simulated. Required copy: `Mô phỏng — không thanh toán, không đặt hàng, không giao hàng thật.` and `Đã tạo đơn mô phỏng`.
2. No real payments, orders, couriers, tracking numbers, bank or wallet marks, or financial credentials.
3. Never invent a product, source, price, availability, image, or license. User-entered values are labeled unverified.
4. Product, variant, offer, and price observation are separate concepts. Variants are never substituted silently.
5. No fake discounts, urgency, scarcity, countdowns, streaks, random rewards, or re-engagement notifications.
6. No scraping that bypasses site restrictions. Third-party data and image rights are recorded and respected.
7. Zero paid services or API calls without owner approval. No credentials in the repository.
8. Psychological benefits are hypotheses. No therapeutic or clinical claims in product copy.

## 3. MVP scope

**In (P0):**
- Vietnamese-first UI; strings in one dictionary module.
- Repository-hosted, validated catalog: laptops/computers, smartphones, headphones/audio; about 20 verified products initially, growing with data availability.
- Visually rich discovery: responsive home, search, category browsing, product cards, product detail with gallery, structured specs, exact variant selector, price and source provenance.
- Exact-variant search (`docs/SEARCH_FIXTURES.md`).
- Manual-first URL import with safe URL validation and manual completion; imported items are private and local.
- Cart (IndexedDB), multi-source, grouped by source, single currency (VND), durable across refresh.
- Simulated checkout, one immutable virtual order per idempotency key.
- Orders, simulated tracking (Fast, Quick, Relaxed), cancellation, collection ("My Collection").
- Export/import of all local data; delete a single order; reset everything.
- Simulation explainer page, privacy notice, storage-risk notice.
- Tests (unit, integration, end-to-end), accessibility baseline, responsive layouts.

**Later (needs its own ADR and approval):** Supabase auth and cross-device sync, wishlist, rating survey, automated metadata extraction from explicitly authorized sources, licensed provider integrations (Shopify Global Catalog and others once permitted), research module, English UI.

**Excluded:** real transactions or logistics, financial credentials, unauthorized scraping, price tracking, currency conversion, recommendation ML, chatbots, background workers, native apps, invasive analytics, virtual balances or credits with spendable value.

## 4. User journeys and acceptance criteria

**J1 Discover.** Home shows curated products with large imagery or a designed placeholder, category entry points, and a visible simulation label. Search accepts keywords, models, and exact attributes, with Vietnamese diacritics optional. *Accept:* `docs/SEARCH_FIXTURES.md` 30/30; no match shows an honest empty state with the import option and an external search link that is clearly outbound; every card shows title, source status, and price provenance (or an explicit missing-price label).

**J2 Inspect and configure.** Product detail shows gallery, specs, variant selectors, offers per source, price state, observation date, and image attribution when required. Selecting attributes changes image, spec, and price only when the data backs the change. *Accept:* an unavailable combination is shown as unavailable and is never replaced by a different variant; outbound source links open a clear "leaving DreamCart" notice.

**J3 Import.** User pastes a URL. The app validates (http/https only, no credentials, tracking parameters stripped), detects nothing remotely, and shows a form to complete title, variant attributes, price, and currency, all labeled unverified. *Accept:* malicious URL fixtures rejected; no server-side fetch exists; the imported item stays on the device and is excluded from the shared catalog; no remote image is loaded from an import.

**J4 Cart.** Add an exact variant with a chosen offer and quantity (1–99); subtotal grouped by source; add feedback within 200–350 ms with a screen-reader announcement. *Accept:* changing the variant creates a distinct line; refresh keeps the cart; ineligible offers (see CATALOG_SCHEMA eligibility) cannot be added and explain why.

**J5 Checkout.** Summary, scenario choice (Fast, Quick, Relaxed), preset virtual destination (`Dream Apartment`, `Dream Workspace`), payment label `Dream Credits (ảo)` (a label, no balance), and a required acknowledgement that nothing real happens. One confirm creates one immutable order. *Accept:* repeated clicks, refresh, and two tabs produce exactly one order per idempotency key; no network request leaves the origin during checkout.

**J6 Track.** Order detail shows a timeline in the order's scenario. *Accept:* reload, close and reopen, or a clock change never move the state backward; terminal states are never left; cancelled orders stay cancelled.

**J7 Receive and collect.** Reaching `VIRTUALLY_DELIVERED` shows the delivered parcel and adds items to My Collection (a derived view of delivered orders, never duplicated). Collection items reference products; they are not claims of ownership. *Accept:* each delivered item appears exactly once; the collection works offline.

**J8 Manage data.** Settings offers export, import, delete one order, and reset everything, each with confirmation. *Accept:* export then import in a clean browser restores cart, orders, collection, and imported items; reset leaves no DreamCart data.

## 5. Simulation specification

States: `CONFIRMED → PREPARING → PACKED → IN_TRANSIT → OUT_FOR_VIRTUAL_DELIVERY → VIRTUALLY_DELIVERED`, plus `CANCELLED`. All labels are prefixed or phrased as virtual. No carrier name, map, or tracking number.

| Scenario | Advancement | Offsets (share of duration) |
|---|---|---|
| Fast | manual: each press advances exactly one step | none |
| Quick | time-based, 180 s | 0, 10%, 25%, 45%, 75%, 100% |
| Relaxed | time-based, 3600 s | 0, 10%, 25%, 45%, 75%, 100% |

The ratios are illustrative design values, not real transit estimates. The state is a pure function: `state = max(latest milestone with offset ≤ elapsed, stored high-water state, manual step)`. The high-water state is written when an order is viewed, so a clock moving backward cannot regress it. No timers are used for durability; state is recomputed on open. Tests use an injected clock.

**Cancellation (proposal for owner confirmation):** allowed in `CONFIRMED`, `PREPARING`, `PACKED`; not from `IN_TRANSIT` onward. A cancelled order never reaches the collection.

**Data control:** the user can delete an order or reset all data at any time; "immutable" means the order cannot be edited, not that it cannot be deleted.

## 6. Price and eligibility

Integer minor units; original currency and provenance preserved; no exchange rates. VND is the checkout currency. Price states, freshness windows (14 days observed, 90 days before not addable), and eligibility rules are defined in `docs/CATALOG_SCHEMA.md`. Order snapshots keep amount, currency, provenance, warnings, and the source's `persistencePolicy` at placement.

## 7. Experience requirements

The MVP must feel like a premium shopping product, not a set of CRUD screens.

- **Visual first.** Large, high-quality product imagery wherever rights are `CLEARED`; designed placeholders (generic category art, labeled "Ảnh minh hoạ chưa có") where not. Image rights are tracked per asset; public accessibility is not permission; no generated product photography is presented as real.
- **Product cards and detail pages** with strong hierarchy, calm whitespace, one accent color, 12–16 px radii, 8-pt spacing, clear price and source block.
- **Cart and checkout** with a cart drawer, quiet add-to-cart acknowledgement, and a checkout that is clear about being simulated without being cold.
- **Order confirmation** with a prominent simulated watermark and a `DC-V-…` code.
- **Shipping progress** that is engaging (a progress visual and virtual parcel) but never pressures the user. Notifications are in-app only and appear when the user opens the app. No push, email, or SMS.
- **My Collection** as a gallery of delivered items with their order context and source links.
- Accessibility target WCAG 2.2 AA: keyboard navigation, visible focus, `prefers-reduced-motion`, live-region announcements, contrast, image fallbacks, skeleton loading.
- Responsive from 360 px wide to desktop.

Phase 1 delivers the UX specification and visual direction for owner approval before UI build.

## 8. Acceptance gates (MVP, local-first)

| # | Gate |
|---|---|
| G1 | Every purchase, confirmation, order, tracking, collection, and export surface shows the simulation label (automated per-route check plus pilot). |
| G2 | 30/30 search fixtures pass; no exact match is ever returned for a different variant. |
| G3 | No product card without title, source status, and price provenance or an explicit missing-price label. |
| G4 | Only `CLEARED` images render as product images; build fails on malformed rights records or `fx-` ids. |
| G5 | One order per idempotency key under double-click, refresh, and two-tab races. |
| G6 | Cart, orders, and tracking survive refresh; tracking never regresses (time-shift tests). |
| G7 | Export then import restores state; corrupted local data is quarantined, not fatal. |
| G8 | Full journey passes end to end on desktop and mobile projects with zero cross-origin requests at checkout. |
| G9 | URL validator rejects non-http(s), credentials, and malformed URLs; no server-side fetch exists. |
| G10 | Accessibility automated checks pass on key routes; manual keyboard and screen-reader pass in hardening. |
| G11 | No paid dependency; build, tests, and run instructions documented. |

Cloud-tier gates (user isolation, RLS, server-time orders) are deferred with Supabase.

## 9. Edge cases the design must handle

Typos; ambiguous or unknown attributes; too-specific query; invalid or oversized URL; missing, stale, expired price; broken image; non-VND offer; quantity 0, negative, or over 99; refresh during checkout; double submit; two tabs; storage unavailable, evicted, or corrupted; clock moved backward; unknown order id; repeated delivery; very long titles; offline use.

## 10. Roadmap (supersedes Blueprint §8 numbering)

| Phase | Goal |
|---|---|
| 0 | Discovery and specification (this PR): docs, matrix, schemas, fixtures, ADRs, entry criteria |
| 1 | Foundation: scaffold and CI, dictionary module, domain core (money, price states, matching, cart, orders, simulation), IndexedDB adapters, export/import, UX specification and visual direction |
| 2 | Catalog and discovery UI: catalog loader and validation, search, product pages, visual system, provenance and image pipeline |
| 3 | Manual import and cart |
| 4 | Checkout and orders |
| 5 | Tracking and collection |
| 6 | Hardening and pilot: accessibility, security headers, storage-eviction testing on real devices, 5–10 person pilot |
| 7 | Optional small noncommercial public launch |

One phase at a time. The owner's catalog curation runs alongside engineering phases because it is human work.

## 11. Open questions for the owner

1. Confirm freshness windows (14/90 days) and the cancellation window.
2. Confirm that the owner's manual recording of a visible price is an acceptable basis for a price snapshot (ADR-002).
3. Decide who curates the first 20 entries and who photographs or licenses images.
4. Repository visibility (affects CI minutes) and domain/branding preferences.
5. Whether to allow the hosts in `docs/PRODUCT_SOURCE_MATRIX.md` so primary terms can be read.
