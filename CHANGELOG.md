# Changelog

DreamCart is pre-release: nothing has been published to production, and the product still runs on labeled synthetic fixtures until a verified real catalog and image rights exist (see `docs/EXECUTION_STATUS.md`). Entries are grouped by phase; each phase was one pull request.

## Phase 12 — Release readiness

- Final acceptance report and release checklist; overall status `READY_FOR_RELEASE_REVIEW` (the real catalog, pilot and device checks are still open).
- CLAUDE.md records the owner's authorization of Vercel Preview deployments; production publication still needs explicit approval.
- `SMOKE_BASE_URL`, `SMOKE_MODE=release` and `E2E_BASE_URL` check a deployment with the existing smoke and browser suites; release builds do not publish the `/design` gallery; takedown path added to the runbook.

## Phase 11 — Pilot plan and polish

- Added the human pilot plan, consent text, task script, severity scale and report template (`docs/PILOT_PLAN.md`). The pilot itself needs people and is `PENDING_HUMAN_VALIDATION`.
- Order and collection items now read in the catalog's own words ("13 inch · Chip FX1 · 16 GB") instead of stored codes, imported items read as the user wrote them, and items show the same original illustration as the storefront.
- One Vietnamese spelling convention throughout (xoá, huỷ, hoá, tuỳ).
- The backup file picker speaks Vietnamese and shows the chosen file name; the delete-order control is a plain text action.
- README and status documents brought up to date.

## Phase 10 — QA, security and hardening (#11)

- Layout shift on home and product pages fixed (CLS 0.30 → 0.00). Lab LCP ≤ 2.1 s, slowest interaction 128 ms, about 245 kB of JavaScript.
- Failure-injection tests (no IndexedDB, full storage, corrupted records, a database from a newer version), keyboard tests, performance budgets.
- Source-hygiene guards for the `'unsafe-inline'` CSP tradeoff, production licence audit, `/privacy` page, runbook with a user backup guide, QA report. CSP re-examined: unchanged, risk recorded for the owner.
- CI split into a quality job and one browser job per engine behind the same required check; the job timeout that was cancelling runs is gone.

## Phase 9 — Virtual tracking and My Collection (#10)

- Simulated delivery timeline per scenario (Fast: you press each step; Quick ≈ 3 minutes; Relaxed ≈ 1 hour), never going backwards, cancellable only while confirmed, preparing or packed.
- My Collection derived from delivered orders, one card per delivered item; a once-per-order in-app delivery notice.
- A 21-step real-browser journey test with a controlled clock.

## Phase 8 — Virtual checkout and orders (#9)

- `/checkout` with scenario, virtual destination, payment label and a required acknowledgement; one idempotent order per cart even under double clicks and two tabs.
- Orders list and detail from stored snapshots, cancel and delete with confirmation, `/settings` with backup export, restore (merge or confirmed replace) and delete-all, and a notice when a browser that had orders is empty.

## Phase 7 — Persistent cart and manual import (#8)

- Cart on IndexedDB with cross-tab safety, per-source grouping, quantity limits, explicit acceptance of changed prices, per-currency totals.
- `/import`: paste a link, see it cleaned, store it as an unverified item; nothing is fetched.

## Phase 6 — Production storefront (#7)

- Home, search with facets and URL state, product pages with the configurator, per-variant merchant offers with provenance, credits page, shared loading, empty and error states; real-browser tests in three engines.

## Phases 0–5 — Foundation

- Specification and decisions (0), engineering foundation (1), design system and prototype (2), domain and simulation core (3), local persistence and data portability (4), catalog validation, ingestion and discovery engine (5).
