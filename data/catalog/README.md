# Real catalog (`data/catalog/`)

Verified products only. **This directory is intentionally empty**: DreamCart never creates product names, prices, merchant offers or images from memory. Records arrive from owner-supplied, second-checked curation (see `docs/CURATION_PROCESS.md`) and pass `npm run catalog:check`, which is also the first step of every build.

| File | Content |
|---|---|
| `sources.json` | Merchants and manufacturers: domain, kind, terms review date, persistence policy (hand-maintained) |
| `products.json`, `variants.json`, `offers.json`, `media.json` | Generated from the curation CSV by `npm run catalog:import -- file.csv` |
| `vocabulary.json` | Vietnamese labels and single-word search aliases for coded values (chip, color, type) |
| `featured.json` | Product ids featured on the homepage (an editorial choice) |

Synthetic fixtures live separately in `data/synthetic/` (fictional "Fixturia", ids start with `fx-`). They are validated in their own mode and can never enter this directory: the real-mode validator rejects every `fx-` id.
