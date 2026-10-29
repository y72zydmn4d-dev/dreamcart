# DreamCart — Architecture (MVP)

**Status:** Phase 0 draft for owner approval. Companion ADRs: 005, 006, 007, 011, 012, 013, 014.

## 1. Shape

A **local-first modular monolith**: one Next.js (App Router, TypeScript) application. Catalog data is repository-hosted and validated at build time. Cart, orders, imported items, and settings live in the browser's IndexedDB. There is no authentication, no database server, and no backend write API in the MVP. Supabase is deferred but the design stays compatible (section 6).

```
Browser
 ├─ Static pages (catalog, product, search shell)   ← prerendered at build from repo data
 └─ Client islands (cart, checkout, orders, collection, settings)
        │  ports
        ▼
 Application layer ──► Domain (pure TypeScript)
        │
        ▼
 Persistence adapter: IndexedDB   (future: Supabase adapter, same ports)
```

## 2. Layers and dependency rule

Dependencies point inward only: `ui → application → domain`. Persistence adapters implement ports declared in the application layer.

- **Domain** (`modules/*/domain`): pure TypeScript. No React, Next.js, DOM, IndexedDB, `Date.now()`, or `Math.random()`. Time and ids come in through injected `Clock` and `IdGenerator`. Contains: money, price states, eligibility, search matching, cart logic, order snapshot builder, simulation state function.
- **Application** (`modules/*/application`): use cases (`addToCart`, `placeOrder`, `advanceOrder`, `cancelOrder`, `exportData`, …), port interfaces, Zod boundary schemas.
- **Infrastructure** (`platform/persistence/indexeddb`): adapters.
- **UI** (`modules/*/ui`, `app/`): React components; Next.js routes stay thin.

Modules: `catalog`, `search`, `pricing`, `import`, `cart`, `orders`, `simulation`, `collection`, `data-portability`. Each exposes a public `index.ts`; cross-module imports go through it. Boundaries are enforced by ESLint restricted-import rules, and a test fails if `domain` imports a forbidden package. This is the modular-monolith contract; no more structure than that.

## 3. Ports (sketch, signatures to be finalized in Phase 1)

```ts
interface CartRepository {
  get(): Promise<Cart>;
  save(cart: Cart): Promise<void>;           // revision-checked
}
interface OrderRepository {
  placeOrder(cmd: PlaceOrder): Promise<PlaceOrderResult>; // atomic, idempotent
  get(id: OrderId): Promise<VirtualOrder | null>;
  list(): Promise<VirtualOrder[]>;
  advance(id: OrderId): Promise<VirtualOrder>;       // Fast scenario only
  cancel(id: OrderId): Promise<VirtualOrder>;
  recordHighWater(id: OrderId, state: OrderState): Promise<void>; // max() only
  delete(id: OrderId): Promise<void>;
  deleteAll(): Promise<void>;
}
interface PortabilityRepository {
  exportAll(): Promise<ExportBundle>;
  importBundle(bundle: ExportBundle, mode: "merge" | "replace"): Promise<ImportReport>;
}
```

One **contract test suite** runs against every adapter, so a future Supabase adapter must pass the same tests.

## 4. IndexedDB design

Database `dreamcart`, versioned with `onupgradeneeded` migrations. A thin wrapper (the `idb` package is the leading candidate; pin and confirm in Phase 1).

| Store | Key | Notes |
|---|---|---|
| `meta` | key | `schemaVersion`, `createdAt`, device marker |
| `cart` | `current` | lines with variant id, offer id, quantity, price reference, revision |
| `checkoutDrafts` | cart revision | holds the idempotency key so refresh reuses it |
| `orders` | `id` | unique index `idempotencyKey`; index `createdAt`; items embed **immutable snapshots** |
| `userProducts` | `id` | imported/manual items, labeled unverified, never shared |
| `settings` | key | scenario default, notices dismissed |
| `quarantine` | auto | records that failed validation |

**Durable transitions use IndexedDB transactions.** `placeOrder` is one read-write transaction over `cart`, `orders`, and `checkoutDrafts`: check the idempotency index, insert the order with snapshots, clear the cart, mark the draft consumed. If the key exists, return the existing order. Two tabs cannot both succeed because the transaction and unique index serialize them; a `BroadcastChannel` refreshes other tabs. Every read is Zod-validated; failures go to `quarantine`.

Order id and code: id from `crypto.randomUUID()`; display code `DC-V-` plus 10 random base-32 characters (collisions are checked inside the transaction).

## 5. Storage eviction and recovery (documented limits)

Browser storage is not a database you own. Known risks (reported behavior to verify on real devices in Phase 6):

- the user clears site data or uses private browsing;
- storage pressure can evict "best-effort" origins;
- WebKit's tracking-prevention policy is reported to delete script-writable storage for sites not interacted with for about seven days (home-screen web apps are reported to be exempt).

Mitigations in the MVP:

1. Request persistent storage (`navigator.storage.persist()`) after the first order; show the result in Settings. It is best effort, not a guarantee.
2. **Versioned export/import** (below) and a plain notice at first use and in Settings. After the first delivered order, show one non-recurring hint about exporting. No reminders after that.
3. A localStorage marker detects "had data, now empty" and offers import instead of silently starting blank.
4. If IndexedDB is unavailable, fall back to memory with a persistent banner that data will be lost when the page closes.
5. Corrupted records are quarantined; the app keeps working.

Limits: there is no server copy, so a lost or wiped device means data is lost unless the user exported. Cross-device sync arrives only with the later Supabase phase.

**Export format:** JSON `{ format: "dreamcart-export", version: 1, simulation: true, notice, exportedAt, appVersion, data: { cart, orders, userProducts, settings } }`. Import validates with Zod, migrates older versions, caps file size, never evaluates content, and supports `merge` (skip existing ids and idempotency keys) or `replace` (after explicit confirmation). The export carries the simulation notice so it cannot pass as a receipt.

## 6. Compatibility with future Supabase

Ids are client-generated UUIDs; timestamps are UTC ISO; entity and field names mirror CATALOG_SCHEMA; order snapshots are JSON; all persistence is behind the ports above. A later phase adds a Supabase adapter, authentication, row-level security, and a merge strategy through its own ADR. Nothing in the MVP depends on Supabase and nothing is provisioned.

## 7. Rendering and security headers

Catalog and product pages are **prerendered at build** from repo data. Cart, checkout, orders, and collection are client components reading IndexedDB. No dynamic server rendering is required.

Consequently the Content Security Policy is chosen for this architecture (ADR-011): a per-request nonce would force dynamic rendering of every page, so it is not used. Baseline header set via the framework configuration:

- `default-src 'self'`; `img-src 'self' data: blob:` (all product images are self-hosted); `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
- `script-src`: Phase 1 spike chooses between (A) hash-based allowance for the framework's inline scripts via the framework's experimental integrity support, or (B) `'self' 'unsafe-inline'` with the rest of the policy strict. Choose A if it works on the pinned version without fragility; otherwise B, with the rationale that there is no user-generated HTML, no server-rendered untrusted content, and React escapes output. The spike records the result. The framework documentation could not be read directly in Phase 0 (network allowlist), so this must be verified against the pinned version.
- `style-src` per Tailwind/framework needs (verify in spike); `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying camera, microphone, geolocation.
- Outbound links use `rel="noopener noreferrer nofollow"` and show the "leaving DreamCart" notice.
- URL input is parsed with the platform `URL` class client-side: http/https only, no credentials, tracking parameters stripped, display escaped. There is no server-side fetch.

## 8. Internationalization

`platform/i18n/vi.ts` holds all UI strings as a typed object; components call a small `t(key, params)` helper. No i18n library. Dates and money use `Intl` with `vi-VN`. Code identifiers, logs, and technical docs are English. Adding English later means adding `en.ts` against the same key type.

## 9. Testing strategy

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | money, price states, eligibility, matching (30 fixtures), cart, snapshot builder, simulation including time-shift and monotonic tests, URL validator |
| Integration | Vitest + fake IndexedDB | adapter contract suite, concurrent `placeOrder`, migrations, quarantine, export/import round trip |
| Build-time | Vitest/Node scripts | catalog validation, rights checks, `fx-` guard |
| End to end | Playwright | full journey on desktop and mobile projects; reload and `page.clock` time-shift; assertion of zero cross-origin requests at checkout |
| Accessibility | axe via Playwright + manual pass | key routes; keyboard and screen reader in hardening |

**Browser matrix (confirm exact versions at Phase 1 scaffold):** latest two stable versions of Chrome, Edge, and Firefox on desktop; Chrome on Android; Safari 16.4 or newer on macOS and iOS. Playwright projects: Chromium, Firefox, WebKit, a Pixel-class Chromium viewport, and an iPhone-class WebKit viewport. Playwright WebKit approximates Safari; real iOS devices are checked manually in hardening. Minimum viewport 360 px.

## 10. Tooling decisions to confirm in Phase 1

Node 22 LTS, npm, Next.js latest stable (pin after checking the registry at scaffold time), TypeScript strict, Tailwind CSS, shadcn/ui, Zod, Vitest, Playwright, ESLint, Prettier. GitHub Actions: lint, typecheck, unit/integration, build; Playwright on pull requests. No deployment in Phase 1.
