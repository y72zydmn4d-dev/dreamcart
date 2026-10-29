import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Domain code is pure TypeScript (docs/ARCHITECTURE.md section 2): no UI framework, no
// infrastructure, no browser globals, and no hidden clock or randomness.
const domainFiles = ["src/modules/**/domain/**/*.ts"];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: domainFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*"],
              message: "Domain code must not depend on React or Next.js.",
            },
            {
              group: ["@/components/*", "@/app/*", "@/platform/*", "@/config/*"],
              message: "Domain code must not depend on UI, routing, infrastructure, or config.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "navigator",
        "localStorage",
        "sessionStorage",
        "indexedDB",
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Inject a Clock instead." },
        { object: "Math", property: "random", message: "Inject an IdGenerator instead." },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "next-env.d.ts",
    "docs/**",
    "fixtures/**",
    "tools/**",
  ]),
]);
