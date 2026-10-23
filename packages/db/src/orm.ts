import { MikroORM } from "@mikro-orm/postgresql";

import { createOrmConfig } from "./config";

// One ORM (and so one connection pool) per process. Cached on globalThis so
// dev hot reloads reuse it instead of opening a new pool each time.
const globalForOrm = globalThis as typeof globalThis & {
  __devmentorOrm?: Promise<MikroORM>;
};

export function getOrm(): Promise<MikroORM> {
  globalForOrm.__devmentorOrm ??= MikroORM.init(createOrmConfig()).catch((error: unknown) => {
    // Don't cache a failed connection; the next call retries.
    globalForOrm.__devmentorOrm = undefined;
    throw error;
  });
  return globalForOrm.__devmentorOrm;
}
