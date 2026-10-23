import { fileURLToPath } from "node:url";

import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
    },
  },
  test: {
    name: "app",
    include: ["src/**/*.test.{ts,tsx}"],
    // Tests assert on the logger through spies; keep real output quiet.
    env: { LOG_LEVEL: "silent" },
    environment: "node",
  },
});
