import { ServiceUnavailableError } from "@devmentor/core/http";
import { describe, expect, it, vi } from "vitest";

const check = vi.fn();

vi.mock("@devmentor/core/container", () => ({
  withScope: (fn: (cradle: unknown) => Promise<unknown>) => fn({ healthService: { check } }),
}));

const { GET } = await import("./route");

const request = () => new Request("http://localhost/api/health");

describe("GET /api/health", () => {
  it("returns 200 with the report in the success envelope", async () => {
    check.mockResolvedValue({ status: "ok", db: "ok" });

    const response = await GET(request(), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });

  it("returns 503 service_unavailable when the database is down", async () => {
    check.mockRejectedValue(new ServiceUnavailableError("The database is unreachable."));

    const response = await GET(request(), undefined);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "service_unavailable", message: "The database is unreachable." },
    });
  });
});
