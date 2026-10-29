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
| 9 Virtual shipping and My Collection | VERIFIED (on synthetic fixtures) | #10 | `743e26d` | 626 unit tests; tracking, collection and 21-step journey specs; functional MVP milestone |
| 10 QA, security and hardening | ENGINEERING_COMPLETE (pending merge); device, screen-reader and release-risk items `PENDING_HUMAN_VALIDATION` | see below | – | report: `docs/QA_REPORT.md` |
| 11 Pilot testing and UX polish | not started | | | human pilot is `PENDING_HUMAN_VALIDATION` |
| 12 Release readiness | not started | | | production release needs explicit owner approval |

## Current phase: 10

- Branch: `claude/phase-10-qa-hardening` (from `main` at `743e26d`).
- Delivered: the system-wide audit and report (`docs/QA_REPORT.md`), CLS fix (0.30 → 0.00), failure-injection specs (no IndexedDB, full storage, corrupted records, newer database), keyboard specs, performance budgets, source-hygiene guards, production license audit, `/privacy`, `docs/RUNBOOK.md` (build, deploy, rollback, user backup guide, incident table), the ADR-011 CSP revisit (policy unchanged, controls now tested), and CI split into parallel per-engine jobs behind the unchanged `Verify (Node 24)` check.
- Needs people, not code: real-device and screen-reader checks, storage-eviction observation, the owner's acceptance of the residual risks listed in the QA report.

## Standing blockers (carried forward)

- **Real product catalog and image rights** (owner-controlled): a verified catalog of about 20–30 products with source URLs, observation dates and image-rights evidence. Until then all journeys are exercised on the synthetic "Fixturia" fixtures, which are labeled and isolated. A public real-product release is blocked on this.
- **Vercel**: two projects (`dreamcart`, `dreamcart-b963`) are connected to the repository and build previews. Treat `dreamcart` as primary; do not delete or disconnect either without the owner (Phase 12).

## Open issues

- **Firefox page-load stalls in CI (unexplained).** Across the three CI runs of PR #7 and the first of PR #8, Firefox `page.goto` timed out in 1, 1, 4 and 4 tests (always the layout or product navigation tests, different pages each time; Chromium and WebKit never stalled). Raising the timeout to 45 s did not stop it. CI now retries a failing browser test once (a retry that passes is printed as "flaky") and uploads Playwright traces as the `browser-test-results` artifact. It could not be reproduced locally because Firefox cannot be installed in the authoring environment. Investigate with the traces in Phase 10 (candidates: a subresource that delays the `load` event in Firefox, or runner contention); if it recurs, do not raise timeouts further.

- **Offline use.** My Collection and all orders are read from IndexedDB with no network call, but there is no service worker, so a closed browser cannot open the app offline. The PRD acceptance ("works offline") is met for data, not for the app shell. Decide in Phase 10/11 whether a minimal offline shell is in the MVP (it would be a new, small scope item for the owner).

## Next action

Merge the Phase 10 pull request when CI is green, then start Phase 11 (pilot plan and independent polish; the human pilot itself is `PENDING_HUMAN_VALIDATION`) from the updated `main`.
