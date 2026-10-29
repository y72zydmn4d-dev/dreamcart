# Phase 1 Entry Criteria and Scope

**Status:** Phase 0 output (revised after self-review). Phase 1 does not start until the owner approves PR #1 and the gates below read "Met". Roadmap: `docs/ROADMAP.md`.

## Entry gates

| # | Gate | Status |
|---|---|---|
| E1 | Owner reviews and approves the PRD, architecture, schema, and roadmap (PR #1) | Pending owner |
| E2 | Owner answers pending decisions **P-9** (tooling and repository) and **P-10** (revised roadmap); other pending decisions are due at their own phases (see `DECISIONS.md`) | Pending owner |
| E3 | Fixtures accepted as the conformance contract (`node tools/verify-fixtures.mjs` passes) | Done; pending owner acceptance |
| E4 | ADR-005 (stack) and ADR-012 (language) promoted to Accepted, or the owner states they may proceed as Proposed | Pending owner |
| E5 | Primary-source provider research (RT-1) is **not** required to start Phase 1 | Met by design |

## Known blockers (documented, not worked around)

| ID | Blocker | Blocks | Next step |
|---|---|---|---|
| B1 | 0 of 20 minimum verified catalog entries; needs a human to record live listings | Phase 5 | Owner curates with `CURATION_PROCESS.md` (RT-3); minimum 10 entries across 3 categories to start Phase 5 |
| B2 | Image rights unresolved for every product; premium brands raise the risk | Phase 5, and visual polish in Phase 6 | RT-2: permissions, open licenses, owner photography, `brand_art` |
| B3 | Primary provider terms unread (network allowlist blocked the official hosts) | any provider integration | RT-1: allow the hosts or read manually |
| B4 | Visual direction not yet designed or approved | Phase 6 | Phase 2 deliverable |
| B5 | Next.js CSP behavior for the pinned version unverified | CSP finalization | Phase 1 spike (ADR-011) |

B1–B3 do not block Phase 1, 2, 3, or 4: they work against synthetic fixtures that are never shipped.

## Phase 1 scope — Engineering foundation only

1. Scaffold Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui; ESLint, Prettier, Vitest, Playwright (Chromium, Firefox, WebKit, Pixel-class and iPhone-class projects); GitHub Actions CI.
2. Module skeleton and boundary enforcement (ESLint restricted imports plus a domain-purity test).
3. `platform/i18n/vi.ts` dictionary and `t()` helper; Vietnamese simulation-notice strings from the PRD.
4. Security-header skeleton and the CSP spike (ADR-011): choose the script policy and record the result.
5. App shell with the simulation banner; `.env.example`; run instructions in the README.
6. Keep `tools/` and `fixtures/` working (a CI job runs `tools/verify-fixtures.mjs` until Phase 3 replaces it with Vitest).

**Out of Phase 1:** domain logic, persistence, product UI, real catalog data, Supabase, deployment, any provider integration, installing design skills.

## Phase 1 acceptance and Definition of Done

- `lint`, `typecheck`, `test`, and `build` pass locally and in CI; Playwright smoke passes on all five projects.
- Adding a React import to a `domain` folder fails the boundary test (demonstrated).
- CSP and security headers present; spike decision and rationale recorded in ADR-011.
- No third-party runtime requests; no secrets; dependency versions pinned and recorded.
- Shared Definition of Done from the roadmap; owner reviews the pull request.

## Phase 2 entry preview (UX/UI design system and specification)

Phase 1 merged; image-direction input from RT-2 if available; owner time to review designs. Phase 3 (domain core) can begin while the owner reviews Phase 2.
