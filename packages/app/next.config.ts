import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// A single .env at the repo root, shared with the @devmentor/db CLI.
loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  // Keep MikroORM out of the server bundle. `@mikro-orm/core` and `pg` are on
  // Next's built-in list; MikroORM 7's driver is not. Add any other
  // `@mikro-orm/*` package here once app code imports it at runtime.
  serverExternalPackages: ["@mikro-orm/postgresql"],
};

export default nextConfig;
