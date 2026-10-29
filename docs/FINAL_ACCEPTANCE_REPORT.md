# DreamCart — Final Acceptance Report

Written at the end of Phase 12 (2026-10-29) against `main` at Phase 11 (`c48ad00`) plus the Phase 12 branch. It says what is finished, what was verified and how, what was not, and what only people can settle.

## Verdict

**Status: `READY_FOR_RELEASE_REVIEW` (engineering).** The MVP is functionally complete, tested and documented. **It is not ready for the owner to approve a public release**, and this report does not claim `READY_FOR_OWNER_RELEASE_APPROVAL`, because four things the code cannot supply are open:

1. `BLOCKED_EXTERNAL_DEPENDENCY` — **no verified real catalog and no image rights.** The product runs only on labeled fictional fixtures; a release build refuses to start without real data (demonstrated). A public release cannot rest on fictional data.
2. `PENDING_HUMAN_VALIDATION` — the **pilot** (gate G14) has not run; **real-device**, **screen-reader** and **storage-eviction** checks have not been done.
3. `PENDING_HUMAN_VALIDATION` — the **deployment** has not been checked from a networked environment (the authoring environment cannot reach `*.vercel.app`); rollback has not been rehearsed.
4. **Owner decisions:** acceptance of the residual risks, the offline-shell question, a takedown contact, and the Vercel production-branch setting (below).

It becomes `READY_FOR_OWNER_RELEASE_APPROVAL` when A and D of `docs/RELEASE_CHECKLIST.md` are complete and C passes on the release candidate.

**Nothing was published to production by this work.** Only pull-request previews exist by design. One caution: if a Vercel project's production branch is `main`, merges to `main` may already have created *production* deployments of the synthetic build; check the project settings (checklist C). No Vercel project was created, changed, disconnected or deleted.

## Phases

| Phase | Result | Merge |
|---|---|---|
| 0 Discovery and specification | VERIFIED | `0273efe` |
| 1 Engineering foundation | VERIFIED | `569b9ba` |
| 2 Design system and prototype | VERIFIED (owner-approved design) | `8506750` |
| 3 Domain and simulation core | VERIFIED | `70abbf1` |
| 4 Persistence and data portability | VERIFIED | `f75c612` |
| 5 Catalog and discovery engine | ENGINEERING_COMPLETE; real-data acceptance BLOCKED_EXTERNAL_DEPENDENCY | `9834318` |
| 6 Production storefront | VERIFIED (on fixtures) | `42df549` |
| 7 Persistent cart and manual import | VERIFIED (on fixtures) | `6416b97` |
| 8 Virtual checkout and orders | VERIFIED (on fixtures) | `17cacd6` |
| 9 Virtual shipping and My Collection | VERIFIED (on fixtures) | `743e26d` |
| 10 QA, security and hardening | ENGINEERING_COMPLETE; device/screen-reader items PENDING_HUMAN_VALIDATION | `f13f39d` |
| 11 Pilot plan and polish | ENGINEERING_COMPLETE; the pilot PENDING_HUMAN_VALIDATION | `c48ad00` |
| 12 Release readiness | ENGINEERING_COMPLETE (this report, checklist, deployment tooling) | this PR |

## Acceptance gates (PRD §9)

| Gate | Status | Evidence / what is missing |
|---|---|---|
| G1 simulation label on every surface | Verified (automated) | Smoke checks the notice on every route; watermark and `DC-V-` code asserted on checkout and orders; backup carries the notice. Pilot confirmation pending. |
| G2 search and exact-variant matching | Verified on fixtures | 42 search fixtures and property tests pass. Real-catalog fixtures need the real catalog. |
| G3 pricing, currency, cart | Verified | Fixture suites pass (unit); cart and checkout journeys in three engines. |
| G4 configurator | Verified | Fixture suites pass; add-to-cart only from a resolved variant's offers; conflict flow tested in the browser. |
| G5 provenance on every price; no rating, sales or discount | Verified by construction and specs | Every price carries a provenance line (asserted in storefront and cart specs); no rating, sales or discount element exists in the code (reviewed; no dedicated automated scan). |
| G6 only CLEARED images; build guards | Verified | Catalog view filters to CLEARED; orders re-check rights; the validator rejects malformed rights, missing attributes and `fx-` ids; the release flag refuses fixtures (run). No real image exists yet. |
| G7 one order per key | Verified | Transactional `placeOrder` tests; double click and two tabs in real engines. |
| G8 survive refresh; never regress | Verified | Clock-controlled specs: progress, clock set back, cancel holds; stored high-water mark. |
| G9 export/import; quarantine | Verified | Round trip into a clean browser context; hostile files rejected with nothing changed; corrupted records quarantined. |
| G10 full journey, zero cross-origin requests | Partial | The 21-step journey passes in Chromium, Firefox and WebKit with zero cross-origin requests, at a desktop viewport. At phone width the pages are checked for layout and accessibility and parts of the flow run (add, import), but **the whole journey has not been run at a phone viewport**, and no real device was used. |
| G11 URL safety; no server fetch | Verified | Validator unit tests; hostile links in the browser; there is no server route that fetches. |
| G12 accessibility | Automated verified; manual pending | axe: 0 violations on 14 routes × 5 widths and on data-filled pages; keyboard specs. Screen-reader pass pending. |
| G13 performance | Met in the lab | LCP ≤ 2.1 s, CLS 0.00, slowest interaction 128 ms on a throttled mid-range phone profile (QA report §3). Real-device numbers pending. |
| G14 pilot | **Not verified** | Plan ready (`docs/PILOT_PLAN.md`); no sessions run. |
| G15 no paid dependency; documented | Verified for the code | `npm audit` 0, licences reviewed, no paid service provisioned, instructions in README/RUNBOOK. The owner's Vercel plan is not known to this work: confirm it is the free tier. |

## What was verified, and how

Unit and integration tests (641), the production build and route smoke, three-engine browser suites in CI behind one required check, axe scans, keyboard, failure-injection and performance specs, the source-hygiene guards, dependency audit and licence audit, screenshot review of every new screen, and a release-build refusal check. Details and numbers: `docs/QA_REPORT.md`.

## Known open issues

- **Firefox page-load stalls in CI (unexplained).** 1–7 Firefox tests per run time out on `page.goto` and pass on retry (counts 1, 1, 4, 4, 7, 6, 7 across PRs #7–#12); Chromium and WebKit do not. A hypothesis that the `useNow` render-loop bug (fixed in Phase 11, QA F12) caused them was **tested and not supported**: the count stayed at 7 afterwards. The cause is not known. CI retries once, reports them as flaky and keeps traces; they have not hidden a failure so far, but they cannot be ruled out as a real Firefox-only problem until someone reads the traces on a real Firefox.
- No offline app shell (decision for the owner).
- `'unsafe-inline'` CSP (accepted risk with tested compensating controls).

## Decisions and actions for the owner

1. Supply the verified catalog and image rights (or decide to launch with placeholders only, which still needs real products and prices).
2. Run the pilot, the device checks and the screen-reader pass; or tell engineering to adjust the plan.
3. Check the Vercel production-branch setting and the plan (free tier), rehearse the rollback, and run the deployment checks (`docs/RUNBOOK.md`).
4. Add a takedown contact; read the source terms (RT-5).
5. Decide the offline-shell question and accept or reject the residual risks.
6. Give explicit launch authorization, which this work will not presume.
