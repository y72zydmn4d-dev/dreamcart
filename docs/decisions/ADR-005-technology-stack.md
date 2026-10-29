# ADR-005: Technology stack; Supabase deferred

**Status:** Proposed (owner direction D1 recorded)
**Date:** 2026-10-29

## Context
`CLAUDE.md` listed Supabase PostgreSQL as part of the stack. The approved local-first MVP needs no authentication or database server, and free-tier Supabase projects can pause after inactivity.

## Decision
Next.js (App Router) + React + TypeScript (strict) + Tailwind CSS + shadcn/ui + Zod + Vitest + Playwright, hosted on Vercel's free tier when deployment is authorized. Modular monolith. **No Supabase, authentication, or backend write API in the MVP**; the design stays compatible (ports, client-generated ids, snapshot shapes). Package manager npm, Node 22 LTS; versions are pinned after checking the registry at scaffold time.

## Alternatives
- Supabase from the start: more moving parts, pause risk, RLS and auth scope before product value is proven.
- Plain React/Vite: loses prerendering and routing conventions the project wants.

## Consequences
(+) $0, small surface, fast. (−) Single-device data until the later sync phase; storage-eviction risk is mitigated by export/import (ADR-006). Vercel Hobby is noncommercial: no ads, affiliate links, or paid use without re-checking its terms.
