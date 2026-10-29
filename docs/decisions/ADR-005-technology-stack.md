# ADR-005: Technology stack; Supabase deferred

**Status:** Accepted (owner decisions D1, P-9; promoted per P-8; 2026-10-29)
**Date:** 2026-10-29

## Context
`CLAUDE.md` listed Supabase PostgreSQL as part of the stack. The approved local-first MVP needs no authentication or database server, and free-tier Supabase projects can pause after inactivity.

## Decision
Next.js (App Router) + React + TypeScript (strict) + Tailwind CSS + shadcn/ui + Zod + Vitest, with Playwright introduced when real user journeys exist, hosted on Vercel's free tier when deployment is authorized. Modular monolith. **No Supabase, authentication, or backend write API in the MVP**; the design stays compatible (ports, client-generated ids, snapshot shapes). **Decision P-9:** private GitHub repository, Node.js 24 LTS, npm with a committed lockfile and `npm ci` in CI, versions compatible with the chosen stable Next.js release. Exact versions are pinned in `package.json` and recorded in the Phase 1 pull request. TypeScript is held on the 6.0 line because `typescript-eslint`, which Next's ESLint configuration depends on, declares support only below 6.1 at scaffold time; revisit when it supports TypeScript 7.

## Alternatives
- Supabase from the start: more moving parts, pause risk, RLS and auth scope before product value is proven.
- Plain React/Vite: loses prerendering and routing conventions the project wants.

## Consequences
(+) $0, small surface, fast. (−) Single-device data until the later sync phase; storage-eviction risk is mitigated by export/import (ADR-006). The Blueprint cites Vercel Hobby as personal/noncommercial; that claim was not re-verified in Phase 0 (network allowlist), so ads, affiliate links, or paid use require re-checking the current terms first.
