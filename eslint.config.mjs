import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Package boundaries from AGENTS.md ("Monorepo layout"): app → core → db, ui standalone. ESLint keeps only the
// last matching `no-restricted-imports` entry, so every package block below
// repeats the shared "no relative imports into another package" pattern.
const crossPackageRelative = {
  regex: String.raw`^(\.\./)+(app|core|db|ui)/src(/|$)|(^|/)packages/`,
  message: "Import other packages by name (@devmentor/<pkg>), not by relative path.",
};

const forbid = (names, message) => ({ group: names, message });

function boundaries(files, patterns) {
  return {
    files,
    rules: {
      "no-restricted-imports": ["error", { patterns: [crossPackageRelative, ...patterns] }],
    },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Pages Router only; the app uses the App Router.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  boundaries(
    ["packages/app/**"],
    [
      forbid(
        ["@devmentor/db", "@devmentor/db/*", "@mikro-orm/*"],
        "app reaches the database only through core services (app → core → db).",
      ),
    ],
  ),
  boundaries(
    ["packages/core/**"],
    [
      forbid(["@devmentor/app", "@devmentor/app/*", "@devmentor/ui", "@devmentor/ui/*"], "core may only depend on db."),
      forbid(
        ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*", "@mikro-orm/*"],
        "core is framework-agnostic: no Next.js or React, and only db imports MikroORM.",
      ),
    ],
  ),
  boundaries(
    ["packages/db/**"],
    [
      forbid(["@devmentor/*"], "db must not depend on other internal packages."),
      forbid(["next", "next/*", "react", "react/*"], "db has no UI or Next.js code."),
    ],
  ),
  boundaries(
    ["packages/ui/**"],
    [
      forbid(["@devmentor/*", "@mikro-orm/*"], "ui must not depend on other internal packages; no data access."),
    ],
  ),
  {
    // `apiCall` is the only sanctioned fetch() call site on the client.
    files: ["packages/app/src/**", "packages/ui/src/**"],
    ignores: ["packages/ui/src/backend/api/apiCall.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Call /api/* through apiCall/apiCallOrThrow from @devmentor/ui/backend/api." },
      ],
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
