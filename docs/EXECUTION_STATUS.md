# DreamCart — Execution Status

The resume point for any session. Updated at phase milestones, not after every action. GitHub is the source of truth: on resume, fetch `origin`, read this file, check open PRs, and continue with **Next action**.

Authorization: the owner authorized sequential execution of Phases 4–12 (one branch, pull request, green CI and squash merge per phase) with pauses only for paid services, real payment or merchant integration, unresolved licensing, destructive actions on real user data, material security compromises, a major architectural replacement, or the public production release.

Status labels: `ENGINEERING_COMPLETE`, `VERIFIED`, `BLOCKED_EXTERNAL_DEPENDENCY`, `PARTIALLY_COMPLETE`, `READY_FOR_RELEASE_REVIEW`, `PENDING_HUMAN_VALIDATION`.

| Phase | Status | PR | Merge SHA | Notes |
|---|---|---|---|---|
| 0 Discovery and specification | VERIFIED | #1 | `0273efe` | |
| 1 Engineering foundation | VERIFIED | #2 | `569b9ba` | |
| 2 UI/UX design system and prototype | VERIFIED (owner-approved design) | #3 | `8506750` | |
| 3 Domain and simulation core | VERIFIED | #4 | `70abbf1` | 317 tests at merge |
| 4 Persistence and import foundation | VERIFIED | #5 | `f75c612` | 463 tests; real-browser IndexedDB tests green on Chromium, Firefox and WebKit in CI |
| 5 Catalog and discovery engine | ENGINEERING_COMPLETE; real-data acceptance `BLOCKED_EXTERNAL_DEPENDENCY` | #6 | `9834318` | real-catalog acceptance is `BLOCKED_EXTERNAL_DEPENDENCY` (human curation and image rights) |
| 6 Production storefront | VERIFIED (on synthetic fixtures) | #7 | `42df549` | 567 unit tests; 59 storefront specs per browser, 0 axe violations at 5 widths; Chromium and WebKit never stalled in CI; see the Firefox flake below |
| 7 Persistent cart and manual import | ENGINEERING_COMPLETE (pending merge) | see below | – | |
| 8 Virtual checkout and orders | not started | | | |
| 9 Virtual shipping and My Collection | not started | | | functional MVP milestone |
| 10 QA, security and hardening | not started | | | |
| 11 Pilot testing and UX polish | not started | | | human pilot is `PENDING_HUMAN_VALIDATION` |
| 12 Release readiness | not started | | | production release needs explicit owner approval |

## Current phase: 7

- Branch: `claude/phase-7-cart-import` (from `main` at `42df549`).
- Scope: persistent cart UI on the IndexedDB repository, manual URL import (safe, unverified status), `price_changed` rule, multi-tab and stale-revision handling.
- Delivered: `LocalDataProvider` (one persistence connection, cross-tab refresh, storage notices), add-to-cart on every cartable offer and from the summary bar, `/cart` (groups by source, quantity 1–99 with visible refusal, price-change acceptance, per-currency totals), `/import` (SafeUrl cleaning and preview, unverified items, delete with line marked unavailable), header unit count, `assessLine`/`acceptPrices` in the cart domain, `createUserProduct`. Checkout stays disabled until Phase 8.
- Test results are in the Phase 7 pull request.

## Standing blockers (carried forward)

- **Real product catalog and image rights** (owner-controlled): a verified catalog of about 20–30 products with source URLs, observation dates and image-rights evidence. Until then all journeys are exercised on the synthetic "Fixturia" fixtures, which are labeled and isolated. A public real-product release is blocked on this.
- **Vercel**: two projects (`dreamcart`, `dreamcart-b963`) are connected to the repository and build previews. Treat `dreamcart` as primary; do not delete or disconnect either without the owner (Phase 12).

## Open issues

- **Firefox page-load stalls in CI (unexplained).** Across the three CI runs of PR #7 and the first of PR #8, Firefox `page.goto` timed out in 1, 1, 4 and 4 tests (always the layout or product navigation tests, different pages each time; Chromium and WebKit never stalled). Raising the timeout to 45 s did not stop it. CI now retries a failing browser test once (a retry that passes is printed as "flaky") and uploads Playwright traces as the `browser-test-results` artifact. It could not be reproduced locally because Firefox cannot be installed in the authoring environment. Investigate with the traces in Phase 10 (candidates: a subresource that delays the `load` event in Firefox, or runner contention); if it recurs, do not raise timeouts further.

## Next action

Merge the Phase 7 pull request when CI is green, then start Phase 8 (virtual checkout and orders) from the updated `main`.
