import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Package boundaries from AGENTS.md ("Monorepo layout"). ESLint keeps only the
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
  boundaries(["packages/app/**"], []),
  boundaries(
    ["packages/core/**"],
    [
      forbid(["@devmentor/*"], "core must not depend on other internal packages."),
      forbid(
        ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*", "@mikro-orm/*"],
        "core is framework-agnostic: no Next.js, React, or MikroORM.",
      ),
    ],
  ),
  boundaries(
    ["packages/db/**"],
    [
      forbid(["@devmentor/app", "@devmentor/app/*", "@devmentor/ui", "@devmentor/ui/*"], "db may only depend on core."),
      forbid(["next", "next/*", "react", "react/*"], "db has no UI or Next.js code."),
    ],
  ),
  boundaries(
    ["packages/ui/**"],
    [
      forbid(
        ["@devmentor/app", "@devmentor/app/*", "@devmentor/db", "@devmentor/db/*", "@mikro-orm/*"],
        "ui may only use types and utils from core; no data access.",
      ),
    ],
  ),
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
