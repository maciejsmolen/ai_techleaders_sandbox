import type { DbPing, EntityManager, MikroORM } from "@devmentor/db";

import type { Env } from "../config/env";
import type { Logger } from "../logger";
import type { HealthService } from "../services/health/health.service";

/**
 * Everything the container provides, keyed by registration name. A new
 * dependency is one line here and one in `container.ts`.
 */
export interface Cradle {
  // Singletons (infrastructure).
  env: Env;
  logger: Logger;
  orm: MikroORM;
  // Scoped: one per request.
  /** A fork of the global EntityManager. */
  em: EntityManager;
  dbPing: DbPing;
  healthService: HealthService;
}
