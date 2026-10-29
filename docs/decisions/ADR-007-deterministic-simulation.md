# ADR-007: Deterministic, time-derived order simulation

**Status:** Accepted (owner decisions D8, P-2; promoted per P-8; 2026-10-29)
**Date:** 2026-10-29

## Context
Tracking must be reproducible, free of background workers, and never regress. Owner-approved scenarios: Fast (manual), Quick (~3 min), Relaxed (~1 h).

## Decision
Order state is a pure function of the stored scenario snapshot (`startedAt`, `durationSeconds`, `milestoneOffsets`, `scenarioVersion`), an injected clock, a stored high-water state, a manual step index, and a cancellation record. A cancellation record wins (`CANCELLED` is terminal); otherwise `state = max(time-derived, high-water, manual)`. The high-water state is written whenever an order is viewed or the collection is computed, so a backward clock cannot regress what the user has seen. Cancellation (**decision P-2**: normal cancellation through `PACKED`; afterwards the lifecycle continues to delivery, and the user can always delete the order or reset local data) is checked inside the transaction that records it, using the clock at that moment, so a cancel racing a transition is decided once; the UI shows it by state, never as a countdown. The collection is a derived view of delivered orders rendered from snapshots, so there is nothing to keep idempotent. Notifications are in-app only, on open. No timers, cron, push, email, or SMS.

## Alternatives
- Timers or workers: not durable, adds backend cost.
- Store every transition: extra writes and a possible inconsistent history.

## Consequences
(+) Testable with an injected clock; reload-safe. (−) A user who edits their device clock can fast-forward their own simulation, which is harmless.
