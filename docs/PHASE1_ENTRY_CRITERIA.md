# Phase 1 Entry Criteria and Scope

**Status:** Entry gates met by the owner's final decisions (`docs/DECISIONS.md`, P-1…P-10). Roadmap: `docs/ROADMAP.md`.

## Entry gates

| # | Gate | Status |
|---|---|---|
| E1 | Phase 0 PR reviewed and merged by owner authorization | Met when PR #1 is merged |
| E2 | Tooling and repository decided (P-9): private repository, Node.js 24 LTS, npm, committed lockfile, `npm ci` in CI | Met |
| E3 | Roadmap approved (P-10) | Met |
| E4 | ADR-005 (stack) and ADR-012 (language) Accepted | Met |
| E5 | Fixtures are the conformance contract: `node tools/verify-fixtures.mjs` passes | Met |
| E6 | Provider research (RT-1) is not required to start Phase 1 | Met by design |

## Known blockers (documented, not worked around)

| ID | Blocker | Blocks | Next step |
|---|---|---|---|
| B1 | 0 of 20 minimum verified catalog entries; needs a human to record live listings | Phase 5 | Owner curates with `CURATION_PROCESS.md` (RT-3); minimum 10 entries across 3 categories to start Phase 5 |
| B2 | Image rights unresolved for every product; premium brands raise the risk | Phase 5, and visual polish in Phase 6 | RT-2: permissions, open licenses, owner photography, `brand_art`; high-quality placeholders meanwhile (P-4) |
| B3 | Primary provider terms unread (network allowlist blocked the official hosts) | any provider integration | RT-1: allow the hosts or read manually |
| B4 | Visual design not yet produced or approved | Phase 6 | Phase 2 deliverable |
| B5 | Next.js CSP behavior unverified | CSP finalization | Evaluated in Phase 1 against the pinned version (ADR-011) |

B1–B3 do not block Phases 1–4: they work against synthetic fixtures that are never shipped.

## Phase 1 scope — Engineering Foundation

1. Next.js (App Router) with TypeScript strict, Tailwind CSS, a shadcn/ui foundation, ESLint, Prettier, Vitest, and npm scripts, on Node 24 LTS with a committed lockfile.
2. Modular-monolith directory structure and boundary enforcement (ESLint restricted imports plus a domain-purity test).
3. Minimal application shell: root layout, header and navigation, footer, responsive container, semantic design tokens, accessible focus states, loading and not-found states, and a clearly visible simulation notice.
4. Honest placeholder route skeletons: `/`, `/search`, `/product/[id]`, `/cart`, `/checkout`, `/orders`, `/collection`, `/about`. No fixture data is presented as real marketplace data.
5. Centralized Vietnamese dictionary (`t()` helper, no i18n framework).
6. Security baseline: security headers, a safe-URL boundary, and a CSP evaluated against the pinned Next.js, with tradeoffs documented briefly.
7. Tests: meaningful Vitest unit tests; the existing fixture verifier and docs checker wired into npm scripts.
8. GitHub Actions: `npm ci`, lint, typecheck, test, build, fixtures, docs.
9. README run instructions.

**Out of Phase 1:** full homepage design, search engine, catalog data, configurator, cart persistence, checkout and order engine, shipping simulation UI, My Collection, authentication, Supabase, marketplace APIs, scraping, payments, deployment, installing `ui-ux-pro-max-skill`, Playwright journeys.

## Phase 1 acceptance

The application starts; strict typecheck, lint, unit tests, and production build pass; the fixture verifier and docs checker pass; basic routes render; the shell is responsive and navigation is accessible; no payment or marketplace integration exists; no credentials or paid services are required; CI is configured and its actual status reported; Phase 0 documentation and fixtures are intact; the pull request contains only Phase 1 work.

## Phase 2 entry preview (UI/UX Design System)

Phase 1 merged. Phase 2 evaluates and integrates `ui-ux-pro-max-skill` (P-7).
