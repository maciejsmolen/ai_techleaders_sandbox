import type { MikroORM } from "@devmentor/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceUnavailableError } from "../http/errors";

const getOrm = vi.fn<() => Promise<MikroORM>>();

vi.mock("@devmentor/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/db")>()),
  getOrm: () => getOrm(),
}));

const { createAppContainer, getContainer, withScope } = await import("./container");

function fakeOrm() {
  const fork = vi.fn(() => ({ execute: vi.fn(async () => [{ "?column?": 1 }]) }));
  return { orm: { em: { fork } } as unknown as MikroORM, fork };
}

beforeEach(() => {
  getOrm.mockReset();
  (globalThis as { __devmentorContainer?: unknown }).__devmentorContainer = undefined;
});

describe("createAppContainer", () => {
  it("wires the health check through to the request's EntityManager", async () => {
    const scope = createAppContainer(fakeOrm().orm).createScope();

    await expect(scope.cradle.healthService.check()).resolves.toEqual({ status: "ok", db: "ok" });
  });

  it("forks one EntityManager per request scope", () => {
    const { orm, fork } = fakeOrm();
    const container = createAppContainer(orm);
    const first = container.createScope();
    const second = container.createScope();

    expect(first.cradle.em).toBe(first.cradle.em);
    expect(first.cradle.em).not.toBe(second.cradle.em);
    expect(fork).toHaveBeenCalledTimes(2);
  });
});

describe("getContainer / withScope", () => {
  it("builds the container once and runs fn in a request scope", async () => {
    getOrm.mockResolvedValue(fakeOrm().orm);

    await expect(withScope(({ healthService }) => healthService.check())).resolves.toEqual({ status: "ok", db: "ok" });
    await withScope(async () => undefined);
    expect(getOrm).toHaveBeenCalledOnce();
  });

  it("turns an ORM init failure into a 503 error and retries on the next call", async () => {
    getOrm.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(getContainer()).rejects.toBeInstanceOf(ServiceUnavailableError);

    getOrm.mockResolvedValue(fakeOrm().orm);
    await expect(getContainer()).resolves.toBeDefined();
  });

  it("doesn't report other build failures as a database outage", async () => {
    getOrm.mockResolvedValue(fakeOrm().orm);
    vi.stubEnv("LOG_LEVEL", "loud");
    vi.resetModules();
    const fresh = await import("./container");

    const error = await fresh.getContainer().catch((thrown: unknown) => thrown);
    vi.unstubAllEnvs();

    expect(error).not.toBeInstanceOf(ServiceUnavailableError);
    expect(String(error)).toMatch(/LOG_LEVEL/);
  });
});
