import { MikroORM } from "@mikro-orm/postgresql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOrm } from "./orm";

const init = vi.spyOn(MikroORM, "init");

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://devmentor:devmentor@localhost:5432/devmentor");
  (globalThis as { __devmentorOrm?: unknown }).__devmentorOrm = undefined;
  init.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe("getOrm", () => {
  it("initialises MikroORM once per process and reuses it", async () => {
    const orm = {} as MikroORM;
    init.mockResolvedValue(orm);

    await expect(getOrm()).resolves.toBe(orm);
    await expect(getOrm()).resolves.toBe(orm);
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ clientUrl: process.env.DATABASE_URL }));
  });

  it("doesn't cache a failed initialisation", async () => {
    const orm = {} as MikroORM;
    init.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValue(orm);

    await expect(getOrm()).rejects.toThrow("ECONNREFUSED");
    await expect(getOrm()).resolves.toBe(orm);
    expect(init).toHaveBeenCalledTimes(2);
  });
});
