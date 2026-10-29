# DreamCart — Release Checklist

For the owner's decision to publish a public, free-tier, clearly simulated release (ROADMAP P12). **Nothing has been published to production, and nothing here authorizes it.** Items are marked: `[x]` done with evidence, `[ ]` needs a person or external input, `[~]` could not be verified from the authoring environment. Evidence and the overall verdict are in `docs/FINAL_ACCEPTANCE_REPORT.md`.

## A. Content and rights (blocks release)

- [ ] **Verified catalog of about 20–30 premium products** (RT-3): each with a source URL, observation date and price provenance. Today `data/catalog` is empty and `npm run catalog:check` reports 0 of 20 (`BLOCKED_EXTERNAL_DEPENDENCY`; process in `docs/CURATION_PROCESS.md`).
- [ ] **Image rights** (RT-2): every product image `CLEARED` with evidence, or a recorded placeholder decision; the owner signs the rights records. Until then every product shows the designed placeholder and `/credits` says so.
- [ ] **Price-snapshot basis and source terms** read and recorded per source (P-3, RT-5); `unknown` sources cannot be carted.
- [ ] **Terms and legal check** (RT-5): the owner or counsel confirms the price-snapshot basis, image terms and hosting terms (noncommercial use of the free tier). The privacy notice (`/privacy`) matches the data inventory in `docs/ARCHITECTURE.md` §9.
- [ ] **A takedown contact** added to `/credits` and `/privacy` (none exists yet; see `docs/RUNBOOK.md` "Takedown and complaints").

## B. Engineering (done)

- [x] Every phase merged through a reviewed pull request with green CI: Phases 0–11 (SHAs in `docs/EXECUTION_STATUS.md`).
- [x] `npm run verify` passes: lint, typecheck, 641 unit tests, docs check, format check, licence audit, build, route smoke.
- [x] Real-browser suite in Chromium, Firefox and WebKit in CI (one job per engine, aggregated behind the required check `Verify (Node 24)`).
- [x] A release build refuses synthetic data (`NEXT_PUBLIC_DREAMCART_RELEASE=1 npm run build` fails with "A release build needs a real catalog": run in Phase 12) and does not publish the `/design` gallery.
- [x] Simulation notice on every route, the per-route label checks, the 21-step journey with zero cross-origin requests, hostile-input and failure-injection specs, keyboard specs, performance budgets (QA report).
- [x] `npm audit`: 0 vulnerabilities; production licences reviewed (one documented exception).
- [x] No secrets, accounts or paid services anywhere in the repository or build.

## C. Verify the deployment (owner or a networked session)

The authoring environment's network policy blocks `*.vercel.app`, so no deployed URL could be checked from there. Vercel's bot reports both preview builds `Ready` on every pull request, which shows the build succeeds on Vercel, not that the deployed site behaves.

- [~] `SMOKE_BASE_URL=https://<preview-host> npm run smoke` passes (routes 200, 404s, simulation notice, security headers including the CSP, no third-party script).
- [~] `E2E_BASE_URL=https://<preview-host> npx playwright test` passes in all three engines against a *synthetic* preview (the journey, orders, failure injection, keyboard; the performance spec runs from a machine near the host and is advisory against a remote URL).
- [~] For the release candidate: `SMOKE_BASE_URL=https://<host> SMOKE_MODE=release npm run smoke` passes (no fixtures, no `/design`).
- [~] Headers on the deployed URL match `src/config/security-headers.ts` (HSTS is added by the host).
- [ ] **Vercel production branch:** check the project settings. If the production branch is `main`, every merge to `main` already builds a *production* deployment of the synthetic build. Decide whether that is acceptable (it is labeled "Dữ liệu mẫu" everywhere), or point production at a protected release branch / disable auto-promotion until release.

## D. People-only validation

- [ ] **Pilot** (`docs/PILOT_PLAN.md`): ≥80% finish unaided, 100% understand nothing real happened, no personal data (G14); severity-1/2 findings fixed; a second short session on the real catalog.
- [ ] **Real devices:** iOS Safari and Android Chrome (touch, on-screen keyboard, storage-eviction behaviour, install/offline expectations).
- [ ] **Screen reader pass** (VoiceOver and TalkBack or NVDA).
- [ ] Decide on an **offline app shell** (no service worker today; data is local but a closed browser cannot open the app offline).

## E. Security and privacy acceptance

- [ ] The owner accepts the residual risks in `docs/QA_REPORT.md` §6: the `'unsafe-inline'` CSP (compensating controls are tested), the unexplained Firefox page-load stalls in CI, unmeasured real-device behaviour.
- [x] Privacy notice published (`/privacy`); no cookies, analytics or third-party requests.

## F. Release mechanics

- [ ] Release is built with `NEXT_PUBLIC_DREAMCART_RELEASE=1` on the owner-approved branch.
- [ ] Custom domain (optional) and the free plan confirmed by the owner. No paid add-on is enabled.
- [~] **Rollback verified:** the procedure is documented (`docs/RUNBOOK.md` §3: promote the previous deployment in Vercel, or revert the merge); it has not been exercised. Rehearse it once on a preview before launch.
- [ ] Bugfix-only cadence after launch; every fix through a pull request and the full CI.

## G. Sign-off

| Role | Decision | Date |
|---|---|---|
| Owner: catalog, rights and terms (A) | | |
| Owner: deployment verified (C) and rollback rehearsed (F) | | |
| Owner: pilot and device validation (D) | | |
| Owner: residual risks accepted (E) | | |
| Owner: explicit launch authorization | | |
