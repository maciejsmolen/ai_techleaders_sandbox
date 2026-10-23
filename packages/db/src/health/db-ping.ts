import type { DbPing } from "@devmentor/core";
import type { EntityManager } from "@mikro-orm/postgresql";

export function createDbPing({ em }: { em: EntityManager }): DbPing {
  return {
    async ping() {
      await em.execute("select 1");
    },
  };
}
