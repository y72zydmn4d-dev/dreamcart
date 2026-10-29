# ADR-007: Deterministic, time-derived order simulation

**Status:** Proposed (owner direction D8 recorded)
**Date:** 2026-10-29

## Context
Tracking must be reproducible, free of background workers, and never regress. Owner-approved scenarios: Fast (manual), Quick (~3 min), Relaxed (~1 h).

## Decision
Order state is a pure function of the stored scenario snapshot (`startedAt`, `durationSeconds`, `milestoneOffsets`, `scenarioVersion`), an injected clock, a stored high-water state, and the manual step count: `state = max(time-derived, high-water, manual)`. The high-water state is written when an order is viewed, so a backward clock cannot regress it. Cancellation is allowed up to `PACKED` (owner to confirm) and `CANCELLED` is terminal. The collection is a derived view of delivered orders, so there is nothing to keep idempotent. Notifications are in-app only, on open. No timers, cron, push, email, or SMS.

## Alternatives
- Timers or workers: not durable, adds backend cost.
- Store every transition: extra writes and a possible inconsistent history.

## Consequences
(+) Testable with an injected clock; reload-safe. (−) A user who edits their device clock can fast-forward their own simulation, which is harmless.
