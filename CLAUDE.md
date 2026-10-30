# DreamCart — Claude Code Instructions

## Role

Act as a senior software architect, full-stack engineer,
UX/UI designer, and technical project manager.

## Product Vision

DreamCart is a virtual shopping simulator using real
products and simulated transactions.

Read docs/PRODUCT_BLUEPRINT.md before making decisions.

Owner-confirmed UX direction is a product requirement, not a suggestion
(see docs/PRD.md section 3): Apple-inspired premium design with DreamCart
identity, Apple-first editorial homepage, Shopee/Lazada-inspired search and
discovery, Apple-inspired product pages, hybrid configurator with dependent
options, premium-first catalog of about 20-30 verified products.

## Non-Negotiable Rules

1. Never implement real payment processing.
2. Never place real shopping orders.
3. Never simulate actual courier communication.
4. Clearly disclose that transactions are virtual.
5. Never fabricate product sources or prices.
6. Respect product API and image licensing.
7. Never expose credentials or API secrets.
8. Never provision paid services without approval.

## Technical Direction

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Zod
- IndexedDB (local-first cart and virtual orders) behind repository ports
- Vercel
- Supabase PostgreSQL: deferred, not part of the MVP (see docs/decisions/ADR-005)

## Deployment

- **Vercel Preview deployments are authorized.** The two Vercel projects connected to this repository (`dreamcart`, `dreamcart-b963`) build a preview for every pull request automatically, on the free tier. Previews run the labeled synthetic fixtures until a verified real catalog exists. This replaces the earlier "no deployment before Phase 12" rule.
- **Anything beyond previews needs the owner's explicit approval each time:** publishing or promoting a production deployment, attaching a domain, enabling a paid plan or add-on, creating, deleting, disconnecting or re-linking a Vercel project, and setting environment variables or secrets (none are needed to build or run the app).
- **Production follows `main`** (owner-confirmed for `dreamcart`): a merge is a release. Which catalog is served is an explicit, reviewed setting (`data/catalog/activation.json`, ADR-015): merging verified or staged real-catalog data does not publish it, the staged catalog is never served in production, and `VERIFIED_REAL_CATALOG` needs a recorded owner authorization. Do not flip it without that authorization.
- A release build sets `NEXT_PUBLIC_DREAMCART_RELEASE=1`; it refuses synthetic data by design and does not publish the `/design` gallery.
- Verify a deployment with `SMOKE_BASE_URL=<url> npm run smoke` and `E2E_BASE_URL=<url> npx playwright test` (see docs/RUNBOOK.md and docs/RELEASE_CHECKLIST.md).

Architecture: Modular Monolith. UI language: Vietnamese-first.
Decision precedence: ADRs (docs/decisions/) > docs/PRD.md > docs/PRODUCT_BLUEPRINT.md.

## Development Workflow

- One phase at a time.
- Review documentation before coding.
- Plan significant changes before implementation.
- Do not overengineer.
- Do not expand MVP scope without approval.
- Prefer deterministic logic over unnecessary AI.
- Write meaningful tests.
- Run tests and build before reporting completion.
- Document architectural decisions.
- Use feature branches and Pull Requests.
- Never push directly to main.

## Definition of Done

A phase is complete only when:
- Acceptance criteria are satisfied.
- Tests pass.
- No critical errors remain.
- Relevant documentation is updated.
- Changes are reviewed.
