# DreamCart

**Shop the feeling. Not the spending.**

DreamCart is a virtual shopping experience built around
real products, reference prices, simulated checkout,
virtual shipping, and personal collections.

**Every transaction is a simulation.** No payments, no orders, no deliveries.

## Core Principles

- Real products and verifiable sources
- No real payments or purchases
- No physical shipping or delivery
- Transparent shopping simulation
- Visually rich, polished product experience
- Privacy-conscious, local-first design
- Low-cost, maintainable architecture

## Technology Direction

- Next.js + React + TypeScript
- Tailwind CSS + shadcn/ui + Zod
- Repository-hosted catalog, IndexedDB for cart and virtual orders
- Vercel (free tier) when deployment is authorized
- Supabase: deferred to a later phase

UI language: Vietnamese-first. See `docs/decisions/ADR-005-technology-stack.md`.

## Project Status

Phase 0 (discovery and specification) is complete. Phase 1 (engineering foundation) is implemented and awaiting review; Phase 2 (UI/UX design system) is next.

## Documentation

| Document | Purpose |
|---|---|
| `docs/PRD.md` | MVP requirements, owner-confirmed UX direction, journeys, acceptance gates |
| `docs/ROADMAP.md` | Phase-by-phase plan to a public MVP, critical path |
| `docs/ARCHITECTURE.md` | Layers, persistence, security headers, testing |
| `docs/CATALOG_SCHEMA.md` | Catalog, pricing, order-snapshot, image-provenance, and configurator rules |
| `docs/CURATION_PROCESS.md` | How the first 20–30 products are verified |
| `docs/PRODUCT_SOURCE_MATRIX.md` | Provider feasibility and licensing evidence |
| `docs/SEARCH_FIXTURES.md` | Exact-variant matching rules and search fixtures |
| `docs/DECISIONS.md` | ADR index, final owner decisions P-1…P-10, Blueprint reconciliation |
| `docs/PHASE1_ENTRY_CRITERIA.md` | Gates, blockers, and scope for Phase 1 |
| `docs/PRODUCT_BLUEPRINT.md` | Original v1.0 vision (amended; see banner) |

## Local development

**Requirements:** Node.js 24 LTS (see `.nvmrc`) and npm. No environment variables, accounts, Supabase project, or API credentials are needed.

```bash
npm ci          # reproducible install from package-lock.json
npm run dev     # development server at http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run lint` | ESLint (Next.js rules plus the domain-purity rules) |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` (strict) |
| `npm test` | Vitest unit and architecture tests |
| `npm run fixtures` | Phase 0 search, pricing, cart, and configurator fixtures |
| `npm run docs:check` | Phase 0 documentation consistency checks |
| `npm run format:check` | Prettier (application code; Phase 0 docs are excluded) |
| `npm run build` | Production build |
| `npm run smoke` | Starts the production build and checks every route, the shell, and the security headers |
| `npm run verify` | All of the above, in order |

Production: `npm run build && npm start`.

## Structure

```
src/app/                    routes (thin)
src/components/layout/      application shell
src/components/ui/          shadcn-style primitives
src/modules/<name>/domain/  pure domain logic: no React, Next.js, browser, clock, or randomness (enforced)
src/platform/               infrastructure adapters and the Vietnamese dictionary (i18n)
src/config/                 navigation and security headers
tests/                      architecture and design-token tests
tools/                      Phase 0 spec checks and the route smoke test
```

Stack (pinned in `package.json`): Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3 (held below 7 for `typescript-eslint`), Tailwind CSS 4.3.3, Vitest 5.0.5, ESLint 9.39.5, Prettier 3.9.10.
