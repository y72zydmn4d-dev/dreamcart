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

Phase 0 — Discovery and specification (complete pending owner review). No application code yet.

## Documentation

| Document | Purpose |
|---|---|
| `docs/PRD.md` | MVP requirements, journeys, acceptance gates, roadmap |
| `docs/ARCHITECTURE.md` | Layers, persistence, security headers, testing |
| `docs/CATALOG_SCHEMA.md` | Catalog, price, and image-provenance schemas |
| `docs/CURATION_PROCESS.md` | How the first ~20 products are verified |
| `docs/PRODUCT_SOURCE_MATRIX.md` | Provider feasibility and licensing evidence |
| `docs/SEARCH_FIXTURES.md` | Exact-variant matching rules and 30 fixtures |
| `docs/DECISIONS.md` | ADR index and reconciliation of the Blueprint |
| `docs/PHASE1_ENTRY_CRITERIA.md` | Gates and scope for Phase 1 |
| `docs/PRODUCT_BLUEPRINT.md` | Original v1.0 vision (amended; see banner) |
