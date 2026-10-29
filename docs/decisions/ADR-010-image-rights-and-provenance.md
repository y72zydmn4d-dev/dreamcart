# ADR-010: Image rights and provenance; visual-first presentation

**Status:** Proposed (owner direction D5 recorded)
**Date:** 2026-10-29

## Context
DreamCart is a visual shopping experience. Product imagery also carries the highest rights risk: public accessibility is not permission, merchant images are generally not licensed to us, and hotlinking is out.

## Decision
- Design for rich imagery: cards, galleries, and the collection assume real photography.
- Render a real product image only when its `MediaAsset.rights.status` is `CLEARED` with a recorded basis (open license, written permission, published terms, or own work) and evidence. Display required attribution.
- Self-host images; no hotlinking; no copying of retailer images.
- Where no cleared image exists, show a designed generic placeholder labeled "Ảnh minh hoạ chưa có". Never generate fictional product photography and present it as real.
- Editorial surfaces may use DreamCart `brand_art` (abstract, owner-created, never presented as a photograph of a product) so the Apple-inspired home does not depend on product photography it cannot lawfully show.
- Image acquisition paths in order: open license, manufacturer permission/terms, owner photography.
- The owner-confirmed premium-first catalog makes this the highest project risk: premium brands are the likeliest to restrict reuse. Image availability is a product-selection criterion (`CURATION_PROCESS.md`). Decision P-4 confirms the premium-first strategy: legitimately usable images where available, high-quality placeholders otherwise, and no invented product metadata or unverified rights claims. The ADR stays Proposed until real image rights are demonstrated (blocker B2).

## Alternatives
- Image-optional as the design philosophy: rejected by the owner.
- Use merchant images because they are public: rejected (rights).

## Consequences
(+) Defensible provenance, visually ambitious design. (−) Image coverage may lag the data; the visual system must make placeholders look intentional. Blocker B2 remains until research R2/R3 and owner photography resolve rights for real entries.
