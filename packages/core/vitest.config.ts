import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "core",
    include: ["src/**/*.test.{ts,tsx}"],
    // Tests assert on the logger through spies; keep real output quiet.
    env: { LOG_LEVEL: "silent" },
    passWithNoTests: true,
  },
});
