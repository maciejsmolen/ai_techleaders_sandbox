import { describe, expect, it } from "vitest";

import { ServiceUnavailableError } from "../../http/errors";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("reports ok when the database answers", async () => {
    const service = new HealthService({ dbPing: { ping: async () => {} } });

    await expect(service.check()).resolves.toEqual({ status: "ok", db: "ok" });
  });

  it("throws a 503 error when the database fails", async () => {
    const cause = new Error("connection refused");
    const service = new HealthService({
      dbPing: {
        ping: async () => {
          throw cause;
        },
      },
    });

    const error = await service.check().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ status: 503, cause });
  });
});
