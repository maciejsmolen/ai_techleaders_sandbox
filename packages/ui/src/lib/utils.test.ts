import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins classes and lets later Tailwind classes win", () => {
    expect(cn("px-2", false, "text-sm", "px-4")).toBe("text-sm px-4");
  });
});
