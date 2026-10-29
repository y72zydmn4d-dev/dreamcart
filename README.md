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

Phase 0 (discovery and specification) is complete. Phase 1 (engineering foundation) is in progress.

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

## Validation (no install needed, Node 18+)

```bash
node tools/verify-fixtures.mjs   # search, pricing, cart, and configurator fixtures
node tools/check-docs.mjs        # links, JSON, ADR index, fixture ids, secret patterns
```

Both are Phase 0 spec checks and are replaced by the real test suite in Phase 3.
