import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // The domain and the pure helpers are the coverage target; UI is checked in the browser.
      include: ["src/modules/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "src/modules/orders/application/**"],
      reporter: ["text-summary", "text"],
    },
  },
});
