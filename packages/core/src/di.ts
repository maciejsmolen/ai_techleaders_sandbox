import { asFunction, type AwilixContainer } from "awilix";

import { createHealthService, type DbPing, type HealthService } from "./health/health-service";

/**
 * Services registered by `core`, and the ports other packages must provide.
 * The container runs in PROXY mode, so property names are the registration
 * names and factories receive the cradle as their single argument.
 */
export interface CoreCradle {
  healthService: HealthService;
  /** Provided by `@devmentor/db`. */
  dbPing: DbPing;
}

export function registerCore(container: AwilixContainer): void {
  container.register({
    healthService: asFunction(createHealthService).scoped(),
  });
}
