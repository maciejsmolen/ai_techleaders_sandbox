import type { DbCradle } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { createAppContainer } from "./container";

function fakeOrm() {
  const fork = vi.fn(() => ({ execute: vi.fn(async () => [{ "?column?": 1 }]) }));
  return { orm: { em: { fork } } as unknown as DbCradle["orm"], fork };
}

describe("createAppContainer", () => {
  it("wires the health check through to the request's EntityManager", async () => {
    const { orm } = fakeOrm();
    const scope = createAppContainer(orm).createScope();

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
