# ADR-001: Transparent simulation only

**Status:** Accepted (carried from Blueprint v1.0; rationale added in Phase 0)
**Date:** 2026-10-29

## Context
DreamCart reproduces the feeling of shopping with real products. Anything that could be mistaken for a real order, payment, or delivery creates user harm and legal exposure.

## Decision
All transactions are simulated and labeled as such on every purchase, order, tracking, collection, and export surface. No real payments, orders, couriers, carrier names, tracking numbers, bank or wallet marks, or financial credentials. Order codes use the `DC-V-` prefix and a watermark. Exports carry a simulation notice.

## Alternatives rejected
- Realistic receipts for immersion: risks passing as proof of purchase.
- Payment-provider "test mode": adds a payment integration the project forbids.

## Consequences
Some immersion is traded for clarity. A per-route automated check (PRD gate G1) enforces the label.
