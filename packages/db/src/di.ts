import type { CoreCradle } from "@devmentor/core";
import type { EntityManager, MikroORM } from "@mikro-orm/postgresql";
import { asFunction, asValue, type AwilixContainer } from "awilix";

import { createDbPing } from "./health/db-ping";

export interface DbCradle {
  orm: MikroORM;
  /** A fork of the global EntityManager, one per request scope. */
  em: EntityManager;
  dbPing: CoreCradle["dbPing"];
}

/** `orm` comes from `getOrm()`; it's async, so the caller awaits it first. */
export function registerDb(container: AwilixContainer, orm: MikroORM): void {
  container.register({
    orm: asValue(orm),
    em: asFunction(({ orm }: Pick<DbCradle, "orm">) => orm.em.fork()).scoped(),
    dbPing: asFunction(createDbPing).scoped(),
  });
}
