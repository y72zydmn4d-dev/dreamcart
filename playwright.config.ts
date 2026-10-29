import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
/** Run the whole suite against a deployment (a preview URL) instead of a local `next start`. */
const REMOTE_URL = process.env.E2E_BASE_URL?.replace(/\/+$/, "");

/**
 * Real-browser tests: IndexedDB in real engines (Phase 4) and the storefront at representative widths (Phase 6;
 * Phases 9 and 10 add the end-to-end journey and cross-browser hardening). Unit and integration tests stay in
 * Vitest. The storefront specs need a production build: `npm run build` first.
 */
export default defineConfig({
  testDir: "tests/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  // Three engines on a small CI runner: fewer workers and longer timeouts avoid load-induced navigation stalls
  // (a Firefox page load once timed out after 30 s on a page that had loaded in over a hundred other tests).
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  // Firefox on the CI runner has stalled a page load three times in three runs, each on a different test and page,
  // while 100+ other loads in the same run were fine and Chromium/WebKit never stalled. One retry keeps that
  // from blocking merges; a retried pass is reported as "flaky" (never hidden) and the trace is kept for diagnosis.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: REMOTE_URL ?? `http://127.0.0.1:${PORT}`,
    navigationTimeout: 45_000,
    trace: "retain-on-first-failure",
  },
  webServer: REMOTE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
