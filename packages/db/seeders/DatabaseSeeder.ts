import type { EntityManager } from "@mikro-orm/postgresql";
import { Seeder } from "@mikro-orm/seeder";

export class DatabaseSeeder extends Seeder {
  // Call other seeders here, e.g. `return this.call(em, [UserSeeder]);`
  async run(em: EntityManager): Promise<void> {
    void em;
  }
}
