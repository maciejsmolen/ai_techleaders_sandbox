import { describe, expect, it } from "vitest";

import { createHealthService } from "./health-service";

describe("HealthService", () => {
  it("reports ok when the database answers", async () => {
    const service = createHealthService({ dbPing: { ping: async () => {} } });

    await expect(service.check()).resolves.toEqual({ status: "ok", db: "ok" });
  });

  it("reports an error instead of throwing when the database fails", async () => {
    const service = createHealthService({
      dbPing: {
        ping: async () => {
          throw new Error("connection refused");
        },
      },
    });

    await expect(service.check()).resolves.toEqual({ status: "error", db: "error" });
  });
});
