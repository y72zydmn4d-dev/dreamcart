# Real catalog (`data/catalog/`)

Verified products only. Records here are validated on every build but **served only when `activation.json` says `VERIFIED_REAL_CATALOG`** (which needs a recorded owner authorization, ADR-015): merging verified data does not publish it, because production follows `main`. Work in progress for the Apple Store Vietnam program lives in `data/catalog-staging/apple-vn/`.

Verified products only. **This directory is intentionally empty**: DreamCart never creates product names, prices, merchant offers or images from memory. Records arrive from owner-supplied, second-checked curation (see `docs/CURATION_PROCESS.md`) and pass `npm run catalog:check`, which is also the first step of every build.

| File | Content |
|---|---|
| `sources.json` | Merchants and manufacturers: domain, kind, terms review date, persistence policy (hand-maintained) |
| `products.json`, `variants.json`, `offers.json`, `media.json` | Generated from the curation CSV by `npm run catalog:import -- file.csv` |
| `vocabulary.json` | Vietnamese labels and single-word search aliases for coded values (chip, color, type) |
| `activation.json` | Which catalog the app serves: `SYNTHETIC_DEMO` (default), `REAL_CATALOG_STAGING`, `VERIFIED_REAL_CATALOG` |
| `featured.json` | Product ids featured on the homepage (an editorial choice) |

Synthetic fixtures live separately in `data/synthetic/` (fictional "Fixturia", ids start with `fx-`). They are validated in their own mode and can never enter this directory: the real-mode validator rejects every `fx-` id.
