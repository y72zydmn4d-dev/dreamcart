# ADR-006: Local-first persistence with IndexedDB and repository ports

**Status:** Proposed (owner direction D1 recorded)
**Date:** 2026-10-29

## Context
The MVP is guest-only. Cart and orders must survive refresh, and "exactly one order per idempotency key" must hold even with two tabs.

## Decision
Persist cart, orders, imported items, and settings in IndexedDB behind `CartRepository`, `OrderRepository`, and `PortabilityRepository`. Durable transitions (`placeOrder`, `cancel`, `advance`) run in a single IndexedDB transaction; `placeOrder` relies on a unique index on the idempotency key, which is stored on the cart record and rotates when the cart changes or an order succeeds. All reads are Zod-validated; failures are quarantined. Versioned JSON export/import is a P0 feature, and **import is treated as untrusted input** (schema, size, and URL re-validation; `ARCHITECTURE.md` §5). Eviction and recovery limits are documented there too. Repository tests target the port so a later adapter can reuse them; a formal contract suite waits for a second adapter.

## Alternatives
- `localStorage`: synchronous, small quota, no transactions or unique indexes, so the double-order race cannot be made safe.
- Server persistence now: needs auth and a backend (deferred by ADR-005).

## Consequences
(+) Atomic, offline-capable, testable with a shared contract suite. (−) Browser-managed storage can be cleared or evicted, with no server copy; mitigation is persistent-storage request, export/import, notices, and missing-data detection.
