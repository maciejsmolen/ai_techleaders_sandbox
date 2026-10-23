import { Migration } from '@mikro-orm/migrations';

export class Migration20261020203009_init extends Migration {

  override name = 'Migration20261020203009_init';

  override up(): void | Promise<void> {
    this.addSql(`select 1`);
  }

  override down(): void | Promise<void> {
    this.addSql(`select 1`);
  }

}
