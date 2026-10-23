import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Cradle } from "../container/cradle";
import { makeCrudRoute, type CrudRouteContext, type CrudService } from "./makeCrudRoute";

const service = {
  list: vi.fn<CrudService<unknown, unknown, unknown>["list"]>(),
  create: vi.fn<CrudService<unknown, unknown, unknown>["create"]>(),
  update: vi.fn<CrudService<unknown, unknown, unknown>["update"]>(),
  remove: vi.fn<CrudService<unknown, unknown, unknown>["remove"]>(),
};

vi.mock("../container/container", () => ({
  withScope: <T>(fn: (cradle: Cradle) => Promise<T>) => fn({} as Cradle),
}));

const id = "5f0c7c3e-8a1b-4c2d-9e3f-1a2b3c4d5e6f";
const routes = makeCrudRoute({
  service: () => service,
  createSchema: z.object({ name: z.string().min(1) }),
  updateSchema: z.object({ name: z.string().min(1).optional() }),
});

const context = (params: { id?: string } = {}): CrudRouteContext => ({ params: Promise.resolve(params) });
const request = (method: string, path = "/api/things", body?: unknown) =>
  new Request(`http://localhost${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("makeCrudRoute", () => {
  it("GET lists the records", async () => {
    service.list.mockResolvedValue([{ id }]);

    const response = await routes.GET(request("GET"), context());

    await expect(response.json()).resolves.toEqual({ ok: true, data: [{ id }] });
  });

  it("POST creates from the parsed body only and returns 201", async () => {
    service.create.mockImplementation(async (input) => ({ id, ...(input as object) }));

    const response = await routes.POST(request("POST", "/api/things", { name: "Ada", id: "smuggled" }), context());

    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith({ name: "Ada" });
  });

  it("POST rejects an invalid body with 422 before reaching the service", async () => {
    const response = await routes.POST(request("POST", "/api/things", { name: "" }), context());

    expect(response.status).toBe(422);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("PUT takes the id from the route params", async () => {
    service.update.mockResolvedValue({ id, name: "Grace" });

    const response = await routes.PUT(request("PUT", `/api/things/${id}`, { name: "Grace" }), context({ id }));

    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith(id, { name: "Grace" });
  });

  it("DELETE falls back to the ?id= query parameter", async () => {
    const response = await routes.DELETE(request("DELETE", `/api/things?id=${id}`), context());

    await expect(response.json()).resolves.toEqual({ ok: true, data: null });
    expect(service.remove).toHaveBeenCalledWith(id);
  });

  it("rejects a missing or malformed id with 422", async () => {
    const missing = await routes.DELETE(request("DELETE"), context());
    const malformed = await routes.DELETE(request("DELETE"), context({ id: "1 or 1=1" }));

    expect(missing.status).toBe(422);
    expect(malformed.status).toBe(422);
    await expect(malformed.json()).resolves.toMatchObject({ error: { fieldErrors: { id: [expect.any(String)] } } });
    expect(service.remove).not.toHaveBeenCalled();
  });
});
