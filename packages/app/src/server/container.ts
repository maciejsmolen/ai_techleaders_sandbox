import "server-only";

import { registerCore, type CoreCradle } from "@devmentor/core";
import { getOrm, registerDb, type DbCradle } from "@devmentor/db";
import { createContainer, InjectionMode, type AwilixContainer } from "awilix";

export type AppCradle = CoreCradle & DbCradle;

// Built once per process; cached on globalThis so dev hot reloads reuse it.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AwilixContainer<AppCradle>>;
};

/** The composition root: registers every package's services. */
export function createAppContainer(orm: DbCradle["orm"]): AwilixContainer<AppCradle> {
  const container = createContainer<AppCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
  registerCore(container);
  registerDb(container, orm);
  return container;
}

export function getContainer(): Promise<AwilixContainer<AppCradle>> {
  globalForContainer.__devmentorContainer ??= getOrm()
    .then(createAppContainer)
    .catch((error: unknown) => {
      // Don't cache a failed build (e.g. database unreachable); retry next time.
      globalForContainer.__devmentorContainer = undefined;
      throw error;
    });
  return globalForContainer.__devmentorContainer;
}

/**
 * Runs `fn` with a fresh request scope (its own forked EntityManager) and
 * disposes the scope afterwards. Use this at the edges: route handlers,
 * server actions, and server components.
 */
export async function withRequestScope<T>(fn: (cradle: AppCradle) => Promise<T>): Promise<T> {
  const scope = (await getContainer()).createScope<AppCradle>();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
