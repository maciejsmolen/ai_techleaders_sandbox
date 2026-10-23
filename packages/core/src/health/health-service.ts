/** Checks that the database answers; implemented in `@devmentor/db`. */
export interface DbPing {
  ping(): Promise<void>;
}

export type ComponentStatus = "ok" | "error";

export interface HealthReport {
  status: ComponentStatus;
  db: ComponentStatus;
}

export interface HealthService {
  check(): Promise<HealthReport>;
}

export function createHealthService({ dbPing }: { dbPing: DbPing }): HealthService {
  return {
    async check() {
      try {
        await dbPing.ping();
        return { status: "ok", db: "ok" };
      } catch {
        return { status: "error", db: "error" };
      }
    },
  };
}
