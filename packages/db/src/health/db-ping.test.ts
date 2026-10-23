import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { createDbPing } from "./db-ping";

describe("createDbPing", () => {
  it("runs `select 1` on the request's EntityManager", async () => {
    const execute = vi.fn(async () => [{ "?column?": 1 }]);

    await createDbPing({ em: { execute } as unknown as EntityManager }).ping();

    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("propagates a database error", async () => {
    const em = { execute: vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))) } as unknown as EntityManager;

    await expect(createDbPing({ em }).ping()).rejects.toThrow("ECONNREFUSED");
  });
});
