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
| 7 Persistent cart and manual import | VERIFIED (on synthetic fixtures) | #8 | `6416b97` | 618 unit tests; 13 cart/import specs per browser; CI green with Firefox retries (see Open issues) |
| 8 Virtual checkout and orders | VERIFIED (on synthetic fixtures) | #9 | `17cacd6` | 624 unit tests; 12 checkout/orders/data specs per browser; CI green |
| 9 Virtual shipping and My Collection | ENGINEERING_COMPLETE (pending merge) | see below | – | functional MVP milestone |
| 10 QA, security and hardening | not started | | | |
| 11 Pilot testing and UX polish | not started | | | human pilot is `PENDING_HUMAN_VALIDATION` |
| 12 Release readiness | not started | | | production release needs explicit owner approval |

## Current phase: 9

- Branch: `claude/phase-9-tracking-collection` (from `main` at `17cacd6`).
- Delivered: the simulated delivery timeline on the order page (six virtual states, expected times for timed scenarios, none for Fast, cancelled orders keep the steps they reached), the Fast "next step" control, the delivered screen, `/collection` (derived from delivered, non-cancelled orders; one card per order line; image re-check), an in-app delivery notice (once per order, retired when the user sees the collection or the order), high-water persistence of what was shown, and `journey.spec.ts`: one 21-step real-browser journey from the home page to "delete all data" with a controlled clock and a zero-cross-origin assertion.
- Test results are in the Phase 9 pull request.

## Standing blockers (carried forward)

- **Real product catalog and image rights** (owner-controlled): a verified catalog of about 20–30 products with source URLs, observation dates and image-rights evidence. Until then all journeys are exercised on the synthetic "Fixturia" fixtures, which are labeled and isolated. A public real-product release is blocked on this.
- **Vercel**: two projects (`dreamcart`, `dreamcart-b963`) are connected to the repository and build previews. Treat `dreamcart` as primary; do not delete or disconnect either without the owner (Phase 12).

## Open issues

- **Firefox page-load stalls in CI (unexplained).** Across the three CI runs of PR #7 and the first of PR #8, Firefox `page.goto` timed out in 1, 1, 4 and 4 tests (always the layout or product navigation tests, different pages each time; Chromium and WebKit never stalled). Raising the timeout to 45 s did not stop it. CI now retries a failing browser test once (a retry that passes is printed as "flaky") and uploads Playwright traces as the `browser-test-results` artifact. It could not be reproduced locally because Firefox cannot be installed in the authoring environment. Investigate with the traces in Phase 10 (candidates: a subresource that delays the `load` event in Firefox, or runner contention); if it recurs, do not raise timeouts further.

- **Offline use.** My Collection and all orders are read from IndexedDB with no network call, but there is no service worker, so a closed browser cannot open the app offline. The PRD acceptance ("works offline") is met for data, not for the app shell. Decide in Phase 10/11 whether a minimal offline shell is in the MVP (it would be a new, small scope item for the owner).

## Next action

Merge the Phase 9 pull request when CI is green, then start Phase 10 (comprehensive QA, security including the ADR-011 CSP tradeoff, accessibility, performance, cross-browser) from the updated `main`.
