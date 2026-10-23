import { defineConfig } from "vitest/config";

// One Vitest project per package; each package's `test` script runs its own.
export default defineConfig({
  test: {
    projects: ["packages/*"],
  },
});
