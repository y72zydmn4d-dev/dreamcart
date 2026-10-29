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
- Vercel (free tier): preview deployments of pull requests are authorized; publishing to production needs the owner's explicit approval
- Supabase: deferred to a later phase

UI language: Vietnamese-first. See `docs/decisions/ADR-005-technology-stack.md`.

## Project Status

The whole simulated shopping journey works in the browser, end to end: discover and configure a product, add offers (or a product you import by link) to a persistent cart, check out a virtual order, follow its simulated delivery, collect it, and export or erase your data. Phases 0–10 are merged (specification, foundation, design system, domain core, local persistence, catalog and discovery engine, storefront, cart and import, checkout and orders, tracking and collection, and the QA/security/hardening phase); execution progress and every status label are tracked in `docs/EXECUTION_STATUS.md`, and the system-wide audit is `docs/QA_REPORT.md`.

**It still runs on clearly labeled synthetic data** (fictional "Fixturia" products and sample prices) because the verified real catalog and image rights are owner-controlled and not yet supplied; a release build (`NEXT_PUBLIC_DREAMCART_RELEASE=1`) refuses to start without a real catalog. The human pilot (`docs/PILOT_PLAN.md`), real-device checks and the public release are pending people, not code. Nothing is deployed to production.

## Documentation

| Document | Purpose |
|---|---|
| `docs/UX_SPEC.md` | Phase 2 design direction, tokens, components, configurator behaviour, preview routes |
| `docs/PRD.md` | MVP requirements, owner-confirmed UX direction, journeys, acceptance gates |
| `docs/ROADMAP.md` | Phase-by-phase plan to a public MVP, critical path |
| `docs/ARCHITECTURE.md` | Layers, persistence, security headers, testing |
| `docs/CATALOG_SCHEMA.md` | Catalog, pricing, order-snapshot, image-provenance, and configurator rules |
| `docs/CURATION_PROCESS.md` | How the first 20–30 products are verified |
| `docs/CATALOG_READINESS.md` | Catalog engine status, real-data blocker, and the curation-input checklist |
| `docs/PRODUCT_SOURCE_MATRIX.md` | Provider feasibility and licensing evidence |
| `docs/SEARCH_FIXTURES.md` | Exact-variant matching rules and search fixtures |
| `docs/DECISIONS.md` | ADR index, final owner decisions P-1…P-10, Blueprint reconciliation |
| `docs/EXECUTION_STATUS.md` | The resume point: status of every phase, blockers, open issues, next action |
| `docs/QA_REPORT.md` | Phase 10 audit: what was checked, findings, performance, security, residual risks |
| `docs/RUNBOOK.md` | Build, deploy, roll back, incident table and the user backup guide |
| `docs/PILOT_PLAN.md` | Plan, consent text, task script and report template for the human pilot |
| `CHANGELOG.md` | What changed, phase by phase |
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
| `npm test` | Vitest: unit, property, architecture, and the `fixtures/` conformance suites (search, pricing, cart, configurator) |
| `npm run test:browser` | Playwright real-browser tests in Chromium, Firefox and WebKit: persistence, storefront, cart, checkout, orders, tracking, the 21-step journey, failure injection, keyboard and performance (needs `npm run build` first and `npx playwright install chromium firefox webkit` once; `-- --project=chromium` runs one engine) |
| `npm run catalog:check` | Validate the real and synthetic catalog data (runs automatically before `npm run build`) |
| `npm run catalog:import -- file.csv` | Convert a curation CSV into `data/catalog/*.json` |
| `npm run coverage` | The same tests with a V8 coverage report (`coverage/`, not committed) |
| `npm run docs:check` | Documentation consistency checks |
| `npm run licenses` | Production dependency licence audit |
| `npm run format:check` | Prettier (application code; Phase 0 docs are excluded) |
| `npm run build` | Production build |
| `npm run smoke` | Starts the production build and checks every route, the shell, and the security headers |
| `npm run verify` | All of the above, in order |

Production: `npm run build && npm start`. Routes: `/` home, `/search`, `/product/<id>`, `/cart`, `/import`, `/checkout`, `/orders` and `/orders/<id>`, `/collection`, `/settings`, `/privacy`, `/credits`, `/about`, `/design` (state and component gallery).

Design tooling: the vendored UI/UX Pro Max skill (`.claude/skills/ui-ux-pro-max/`, pinned and documented in its `UPSTREAM.md`) is available to Claude Code sessions started in this repository. It is advisory only.

## Structure

```
src/app/                    routes (thin)
src/components/layout/      application shell
src/components/ui/          shadcn-style primitives and icons
src/components/{search,product,cart,checkout,orders,collection,import,settings,local-data,catalog}/  feature components
src/modules/<name>/domain/  pure domain logic: no React, Next.js, browser, clock, or randomness (enforced)
src/modules/<name>/index.ts the module's public API; modules import each other only through it (enforced)
src/modules/<name>/application/ persistence port interfaces
src/platform/persistence/   IndexedDB and in-memory adapters, migrations, typed storage errors
tests/browser/              real-browser tests (Playwright)
data/catalog, data/synthetic  real (empty until verified) and synthetic catalog data
src/modules/discovery/      search, facets, sorting and suggestions over the catalog
src/platform/               infrastructure adapters and the Vietnamese dictionary (i18n)
src/config/                 navigation and security headers
tests/                      architecture and design-token tests
tools/                      documentation checks and the route smoke test
```

Stack (pinned in `package.json`): Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3 (held below 7 for `typescript-eslint`), Tailwind CSS 4.3.3, Vitest 5.0.5, ESLint 9.39.5, Prettier 3.9.10.
