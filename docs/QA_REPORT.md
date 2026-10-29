# DreamCart — Phase 10 QA, Security and Hardening Report

The one system-wide audit (earlier phases only had a concise self-review). Written 2026-10-29 against `main` at Phase 9 (`743e26d`) plus the Phase 10 branch. **Status: ENGINEERING_COMPLETE for what could be automated; items marked `PENDING_HUMAN_VALIDATION` or `BLOCKED_EXTERNAL_DEPENDENCY` were not and could not be checked here.** Nothing in this report claims a check that was not run.

## 1. What was run

| Check | Result | Where |
|---|---|---|
| Lint, typecheck, format, docs check | pass | CI `quality` job, `npm run verify` |
| Unit, property and fixture-conformance tests | 637 pass (35 files) | `npm test` |
| Production build, route smoke (14 routes 200, 5 routes 404, headers, shell) | pass | `npm run smoke` |
| Real-browser suite (139 specs per engine; 8 of them Chromium-only performance) | Chromium 139/139 locally, repeated; Firefox and WebKit run in CI only | `tests/browser/*.spec.ts` |
| 21-step end-to-end journey with a controlled clock, zero cross-origin requests | pass | `journey.spec.ts` |
| Accessibility scan (axe) | 0 violations on 14 routes × 5 widths, plus cart/checkout/order/collection/settings with data | `storefront.spec.ts`, `cart.spec.ts`, `orders.spec.ts`, `journey.spec.ts` |
| Keyboard operability | skip link, dialog focus containment and return, whole checkout by keyboard, focus ring on tabbed controls | `keyboard.spec.ts` |
| Failure injection | no IndexedDB, full storage, corrupted records, database from a newer version | `resilience.spec.ts` |
| Performance, mid-range phone profile | see §3 | `performance.spec.ts` |
| Dependency vulnerabilities | `npm audit`: 0 (production and all) | CI (informational) |
| Dependency licenses | 61 production packages, all permissive except a reviewed exception (§4) | `npm run licenses` (now in CI) |
| Source hygiene guards | no `dangerouslySetInnerHTML`, `innerHTML=`, `eval`, `new Function`, string timers, `document.write`; `javascript:` only in the URL validator; every `target=_blank` has `noopener noreferrer`; no secret-looking literals; env vars limited to the release flag | `src/config/code-hygiene.test.ts` (mutation-checked) |

**Not run, and why**
- Firefox and WebKit locally: the authoring environment cannot download them. CI runs both (one job per engine since Phase 10).
- Real devices (iOS Safari, Android Chrome), storage-eviction behaviour, touch and on-screen-keyboard behaviour: no device access. `PENDING_HUMAN_VALIDATION`.
- Screen-reader pass (VoiceOver, TalkBack, NVDA): not possible here. axe plus the keyboard specs cover structure, not spoken output. `PENDING_HUMAN_VALIDATION`.
- Lighthouse and field (real-user) performance: lab numbers below come from Chromium DevTools throttling only.
- Penetration testing or fuzzing beyond the hostile-input specs.
- A Vercel preview deployment check (Phase 12).

## 2. Findings

| ID | Area | Severity | Finding | Status |
|---|---|---|---|---|
| F1 | Performance | medium | CLS 0.30 on home and product pages (G13 target 0.1): the footer sat at the bottom of the viewport under the short loading skeleton, then moved when the page streamed in. | **Fixed**: full-height loading skeleton, minimum heights for client-loaded pages. CLS is now 0.00 on all measured pages. |
| F2 | CI | medium | The single CI job hit its 15-minute limit as the browser suite grew and was cancelled (no verdict). | **Fixed**: 30-minute limit, then the job was split into `quality` + one `browsers` job per engine + an aggregate `Verify (Node 24)` that keeps the required check name. |
| F3 | Cross-browser | medium | Firefox `page.goto` stalls (45 s) in CI, 1–4 tests per run, different pages each time, always passing on retry; Chromium and WebKit never stall. Not reproducible locally (no Firefox). Cause unknown: product defect and runner contention are both possible. | **Open.** Mitigations: one CI retry (reported as flaky), traces uploaded, one job per engine. Needs a look at the traces or a real-device run. |
| F4 | Accessibility | low | Hovered default buttons faded the accent colour and dropped white-on-accent text to 4.42:1. | **Fixed** (Phase 7): hover and press darken instead. |
| F5 | Security | accepted risk | The CSP allows `'unsafe-inline'` scripts (ADR-011). Re-examined this phase, see §5. | **Unchanged; owner risk acceptance required at release review.** |
| F6 | Offline | decision | There is no service worker. Orders and the collection are read from IndexedDB with no network, but a closed browser cannot open the app offline. PRD J7 says "the collection works offline". | **Open decision** for the owner: accept as is, or add a small offline shell (new scope). |
| F7 | Data | note | A transient second copy of the mobile configurator bar was seen once under load in an existing test (not reproduced; no hydration errors in a console probe). The test now waits for hydration to leave one. | Monitor. |
| F8 | Licensing | low | 14 production packages are LGPL-3.0-or-later: the prebuilt libvips binaries (`@img/sharp-libvips-*`), optional dependencies Next.js uses for server-side `next/image`. DreamCart does not use `next/image`; the binaries run on the host, never reach the browser, and are dynamically linked. | **Reviewed exception**, encoded in `tools/licenses.mjs`. |
| F9 | Data | open | Browser storage can be evicted. Mitigations exist (persistence request, export, "had data, now empty" notice, memory-fallback banner) but real-device eviction behaviour is untested. | `PENDING_HUMAN_VALIDATION`. Re-evaluation trigger: if the pilot shows data loss, the owner decides whether to pull cross-device sync forward. |
| F10 | Content | blocker for release | `data/catalog` is empty; all journeys run on labeled synthetic fixtures. A public release cannot rest on fictional data. | `BLOCKED_EXTERNAL_DEPENDENCY` (owner curation and image rights). |
| F11 | Privacy | low | There was no privacy notice. | **Fixed**: `/privacy`, linked in the footer. |
| F12 | Reliability | medium | Found after the Phase 10 report was first written, by WebKit and Firefox failures in CI (the order page lost its state element after the clock moved): the `useNow` hook handed React a new subscribe function on every render and cached the clock in a way that was cleared on each resubscribe, so in engines with different clock behaviour it could re-render in a loop. It was mounted on every page through the delivery notice. | **Fixed (Phase 11)**: the hook's value is now a pure function of the clock (rounded to the interval) with one stable subscription. Possibly related to the F3 Firefox stalls, which became more frequent after the delivery notice was added; to be re-measured in CI. |

No critical or high security finding was identified.

## 3. Performance (lab, Chromium, 390×844, 4× CPU slowdown, 1.6 Mbit/s, 150 ms latency)

| Page | LCP | CLS | JS transferred | CSS transferred | Cross-origin requests |
|---|---|---|---|---|---|
| `/` | 1.0 s | 0.00 | 230 kB | 10 kB | 0 |
| `/search` | 2.1 s | 0.00 | 244 kB | 10 kB | 0 |
| `/product/fx-aero` | 0.6 s | 0.00 | 244 kB | 10 kB | 0 |
| `/cart`, `/checkout`, `/orders`, `/collection` | 0.6 s | 0.00 | 237–249 kB | 10 kB | 0 |

Slowest interaction event on search → filter → product → option: 128 ms (target INP ≤ 200 ms). G13 targets (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms) are met in the lab. The automated test enforces CLS ≤ 0.1, JS ≤ 300 kB, CSS ≤ 20 kB and zero cross-origin requests strictly, and uses looser guards for LCP (4 s) and interaction time (500 ms) because those depend on the machine running the test. `/search` is the closest to its limit because results render on the client from the URL.

## 4. Dependencies

`npm audit`: 0 vulnerabilities. 61 production packages: MIT 22, Apache-2.0 20 (+4 combined with LGPL), LGPL-3.0-or-later 10 (+4 combined), ISC 2, and one each of CC-BY-4.0, BSD-3-Clause, 0BSD. The only non-permissive licences are the reviewed libvips exception (F8). Versions are pinned exactly; `package-lock.json` is committed and CI installs with `npm ci`.

## 5. Security review

- **Headers (verified on the real build by `npm run smoke` and unit tests):** CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, geolocation, payment, USB denied), COOP/CORP same-origin; `X-Powered-By` removed. HSTS is left to the host.
- **CSP revisit (ADR-011).** Question: can `'unsafe-inline'` be dropped? Findings: Next.js nonces need dynamic rendering of every page (and are incompatible with Partial Prerendering); the experimental SRI option did not cover the inline bootstrap scripts in this static build (checked in Phase 1 and re-read against the bundled Next.js 16.4.3 guide); a build-time hash list cannot cover pages whose inline payload depends on the request (`/orders`, `/orders/[id]`). The remaining option is making the whole app dynamic with a nonce proxy: it works, costs static caching, adds function invocations on the host, and is not needed while there is no user-generated HTML. **Decision: keep the policy; strengthen the compensating controls and make them tests**, as listed in §1 (hygiene guards, `SafeUrl` at every link, hostile import/URL specs, React escaping verified with markup-looking titles, zero third-party requests asserted in the journey, orders and performance specs). Revisit if accounts or user-generated content arrive.
- **Untrusted input:** URLs (`SafeUrl`: http/https only, no credentials, length bound, tracking parameters removed), imported products (reserved attribute names refused, bounded text), backup files (size cap, structure, schema, integrity and URL re-validation before anything is stored), URL query state (parsed as untrusted, never echoed), order and cart records read back from IndexedDB (schema-validated; invalid ones quarantined, not shown).
- **No server surface:** there is no API route, no server-side fetch of user URLs, no cookie, no session and no secret in the repository or the build (guarded by test).
- **Non-negotiable rules** (CLAUDE.md) and the evidence for each:
  1. No real payment: payment is a label ("Dream Credits (ảo)"); no payment code or dependency exists (hygiene and dependency review).
  2. No real orders: orders exist only in IndexedDB; checkout makes no network request (asserted).
  3. No courier communication: no carrier names or tracking numbers anywhere; delivery is a clock-derived simulation.
  4. Virtual disclosure: banner on every page, watermark on checkout and orders, `DC-V-` codes, backup notice; asserted per route.
  5. No fabricated sources or prices: fixtures are labeled "Dữ liệu mẫu"/"Giá mẫu" and a release build refuses synthetic data; imported items are labeled unverified.
  6. Licensing: only CLEARED media renders; none exists yet; `/credits` states that honestly.
  7. No exposed secrets: none exist; guarded by test.
  8. No paid services: none provisioned (only the preview deployments that already existed).

## 6. Residual risks for the owner's acceptance (at release review)

1. `'unsafe-inline'` CSP (F5), with the compensating controls above.
2. Firefox CI stalls unexplained (F3) and unmeasured real-device behaviour, storage eviction and screen-reader output (F9, §1).
3. No offline app shell (F6).
4. The product runs on fictional data until the owner supplies a verified catalog and image rights (F10).
