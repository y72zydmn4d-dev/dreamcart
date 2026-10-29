import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Domain code is pure TypeScript (docs/ARCHITECTURE.md section 2): no UI framework, no
// infrastructure, no browser globals, and no hidden clock or randomness.
const domainFiles = ["src/modules/**/domain/**/*.ts"];

const uiPatterns = [
  {
    group: ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*"],
    message: "Domain code must not depend on React or Next.js.",
  },
  {
    group: ["@/components/*", "@/app/*", "@/platform/*", "@/config/*"],
    message: "Domain code must not depend on UI, routing, infrastructure, or config.",
  },
];

// Modular-monolith contract (docs/ARCHITECTURE.md section 2): modules talk to each other only through
// the other module's public index.ts, never through its internals. `shared` is the shared kernel.
const modules = ["catalog", "cart", "configurator", "orders", "pricing", "search"];
const boundaryPattern = (self) => ({
  group: modules.filter((m) => m !== self).map((m) => `@/modules/${m}/*`),
  message: "Import another module through its public index (@/modules/<name>), not its internals.",
});
const restrict = (patterns) => ({ "no-restricted-imports": ["error", { patterns }] });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: domainFiles,
    rules: {
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
  ...modules.flatMap((m) => [
    { files: [`src/modules/${m}/**/*.ts`], rules: restrict([boundaryPattern(m)]) },
    {
      files: [`src/modules/${m}/domain/**/*.ts`],
      rules: restrict([boundaryPattern(m), ...uiPatterns]),
    },
  ]),
  { files: ["src/modules/shared/domain/**/*.ts"], rules: restrict(uiPatterns) },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "next-env.d.ts",
    "docs/**",
    "fixtures/**",
    "tools/**",
    ".claude/**",
  ]),
]);
