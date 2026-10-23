import { createDbPing, getOrm, type MikroORM } from "@devmentor/db";
import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";

import { getEnv } from "../config/env";
import { ServiceUnavailableError } from "../http/errors";
import { getLogger } from "../logger";
import { HealthService } from "../services/health/health.service";
import type { Cradle } from "./cradle";

/**
 * The composition root. Every dependency is registered here by hand (no
 * `loadModules`), so each binding is greppable. PROXY mode: factories and
 * constructors receive the cradle and destructure what they need.
 */
export function createAppContainer(orm: MikroORM): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
  container.register({
    env: asValue(getEnv()),
    logger: asValue(getLogger()),
    orm: asValue(orm),
    em: asFunction(({ orm }: Pick<Cradle, "orm">) => orm.em.fork()).scoped(),
    dbPing: asFunction(createDbPing).scoped(),
    healthService: asClass(HealthService).scoped(),
  });
  return container;
}

// Built once per process; cached on globalThis so dev hot reloads reuse it.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AwilixContainer<Cradle>>;
};

export function getContainer(): Promise<AwilixContainer<Cradle>> {
  globalForContainer.__devmentorContainer ??= getOrm()
    .catch((error: unknown) => {
      throw new ServiceUnavailableError("The database is unreachable.", { cause: error });
    })
    .then(createAppContainer)
    .catch((error: unknown) => {
      // Don't cache a failed build; the next request retries.
      globalForContainer.__devmentorContainer = undefined;
      throw error;
    });
  return globalForContainer.__devmentorContainer;
}

/**
 * Runs `fn` in a fresh request scope (its own forked EntityManager) and
 * disposes the scope afterwards. Use it at the edges only: route handlers,
 * server actions and server components.
 */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = (await getContainer()).createScope<Cradle>();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
