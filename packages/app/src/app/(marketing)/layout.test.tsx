import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RootLayout, { metadata } from "./layout";

describe("marketing root layout", () => {
  it("renders the document with the dark base styles", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>content</p>
      </RootLayout>,
    );

    expect(html).toContain('<html lang="en">');
    expect(html).toMatch(/<body class="[^"]*bg-zinc-950[^"]*"><p>content<\/p><\/body>/);
  });

  it("sets the DevMentor title and description", () => {
    expect(metadata).toMatchObject({ title: "DevMentor", description: expect.stringContaining("Mentoring") });
  });
});
