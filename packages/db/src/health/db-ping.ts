import type { EntityManager } from "@mikro-orm/postgresql";

/** Checks that the database answers. */
export interface DbPing {
  ping(): Promise<void>;
}

export function createDbPing({ em }: { em: EntityManager }): DbPing {
  return {
    async ping() {
      await em.execute("select 1");
    },
  };
}
