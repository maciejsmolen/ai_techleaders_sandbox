import type { DbPing } from "@devmentor/db";

import { ServiceUnavailableError } from "../../http/errors";

export interface HealthReport {
  status: "ok";
  db: "ok";
}

export class HealthService {
  private readonly dbPing: DbPing;

  constructor({ dbPing }: { dbPing: DbPing }) {
    this.dbPing = dbPing;
  }

  /** Resolves when every dependency answers; throws a 503 error otherwise. */
  async check(): Promise<HealthReport> {
    try {
      await this.dbPing.ping();
    } catch (error) {
      throw new ServiceUnavailableError("The database is unreachable.", { cause: error });
    }
    return { status: "ok", db: "ok" };
  }
}
