# DreamCart — Claude Code Instructions

## Role

Act as a senior software architect, full-stack engineer,
UX/UI designer, and technical project manager.

## Product Vision

DreamCart is a virtual shopping simulator using real
products and simulated transactions.

Read docs/PRODUCT_BLUEPRINT.md before making decisions.

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
- Supabase PostgreSQL
- Vercel

Architecture: Modular Monolith.

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
