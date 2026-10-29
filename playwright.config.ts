import { defineConfig } from "@playwright/test";

/**
 * Real-browser tests (Phase 4: IndexedDB in real engines; Phases 6, 9 and 10 add the storefront and the
 * end-to-end journey). Unit and integration tests stay in Vitest.
 */
export default defineConfig({
  testDir: "tests/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
