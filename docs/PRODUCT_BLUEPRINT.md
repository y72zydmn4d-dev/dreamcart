# DREAMCART — PRODUCT BLUEPRINT v1.0
**Status:** Proposed / conditional GO  
**Date:** 2026-10-29  
**Owner:** DreamCart project  
**Purpose:** Implementation handoff for Codex / Claude Code; not approval to start coding without final scope review.

## 0. Executive decision
DreamCart is a transparent shopping simulator: real, traceable product references; virtual cart, checkout, payment confirmation, shipping timeline and collection; **no real money, purchases, orders to vendors or deliveries**. Build the simulation journey as the core asset, not a marketplace integration platform. GO for a bounded MVP. NO-GO for a requirement to search every listing on Shopee/Lazada/Amazon without authorized data access.

### Distinct forms of value
- Entertainment: explore, configure, assemble dream carts, complete a simulated journey.
- Psychological: *hypotheses*, not proven benefits, about pleasure, completion, anticipation and symbolic ownership.
- Research: future consent-based, preregistered experiments; no treatment or compulsive-shopping claims.

### Target users
Dream-tech/fashion/setup browsers; casual comparison shoppers; separately consenting research participants. No addictive engagement optimization.

## 1. Hard invariants (non-negotiable)
1. Every flow shows simulation status clearly, including checkout, order details, tracking, notifications and export.
2. No bank/card/CVV/OTP/wallet connection or actual provider checkout integration.
3. No real orders, shipments or transactional invoices; virtual receipts cannot plausibly impersonate merchant proof of purchase.
4. Product identity, variant, merchant/source and observed price are distinct concepts.
5. Never fabricate a real product, configuration, merchant, current price, source URL or availability.
6. User-entered values must be labeled unverified. A source URL is not evidence that all user-entered fields are accurate.
7. No fake discounts, urgency, inventory scarcity, psychological manipulation or random reward loops.
8. No scraping that circumvents site restrictions; third-party data, image and branding licensing must be reviewed.
9. Zero paid infrastructure or external API calls with nonzero cost without explicit owner permission.
10. First release is responsive web, modular monolith; no AI assistant, native app, GPU, microservices or real commerce.

## 2. Verification and evidence ledger
### Consumer research
- Rick, Pereira & Burson (2014), Journal of Consumer Psychology, DOI 10.1016/j.jcps.2013.12.004: 3 experiments; shopping choices (including hypothetical) can reduce residual sadness via perceived personal control in studied contexts. Does not validate DreamCart or long-term benefits.
- Close & Kukar-Kinney (2010), Journal of Business Research, DOI 10.1016/j.jbusres.2009.01.022: 289 U.S. online consumers, survey, structural equation model. Organizational cart use is positively related to cart frequency; entertainment's controlled path is negative (beta = -0.21), not positive. Cross-sectional self-report, not a causal DreamCart test.
- Peck & Shu (2009), Journal of Consumer Research, DOI 10.1086/598614: touching or imagined touch can affect perceived ownership in studied settings, not proof of virtual ownership equivalence.
- Kamleitner & Feuchtl (2015), Journal of Marketing Theory and Practice, DOI 10.1080/10696679.2015.1002337: imagery and psychological ownership related in studied ad contexts.
- Order-tracking motives study (2026), Journal of Retailing and Consumer Services, DOI 10.1016/j.jretconser.2026.104797: anticipation, reassurance, coordination in real-world tracking; generalization to simulated packages unknown.

### Product sources, official docs
- Lazada Seller Authorization: https://open.lazada.com/apps/doc/doc?docId=108260&nodeId=10533
- Lazada Product API: https://open.lazada.com/apps/doc/doc?docId=108146&nodeId=10557
- eBay Browse API: https://developer.ebay.com/develop/api/buy
- eBay production restrictions: https://developer.ebay.com/api-docs/buy/buy-requirements.html
- Amazon Creators API: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction
- Amazon limits/caching: https://affiliate-program.amazon.com/help/operating/policies
- Shopify Global Catalog: https://shopify.dev/docs/agents/catalog
- Shopify Global Catalog integration: https://shopify.dev/docs/agents/catalog/global-catalog
- Shopify auth tutorial: https://shopify.dev/docs/agents/get-started/authentication
- Shopify catalog usage guidelines: search results cannot be cached; images must not be cached/reused outside the related product listing. Need confirmation that a non-purchasing simulator use is allowed.
- Apple App Store Connect API is NOT a hardware-commerce catalog: https://developer.apple.com/documentation/AppStoreConnectAPI
- Google Custom Search JSON API not available to new customers: https://developers.google.com/custom-search/v1/overview

### Infrastructure and security docs
- Vercel Hobby personal/noncommercial: https://vercel.com/docs/plans/hobby
- Vercel fair use excludes scrapers and commercial Hobby deployments: https://vercel.com/docs/limits/fair-use-guidelines
- Supabase pricing: https://supabase.com/pricing
- Free Supabase projects may pause after 7 days low activity: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- SSRF prevention: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

## 3. MVP boundaries
### P0 Must have
Responsive home/catalog, search, product detail, real variants, offer/source URL, price provenance, URL import with secure fallback, quantity and cross-source cart, simulated checkout, success screen, order history, deterministic simulated tracking (fast/time-based), virtually delivered screen, purchased collection, durable storage after refresh, simulation banners, robust loading/empty/error states, privacy/security basics, tests.

### P1 Should have
Supabase login/cloud sync (guest can finish flow locally), wishlist, browsing history, first-use onboarding, optional rating survey, accessibility polish, simple admin catalog import CSV, filtering. May be included in public beta if P0 stable.

### Excluded
Real transactions, real logistics, real order IDs sourced from vendors, financial credentials, automatic crawling, price tracking, multi-currency FX conversion, recommendation ML, chatbot, dedicated backend workers, native iOS, analytics invasive by default.

### Explicit scope cap
Start with 80–150 individually verified product/variant entries, from 3–5 curated categories, and approved image use. Use CSV admin import + source provenance. Numbers are *planning targets*, not verified catalog counts. No requirement to search all of any marketplace.

## 4. User journeys and acceptance
1. **Browse:** open website → see curated products → search by keyword/model → inspect source, variants and price observation date. No match returns honest empty state with URL import and external search options.
2. **Import:** paste product URL → validate scheme/domain → for approved providers try parser/metadata extraction; otherwise manual completion → show preview with provenance/unverified labels → save. Import never makes a server-side arbitrary URL request.
3. **Cart:** choose exact variant, quantity → add, see feedback and subtotal grouped by source → refresh → unchanged. Changing configuration creates a distinct cart line. No silent variant substitution.
4. **Checkout:** cart summary → select virtual delivery scenario, preset virtual destination and payment mode labeled simulation → acknowledge no real transaction → confirm once → one immutable virtual order.
5. **Track:** show deterministic timeline derived from server-created timestamp and scenario snapshot (guest may use local timestamp) → reload, close and reopen → same or later valid state. Fast mode permits voluntary next step.
6. **Receive:** only terminal `VIRTUALLY_DELIVERED` adds items to collection → re-open orders and collect details → optionally reset/cancel; no real-world fulfillment claim.

### Explicit edge cases
Search typos, ambiguous variants, query too specific, sources unavailable, invalid URL, redirect to disallowed domain, blocked robots/403, missing price, price stale, broken image, currency mismatch, quantity 0/negative, refresh during checkout, repeated button submission, offline during local cart, expired sessions, corrupted local data, inaccessible owner data, 404 order, unauthorized order access, database project paused, repeat simulated delivery.

### MVP acceptance gates
- 100% of displayed purchase/confirmation/tracking routes visibly identify simulation in user tests.
- All exact configuration search tests never silently return a different variant as an exact match.
- No product card without product title, source status, and provenance of price (or explicit missing-price label).
- Critical E2E journey desktop/mobile completes without runtime error or actual payment/network order action.
- Duplicate confirm clicks produce exactly one order per idempotency key.
- After refresh, cart/orders/tracking remain intact; tracking never regresses.
- User A cannot read, update or delete User B's private data; unauthorized reads denied by database policies.
- URL Import blocks requests to private/loopback/link-local/reserved IPs and unsafe redirects; unapproved hosts run manual-only.
- No paid dependencies; application build, migrations, automated tests and deployment documented.

## 5. Product discovery and price policy
### Providers and priorities
1. `internal_catalog`: required production foundation, verified curated rows.
2. `url_import`: required; whitelist parsing only for reviewed hosts, with manual fallback.
3. `shopify_global_catalog`: research POC, NOT enabled in production until licensing/non-purchase use, credentials, cache limits and image rendering are validated.
4. `authorized_provider`: optional future licensed official/affiliate API.
5. `external_redirect`: safe outbound search URL only; never pretend it was fetched.
6. `manual_entry`: user-entered, clearly unverified.

### Provider interface contract
`search(query, filters, context) -> candidates | unsupported | not_authorized | rate_limited | failed`
`resolve(url) -> imported_candidate | manual_required | blocked`
`getDetails(providerId) -> candidate | not_supported`
`normalize(candidate) -> ProductIdentity + Variant[] + Offer[] + provenance`
`capabilities(): { search, resolveUrl, fetchDetail, permittedPersistence, mediaDisplayPolicy }`
Every returned field carries source, observed timestamp, usage/license flag, and confidence/verification status. Adapters must handle differing ToS; no universal caching of third-party responses. **Only sources explicitly permitting durable storage may be committed into persistent cart/order snapshots.** If a provider forbids persistence (e.g., Shopify Global Catalog search results), the integration must remain ephemeral/redirect-only until separate permission for persistent simulation use is obtained. Shopify results cannot silently be copied into DreamCart’s internal catalog, collection or virtual receipts.

### Identity and variant matching
`Product` = brand+family+model; `Variant` = source-backed combination of attributes, e.g. screen size, chip, RAM, SSD, color, region. `Offer` = seller, listing URL, exact variant, currency, observation time. Exact match rules are hard constraints for explicit chip/RAM/size/storage; missing required fields means unknown, not matched. String similarity may rank candidates only after hard filters.

### Price states
`OBSERVED` = price and timestamp from allowed source; `USER_ENTERED` = unverified; `UNAVAILABLE` = no price; `STALE` = previously observed, outside configured freshness window. Never fabricate. No arithmetic combining distinct currencies without a disclosed conversion source; v1 checkout can require a single currency, or report subtotals by currency. Virtual order snapshots preserve price amount, currency, provenance and displayed warning at placement **only where source data storage rights permit**; otherwise block virtual checkout for that external candidate or require a separately licensed/user-authored verified record.

### URL import threat model
- Validate URL with a standards-compliant parser; allow HTTP(S) only; no credentials in URL.
- For v1 perform network fetch **only** for specifically approved provider domains with vetted parsers, disabled redirects and safe networking. All other URLs use manual fallback. A hostname allowlist alone is not enough: prevent DNS rebinding by validating and pinning actual destination IP at connection time; block IPv4/IPv6 loopback, RFC1918, link-local, metadata and reserved addresses; enforce fetch timeout, max bytes and content type.
- Treat Open Graph/JSON-LD as untrusted hints; use schema.org Product/Offer metadata where permitted; sanitize display; no arbitrary HTML execution; only display images with lawful rights and safe rendering.
- Log no personal URL query tokens; normalize and strip tracking parameters where safe and permitted.

### Provider evaluation POC
For each candidate provider test: availability/authorization, 30 representative product queries including exact attributes, variant fidelity, offer URL validity, price currency/observed timestamp, image display license, quota/latency, Vietnam coverage, allowed persistent storage, lawful simulation use. Document PASS/FAIL/UNKNOWN. Do not integrate production until usage rights and POC pass.

## 6. Experience design
### Sitemap
`/` Discover; `/search` results; `/product/[id]` detail; `/import` URL form; `/cart`; `/checkout/simulated`; `/orders`; `/orders/[id]`; `/collection`; `/settings` later.

### Interaction direction
Design: calm premium commerce with clear information density, large product photography, uncluttered chrome; one accent color (example: indigo/blue), gray backgrounds, 8pt spacing scale, 12–16px cards, high contrast and accessible focus rings. Header: DreamCart, always-visible search, Import, Cart, My Orders/Collection. Desktop grids 3–4 cols, mobile 2/1 depending on data density. A permanent but unobtrusive 'Simulated Shopping' label links to explanation. Product detail offers image gallery, structured specs, exact configuration selectors, price/source provenance and CTA. Cart drawer instant feedback, no confetti overload.

### Core interaction rules
- Product → variant changes update image/spec/price only when backed by data.
- Add to Cart gives subtle visual acknowledgement (200–350ms), count and subtotal update with keyboard/screenreader announcement.
- Checkout clearly states: `Mô phỏng — không thanh toán, không đặt hàng, không giao hàng thật.`
- Payment selection must be explicitly fictional, e.g. `Dream Credits (ảo)`; no real bank marks. Virtual address preset (`Dream Apartment`, `Dream Workspace`), no required real address.
- Order confirmation says `Đã tạo đơn mô phỏng`; includes unique `DC-V-...` code, prominent simulated watermark.
- Shipping step labels are prefixed/interpreted as virtual; no actual map/carrier/tracking number. Fast/Time-Based selectable without coercion.
- Completion returns visual virtual parcel and item cards to Collection (products referenced, not physically acquired).
- `prefers-reduced-motion`, keyboard navigation, image fallbacks, skeleton loading, toast ARIA, contrast WCAG 2.2 AA target.

### Example time-based scenario (design assumption)
Confirmed at 0; preparing at 10%; packed at 25%; in transit at 45%; out-for-virtual-delivery at 75%; virtually delivered at 100%. These ratios are illustrative—not real transit estimates. Persist `startedAt`, `scenarioVersion`, `durationSeconds`, `milestoneOffsets[]`. Compute `state = latest milestone whose offset <= elapsed`; do not use timers as a durability mechanism. A signed-in order uses server time at creation; no background cron.

### Visual benchmark
Apple Store: product-first whitespace and variant configurator; Amazon: clarity of product attributes and source information; Shopee/Lazada: legible cart density and quick actions. Original components, no platform identity spoofing.

## 7. System architecture
### Stack
Next.js App Router + React + TypeScript; Tailwind CSS + shadcn/ui; Zod for boundary validation; React server components for catalog, client components for interactive cart/checkout; Next.js Route Handlers for stable API; Supabase Postgres for curated public catalog and optional authenticated private data; Supabase Auth (P1); Vercel deployment; GitHub CI; Playwright + Vitest; Sentry optional only within approved budget. No Prisma requirement initially; choose Supabase migrations/types or lightweight DB access, not two redundant data layers.

### Architecture diagram
Browser (responsive UI) → Next.js modular monolith (catalog/search/import/cart/order/simulation) → Supabase Postgres, optional approved provider adapters. Guest cart and virtual orders may persist locally in IndexedDB (or versioned localStorage for small MVP); login migrates to server persistence under RLS, with explicit merge strategy. For simpler v1 public beta, allow guest entire journey locally and optional sign-in for cross-device sync. Do not implement OAuth integrations with commerce marketplaces.

### Schema (minimum)
- `products`: id, brand, family, model, category, canonical_title, verification_status, created_at.
- `product_variants`: id, product_id, attributes JSONB, sku/gtin nullable, variant_key unique per product, created_at.
- `sources`: id, provider_type, merchant_name, domain, usage_policy.
- `offers`: id, variant_id, source_id, url, external_listing_id nullable, currency, availability_status, last_observed_at, verification_status.
- `offer_prices`: id, offer_id, amount_minor, currency, observed_at, provenance_type, provenance_uri nullable, permitted_until nullable.
- `product_media`: id, product_id or variant_id, url, rights_status, attribution, usage_policy, priority.
- `carts`: id, user_id nullable / guest opaque id, updated_at, currency_mode.
- `cart_items`: id, cart_id, variant_id, offer_id nullable, quantity, price_reference_id nullable.
- `virtual_orders`: id, user_id nullable / guest id, simulation_id, idempotency_key, status, scenario_version, mode, started_at, duration_seconds, virtual_destination, created_at, cancel_at nullable.
- `virtual_order_items`: id, order_id, immutable product/variant/title/spec/source URL/price/currency/provenance JSON snapshots, quantity.
- `virtual_collections`: id, owner_id, order_id, order_item_id, virtually_delivered_at.
- `research_responses` deferred: user consent, pseudonymous study ID, pre/post scores, timestamp; do not launch without ethics/privacy plan.

**DB constraints:** price nonnegative, quantity 1..99, valid currency enum/ISO, unique(owner,idempotency_key), unique orderItem per order/variant/offer as required. Index searchable titles/brands/model and owner FK. Row-level security for private tables; never expose privileged Supabase key. Public catalog read-only to guest/auth; user writes via validated endpoint or scoped policies.

### API draft
`GET /api/products?q=&category=&cursor=`; `GET /api/products/:id`; `POST /api/imports/preview` (safe); `POST /api/imports/commit`; `GET /api/cart`; `POST /api/cart/items`; `PATCH /api/cart/items/:id`; `DELETE /api/cart/items/:id`; `POST /api/virtual-orders` with idempotency key; `GET /api/virtual-orders`; `GET /api/virtual-orders/:id`; `POST /api/virtual-orders/:id/advance` (fast mode); `POST /api/virtual-orders/:id/cancel`. Guest-local implementations may use service interfaces backed by IndexedDB rather than HTTP for cart/order, to avoid unnecessary backend cost. If API is exposed, enforce ownership and rate limits.

### Order state machine
`CONFIRMED → PREPARING → PACKED → IN_TRANSIT → OUT_FOR_VIRTUAL_DELIVERY → VIRTUALLY_DELIVERED`. Optional `CANCELLED` reachable from allowed nonterminal states. Delivery is computed by scenario schedule or explicit Fast Mode transition; no skipped invalid transitions in stored data. History may be derived from milestone timestamps; do not simulate external carrier data. Idempotent checkout transaction stores order + snapshots atomically. Collection creation idempotent when delivery reached.

### Security, observability, testing
- Security: RLS, rate limiting, strict URL SSRF protections, outbound domain policy, content-security policy, security headers, safe logging, no secrets on client, privacy deletion, third-party media licensing.
- Monitoring: error rate, request latency, source adapter failure, import success, stale-price share, checkout completion; no behavioral tracking without informed consent.
- Tests: Vitest domain unit tests, provider normalization contract tests, pgTAP RLS tests, Playwright end-to-end responsive flows, a11y automated checks, malicious URL fixture tests, idempotency race, offline/refresh recovery.

## 8. Phase roadmap / gates
### Phase 0 — Evidence and data feasibility
Objective: decide if data sourcing can sustain a legitimate product. Tasks: source-policy matrix; check Shopify global catalog allowed simulation use; test one approved import host; manually curate 20 verified examples; define 30 exact-query fixtures; examine image licensing. Deliverables: `PRODUCT_SOURCE_MATRIX.md`, `DATA_LICENSE_REGISTER.md`, `PRODUCT_SEARCH_POC.md`, sample CSV. Dependencies: none. Acceptance: no unknown rights represented as permitted, at least one reliable lawful catalog path. DoD: verified citations/decisions, clear NO-GO fallback.

### Phase 1 — Scope, UX, architecture freeze
Objective: freeze journey/design and contracts. Tasks: wireframes 8 screens, design tokens, DB ERD, API/adapter contracts, invariants, threat model, ADRs. Deliverables: `PRD.md`, `UX_SPEC.md`, `ARCHITECTURE.md`, `ADR/`, `TEST_PLAN.md`. Dependencies: Phase 0. Acceptance: walkthrough shows a full shopping loop; no necessary external API dependency. DoD: owner accepts acceptance criteria.

### Phase 2 — Catalog backbone
Objective: real sourceable catalog. Tasks: DB migrations, seeded products/variants/offers/prices, provenance display, exact query normalization, fallback policy. Deliverables: usable product catalog/search/detail; fixtures. Dependencies: Phase 1. Acceptance: exact attribute test set passes, no invented data. DoD: unit/contract tests and source evidence.

### Phase 3 — Product UX and import
Objective: complete product selection UI. Tasks: responsive grids, filtering, detail configurator, image fallback, URL import approved/manual fallback, states. Dependencies: Phase 2. Acceptance: end users find, inspect, select, import without misleading outputs. DoD: mobile/desktop visual and a11y review.

### Phase 4 — Cart and checkout
Objective: durable multi-source cart and a transparent virtual checkout. Tasks: cart state, quantity, subtotal, destination preset, fake payment method, order snapshot, idempotency, guest persistence. Dependencies: Phase 3. Acceptance: full E2E via refresh, no real external transaction; duplicate click one order. DoD: tests green.

### Phase 5 — Tracking and receiving
Objective: simulated time/fast tracking + collection. Tasks: pure deterministic state function, timeline, no cron, delivered collection, restart/cancel rules. Dependencies: Phase 4. Acceptance: page close/reopen, no state regression, delivered item appears once. DoD: boundary/time-shift tests.

### Phase 6 — Beta hardening
Objective: security/quality/ops. Tasks: RLS if cloud auth included, malicious URL tests, performance audits, empty/loading/error states, privacy/deletion, content license review, user usability pilot 5–10 volunteers. Dependencies: Phase 5. Acceptance: P0 gates met; zero critical or high security issues outstanding. DoD: changelog, runbook, monitoring, backup/export procedure.

### Phase 7 — Public MVP, optional
Objective: small-scale noncommercial launch. Tasks: domain, basic docs, consented feedback, error monitoring, quota alarms, deployment/rollback. Dependencies: Phase 6. Acceptance: complete journey works on target browsers and notifies users of simulated nature. DoD: launch checklist signed off; weekly iteration only for bugfixes and validated user friction.

### After MVP — not automatically authorized
Auth and syncing, wishlist, research module with consent, source integrations approved by licensors, AI entity resolution after collecting a labeled data set. Each proposal requires its own ADR, user value proof and time budget.

## 9. Costs (USD/month, estimates at 2026-10-29)
- Local dev: $0 incremental software hosting (hardware/internet excluded), free local Postgres optional.
- Private MVP: Vercel Hobby $0 noncommercial + Supabase Free $0 within quotas; domain optional $0 via provided subdomains. Supabase Free: 500 MB DB, 1 GB storage, 5 GB egress, 50k MAU, 2 active projects; can pause after low activity ~7 days. Hosting free ≠ third-party product API free.
- Small public hobby MVP: potentially $0 with quotas and conditions, not guaranteed uninterrupted production SLA, image hosting rights and traffic relevant.
- Small professional/commercial production: Vercel Pro starts $20/mo + Supabase Pro from $25/mo ≈ $45/mo baseline before extra seats/usage/tax/domain and any product-data API costs. Verify current billing before upgrade.
- External product/search data: $0 only for curated/manual sources and eligible approved free APIs; premium data providers may dominate costs. Google Custom Search JSON API is closed to new customers and ends Jan 1 2027; do not plan around its old 100-free-queries/day figure.

## 10. KPIs, research, and safety
North-star: completion of a transparent, voluntary, usable simulated shopping journey (not number of repeated purchases). Quality metrics: exact-match rate on predetermined query set, product source traceability, import success (by approved domain), full journey completion, page errors, user clarity that no purchase occurred, subjective satisfaction. Survey must be optional and not used to infer clinical benefit. No fake urgency/discounts. Do not optimize engagement time, trigger repeated checkout or pressure the user.

## 11. Decision register
- ADR-001 Accepted: Transparent simulation only; no real payments/logistics.
- ADR-002 Proposed: Internal verified catalog first; 80–150 curated items target.
- ADR-003 Proposed: URL import with approved-domain fetch only + manual fallback.
- ADR-004 Investigate: Shopify Global Catalog rights and feasibility; not a production dependency.
- ADR-005 Proposed: Next.js+TS+Tailwind/shadcn+Supabase+Vercel modular monolith.
- ADR-006 Proposed: Guest-first durable local checkout; Supabase Auth and cross-device sync P1.
- ADR-007 Proposed: Deterministic timestamp-based shipping; no background worker.
- ADR-008 Accepted: Non-validated psychology hypotheses; opt-in research only.
- ADR-009 Accepted: No paid service/API without owner approval.

## 12. Suggested repo documentation structure
```
docs/
  00-PROJECT-CHARTER.md
  01-PRD.md
  02-CONSUMER-PSYCHOLOGY-EVIDENCE.md
  03-PRODUCT-DISCOVERY-AND-LICENSING.md
  04-UX-UI-SPEC.md
  05-SYSTEM-ARCHITECTURE.md
  06-DATA-MODEL.md
  07-API-CONTRACTS.md
  08-SECURITY-PRIVACY.md
  09-MVP-ROADMAP.md
  10-TEST-AND-ACCEPTANCE.md
  11-COST-AND-OPERATIONS.md
  decisions/
    ADR-001-transparency.md
    ADR-002-catalog-first.md
  research/
    SOURCES.md
    PROVIDER-POC-RESULTS.md
```

## 13. Final recommendation
Do Phase 0 data/rights POC first (short, timeboxed), then freeze an internal-catalog-based MVP. Build the user-facing shopping loop to real quality, not a static demo. Only afterward consider additional providers or psychology experiments. Highest-value initial release: 80–150 verified product/variant references + deterministic exact matching + safe URL import/manual fallback + excellent product UX + persistent cart + 100% virtual checkout and tracking + virtual collection, on free noncommercial infrastructure within quotas.
