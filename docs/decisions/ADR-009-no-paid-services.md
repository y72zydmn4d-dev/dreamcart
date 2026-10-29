# ADR-009: No paid service or API without owner approval

**Status:** Accepted (carried from Blueprint v1.0)
**Date:** 2026-10-29

## Decision
No paid infrastructure, paid API, or API call with nonzero cost is provisioned or used without the owner's explicit approval. No credentials are committed; secrets live outside the repository. Free-tier use must respect that tier's terms (for example, noncommercial limits).

## Consequences
Phase 0 created no accounts and made no API calls. Sentry or analytics are excluded until approved. Deployment is a separate owner-authorized step.
