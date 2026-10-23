import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminLayout, { metadata } from "./layout";

describe("admin root layout", () => {
  it("renders the admin header around the page", () => {
    const html = renderToStaticMarkup(
      <AdminLayout>
        <p>content</p>
      </AdminLayout>,
    );

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("DevMentor Admin");
    expect(html).toContain("<main");
    expect(html).toContain("<p>content</p>");
  });

  it("titles pages with the admin template", () => {
    expect(metadata.title).toEqual({ default: "DevMentor Admin", template: "%s · DevMentor Admin" });
  });
});
