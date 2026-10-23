// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "./page";

afterEach(cleanup);

describe("landing page", () => {
  it("renders the hero, the feature cards and the navigation", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Grow faster as a developer, with a mentor at your side",
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Find a mentor",
      "Learn by doing",
      "Track your growth",
    ]);
    expect(screen.getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Get started" }).getAttribute("href")).toBe("#features");
    expect(screen.getByRole("contentinfo").textContent).toContain(`© ${new Date().getFullYear()} DevMentor`);
  });
});
