import { defineConfig } from "vitest/config";

// Integration tests: real PostgreSQL (testcontainers), the production build
// (`next start`), and a real browser (agent-browser). Run `npm run build` first.
export default defineConfig({
  test: {
    name: "app-integration",
    include: ["integration/**/*.int.test.ts"],
    environment: "node",
    globalSetup: ["./integration/global-setup.ts"],
    // One browser and two servers are shared; run files one at a time.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
