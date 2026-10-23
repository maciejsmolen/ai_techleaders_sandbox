import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./system-status", () => ({ SystemStatus: () => <div>system status</div> }));

const { default: AdminPage } = await import("./page");

describe("admin dashboard page", () => {
  it("renders the heading and the system status", () => {
    const html = renderToStaticMarkup(<AdminPage />);

    expect(html).toContain("Dashboard</h1>");
    expect(html).toContain("<div>system status</div>");
  });
});
