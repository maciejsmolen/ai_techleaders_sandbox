import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";

import { Browser } from "./browser";

const baseUrl = inject("baseUrl");
const dbDownUrl = inject("dbDownUrl");

let browser: Browser;

beforeAll(() => {
  browser = new Browser();
});

afterEach(async (context) => {
  if (context.task.result?.state === "fail") {
    await browser.screenshot(context.task.name.replace(/\W+/g, "-")).catch(() => undefined);
  }
});

afterAll(async () => {
  await browser.close();
});

describe("with a migrated database", () => {
  it("GET /api/health reports the database as ok", async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });

  it("the landing page renders and links to the admin area", async () => {
    await browser.open(baseUrl);

    expect(await browser.text("h1")).toBe("Grow faster as a developer, with a mentor at your side");

    await browser.click("a[href='/admin']");
    await browser.waitForText("System status");
    expect(await browser.url()).toBe(`${baseUrl}/admin`);
  });

  it("the admin dashboard shows the database status, and Refresh reloads it", async () => {
    await browser.open(`${baseUrl}/admin`);
    await browser.waitForText("OK");

    expect(await browser.text("table")).toBe("System status\nComponent\tStatus\nDatabase\tOK");

    await browser.clickRole("button", "Refresh");
    await browser.waitForText("OK");
    expect(await browser.text("table")).toContain("Database\tOK");
  });
});

describe("with the database down", () => {
  it("GET /api/health returns 503 service_unavailable", async () => {
    const response = await fetch(`${dbDownUrl}/api/health`);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "service_unavailable", message: "The database is unreachable." },
    });
  });

  it("the landing page still renders and the dashboard shows the error", async () => {
    await browser.open(dbDownUrl);
    expect(await browser.text("h1")).toBe("Grow faster as a developer, with a mentor at your side");

    await browser.open(`${dbDownUrl}/admin`);
    await browser.waitForText("The database is unreachable.");
    expect(await browser.text("[role=alert]")).toContain("The database is unreachable.");
  });
});
