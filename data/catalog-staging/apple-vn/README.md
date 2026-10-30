# Staged catalog: Apple Store Vietnam (`data/catalog-staging/apple-vn/`)

Records being verified, imported in batches (ADR-015). The catalog files have the same format as `data/catalog/` and are validated under the real-catalog rules on every build (`npm run catalog:check`). Nothing here is served to the public: the staged catalog is shown only when `data/catalog/activation.json` is `REAL_CATALOG_STAGING` **and** the deployment is not production, with a visible "Bản xem trước" notice.

| Path | Content |
|---|---|
| `sources.json`, `products.json`, `variants.json`, `offers.json`, `media.json`, `vocabulary.json`, `featured.json` | The staged catalog (empty until the first verified batch) |
| `inventory/manifest.json` | Every discovered listing with its verification, price, image-rights and import status; coverage basis (`unknown` until an auditable enumeration exists) |
| `inventory/compliance.json` | Which acquisition methods are permitted, restricted or unreviewed, with evidence |

Nothing is invented: an empty file means no verified record exists yet. Status and counts: `docs/APPLE_CATALOG_EXECUTION_STATUS.md`.
