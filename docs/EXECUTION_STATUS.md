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
| 10 QA, security and hardening | ENGINEERING_COMPLETE; device, screen-reader and release-risk items `PENDING_HUMAN_VALIDATION` | #11 | `f13f39d` | report: `docs/QA_REPORT.md`; CI now ~8 min (parallel per engine) |
| 11 Pilot testing and UX polish | ENGINEERING_COMPLETE; the human pilot is `PENDING_HUMAN_VALIDATION` | #12 | `c48ad00` | plan: `docs/PILOT_PLAN.md`; clock hook fixed (QA F12) |
| 12 Release readiness | ENGINEERING_COMPLETE; overall `READY_FOR_RELEASE_REVIEW`, not `READY_FOR_OWNER_RELEASE_APPROVAL` | #13 | `07e8657` | `docs/FINAL_ACCEPTANCE_REPORT.md`, `docs/RELEASE_CHECKLIST.md`; production NOT published |

## Current phase: none (all planned phases merged)

- Phase 12 was merged from `claude/phase-12-release-readiness` as `07e8657`; the autonomous plan is complete.
- Delivered: `docs/FINAL_ACCEPTANCE_REPORT.md` (verdict, gate-by-gate evidence, what was not verified, owner decisions), `docs/RELEASE_CHECKLIST.md`, CLAUDE.md "Deployment" section recording the owner's authorization of Vercel Preview deployments (production still needs explicit approval each time; the outdated "no deployment before Phase 12" statements were corrected), `SMOKE_BASE_URL` / `SMOKE_MODE=release` for the smoke tool and `E2E_BASE_URL` for the browser suite so a deployment can be checked with one command, the `/design` gallery hidden in release builds, a takedown path in the runbook, and a demonstrated release-build refusal of synthetic data.
- **Overall status: `READY_FOR_RELEASE_REVIEW`.** `READY_FOR_OWNER_RELEASE_APPROVAL` is not claimed: the real catalog and image rights (`BLOCKED_EXTERNAL_DEPENDENCY`), the pilot, device and screen-reader checks, deployment verification and rollback rehearsal (`PENDING_HUMAN_VALIDATION`) are open.
- Vercel: the two projects were not touched. The environment's network policy blocks `*.vercel.app`, so no deployed URL was checked; only the bot's "Ready" build status is evidence of a successful preview build. Check whether the production branch is `main` (it may already publish the synthetic build).

## Post-MVP remediation (browser acceptance findings F01–F04)

Status: `ENGINEERING_COMPLETE`, one pull request (`claude/post-mvp-f01-f04`). Fixed: F01 price radios (shared radio group across the desktop panel and mobile sheet), F02 catalog-mode disclosure, F03 unpriced add-to-cart affordance, F04 dark illustration separation; details in `CHANGELOG.md`. Verified locally in Chromium (lint, types, 646 unit tests, build, smoke, 168 browser specs including the full journey); Firefox and WebKit run in CI only. Preview deployments were not fetched (network policy). Overall status is unchanged: `READY_FOR_RELEASE_REVIEW`.

Acceptance checks the independent browser test did not cover, still open for the owner (not failures): backup export/import round trip on real devices, multiple tabs, Safari on real Apple hardware, Firefox, private browsing and storage failures, slow network and offline, larger cart quantities, cancellation and deletion flows, and the Relaxed simulation preset. The automated suites cover most of these in Chromium, Firefox and WebKit engines, not on devices.

## Standing blockers (carried forward)

- **Real product catalog and image rights** (owner-controlled): a verified catalog of about 20–30 products with source URLs, observation dates and image-rights evidence. Until then all journeys are exercised on the synthetic "Fixturia" fixtures, which are labeled and isolated. A public real-product release is blocked on this.
- **Vercel**: two projects (`dreamcart`, `dreamcart-b963`) are connected to the repository and build previews. Treat `dreamcart` as primary; do not delete or disconnect either without the owner (Phase 12).

## Open issues

- **Firefox page-load stalls in CI (unexplained).** Across the three CI runs of PR #7 and the first of PR #8, Firefox `page.goto` timed out in 1, 1, 4, 4, 7 and 6 tests (always the layout or product navigation tests, different pages each time; Chromium and WebKit never stalled). Raising the timeout to 45 s did not stop it. CI now retries a failing browser test once (a retry that passes is printed as "flaky") and uploads Playwright traces as the `browser-test-results` artifact. It could not be reproduced locally because Firefox cannot be installed in the authoring environment. A separate Firefox/WebKit failure (the order page losing its state element after the fake clock moved) turned out to be an application bug: `useNow` resubscribed on every render and could loop (QA report F12), fixed in Phase 11; the time-travel specs also use `fastForward`. The hypothesis that F12 also caused the goto stalls was tested and not supported (7 Firefox retries both before and after the fix); the cause of the stalls remains unknown. Investigate the goto stalls with the traces (candidates: a subresource that delays the `load` event in Firefox, or runner contention); if it recurs, do not raise timeouts further.

- **Offline use.** My Collection and all orders are read from IndexedDB with no network call, but there is no service worker, so a closed browser cannot open the app offline. The PRD acceptance ("works offline") is met for data, not for the app shell. Decide in Phase 10/11 whether a minimal offline shell is in the MVP (it would be a new, small scope item for the owner).

## Next action

The autonomous plan is complete. The next steps belong to the owner (see `docs/FINAL_ACCEPTANCE_REPORT.md` and `docs/RELEASE_CHECKLIST.md`): supply the verified catalog and image rights, run the pilot and the device and screen-reader checks, check the Vercel production-branch setting and run the deployment checks, then decide on launch. Engineering follow-ups available on request: read the Firefox traces for the page-load stalls, a phone-width run of the full journey, and an optional offline shell.
