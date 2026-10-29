# Phase 1 Entry Criteria and Scope

**Status:** Phase 0 output. Phase 1 does not start until the owner approves this PR and the entry gates below read "Met".

## Entry gates

| # | Gate | Status |
|---|---|---|
| E1 | Owner reviews and approves `PRD.md` | Pending owner |
| E2 | ADRs 001–014 written with rationale and tradeoffs; owner promotes Proposed → Accepted as appropriate | Drafted; pending owner |
| E3 | Provider matrix reviewed; no unknown right is shown as permitted | Done in docs; pending owner review |
| E4 | Catalog and image provenance schemas accepted | Drafted; pending owner |
| E5 | 30 search fixtures accepted as the matching contract | Done; pending owner |
| E6 | Tooling confirmed: Node 22 LTS, npm, repository visibility (CI minutes) | Owner input needed |
| E7 | Primary-source research (R1–R4 in the matrix) is **not** required to start Phase 1 | Met by design |

## Known blockers (documented, not worked around)

| ID | Blocker | Blocks | Next step |
|---|---|---|---|
| B1 | 0 of ~20 verified catalog entries; needs a human to record live listings | Phase 2 | Owner curates with `CURATION_PROCESS.md`; minimum 10 entries across 3 categories |
| B2 | Image rights unresolved for every product | Final visual polish in Phase 2 | Research R2, R3; owner photography; placeholders meanwhile |
| B3 | Primary provider terms unread (network allowlist blocked the official hosts) | Any provider integration | Allow hosts or read terms manually (R1–R4) |
| B4 | Visual direction not yet approved | Phase 2 UI build | Phase 1 deliverable: UX spec and visual direction |
| B5 | Next.js CSP behavior for the pinned version unverified | CSP finalization | Phase 1 spike (ADR-011) |

B1 and B2 do not block Phase 1: the domain core and persistence are built and tested against synthetic fixtures that are never shipped.

## Phase 1 scope — Foundation

1. Scaffold Next.js + TypeScript (strict) + Tailwind + shadcn/ui; ESLint, Prettier, Vitest, Playwright; GitHub Actions CI.
2. Module boundaries and enforcement (ESLint rules plus a domain-purity test).
3. `platform/i18n/vi.ts` dictionary and `t()` helper; Vietnamese simulation-notice strings from the PRD.
4. Domain core with unit tests: money (integer minor units, currency exponents), price states and eligibility, search matching passing 30/30 fixtures, cart, order snapshot builder, simulation state function (including time-shift and monotonic tests), URL validator with malicious fixtures.
5. IndexedDB adapters for `CartRepository`, `OrderRepository`, `PortabilityRepository`, with the shared contract suite, concurrent-`placeOrder` test, migrations, quarantine, export/import round trip.
6. CSP spike (ADR-011): choose script policy, document result.
7. UX specification: screen inventory (8 screens), visual direction, design tokens, wireframes; owner approves before Phase 2 UI.
8. Catalog validation script and `fx-` guard, run against fixtures.

**Out of Phase 1:** product UI beyond a thin shell, real catalog data, Supabase, deployment, any provider integration.

## Phase 1 Definition of Done

- All acceptance criteria above satisfied; gates G2, G5, G6, G7, G9 pass at unit/integration level.
- Lint, typecheck, tests, and build green in CI and locally.
- No critical errors; no secrets; no network calls to third parties.
- Architecture documents updated for any deviation; ADRs adjusted.
- Pull request reviewed by the owner.

## Phase 2 entry preview

At least 10 verified catalog entries covering all three categories, each with a resolved image status; the owner-approved UX specification; Phase 1 merged.
