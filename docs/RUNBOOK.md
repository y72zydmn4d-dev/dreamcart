# DreamCart — Runbook

Operating the project and helping a user recover their data. DreamCart is a static-first Next.js app with no server-side state: everything a user creates lives in their own browser.

## 1. Build, run, test

```bash
npm ci                 # exact, reproducible install (Node version in .nvmrc)
npm run dev            # local development
npm run verify         # lint, typecheck, unit tests, docs check, format check, build, route smoke
npm run test:browser   # real-browser specs (needs `npm run build` first; installs: npx playwright install chromium firefox webkit)
npm run licenses       # production dependency license audit
```

CI (`.github/workflows/ci.yml`) runs `quality` (everything in `verify` plus the license audit and `npm audit`) in parallel with one `browsers` job per engine (Chromium, Firefox, WebKit). A final job named **Verify (Node 24)** passes only when all of them did. Browser traces of failed or flaky tests are uploaded as `browser-test-results-<engine>` for 7 days. A test that passes only on retry is printed as "flaky" and must be looked at, not ignored.

## 2. Catalog and release flag

- `data/catalog` holds the verified catalog (see `docs/CURATION_PROCESS.md`, `docs/CATALOG_SCHEMA.md`). While it is empty, non-release builds fall back to the labeled synthetic fixtures in `data/synthetic`.
- `NEXT_PUBLIC_DREAMCART_RELEASE=1` makes a build **refuse** the synthetic fallback. A public release is built with it set and therefore fails until a real catalog exists. `npm run catalog:check` (part of `prebuild`) validates the catalog and prints the readiness report.
- An invalid catalog fails the build with the offending paths; it is never silently replaced.

## 3. Deploy and roll back

- Pull requests get Vercel previews automatically (two projects are connected: `dreamcart` is the primary, `dreamcart-b963` a duplicate; do not delete or disconnect either without the owner).
- No environment variable or secret is needed to build or run the app.
- Production publication needs the owner's explicit approval (see `docs/EXECUTION_STATUS.md`). To roll back, promote the previous successful deployment in Vercel (instant rollback) or revert the merge commit on `main`; users' data is untouched because it never leaves their browsers.

## 4. When something is wrong in a user's browser

| What the user sees | Meaning | What to do |
|---|---|---|
| Banner: "Dữ liệu của bạn không được lưu…" | IndexedDB is blocked, full or unavailable (private mode, blocked site data). Data lives in memory until the page closes. | Use a normal window, free space, allow site data; export a backup before closing if anything matters. |
| Banner: database from a newer DreamCart | The browser holds data written by a newer version than the loaded app. DreamCart never downgrades or deletes it. | Reload to get the newest version (clear the service/page cache if one is stuck). |
| Banner: another tab holds an older version / upgrade failed | Close other DreamCart tabs and reload. Existing data is untouched after a failed upgrade. | Reload; if it persists, export from another browser profile is not possible, so report it. |
| Banner: "N bản ghi bị lỗi đã được tách riêng" | Some stored records failed validation and were set aside (not deleted, not shown). | Normally nothing; the rest of the app works. Export a backup, then report the app version. |
| Banner: "Trình duyệt này từng có đơn hàng… hiện đang trống" | The browser had orders or imported items and now has none (site data cleared or evicted). | Settings → restore from a backup file if there is one. |

## 5. User backup guide (what the Settings page does)

1. **Back up:** Settings → "Tải bản sao lưu". A JSON file `dreamcart-sao-luu-YYYY-MM-DD.json` is downloaded. It holds the cart lines, imported items, orders and settings, and states that it is a simulation and not a receipt. Keep it somewhere safe; there is no server copy.
2. **Restore:** Settings → choose the file → review the summary → "Gộp thêm" (default: keeps what is on the device and adds orders that are not there yet; the same file twice adds nothing) or "Thay thế tất cả" (deletes the device's data first; needs its own confirmation). A file that is not valid JSON, is not a DreamCart backup, is too large or fails validation is rejected with a reason and changes nothing.
3. **Delete one order:** the order page → "Xoá đơn khỏi thiết bị này" → confirm.
4. **Delete everything:** Settings → "Xoá toàn bộ dữ liệu" → tick the confirmation → press. Clearing the browser's site data for the site does the same.
5. **Keep the browser from evicting data:** Settings → "Xin trình duyệt giữ dữ liệu lâu dài" (best effort). On Safari, data for sites not used for about a week can be removed by the browser; export first if it matters.

## 6. Known flaky or unverified areas

- Firefox page-load stalls in CI (`docs/QA_REPORT.md` F3): look at the uploaded traces before changing timeouts again.
- Anything on a real phone: see the pilot plan (Phase 11).
