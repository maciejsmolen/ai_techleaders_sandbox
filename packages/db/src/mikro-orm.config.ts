// MikroORM CLI config (migrations, seeders). The app uses `createOrmConfig`
// directly, so the migrator and seeder never end up in the app runtime.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { SeedManager } from "@mikro-orm/seeder";

import { createOrmConfig } from "./config";

const rootEnvFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  ...createOrmConfig(),
  extensions: [Migrator, SeedManager],
  migrations: {
    path: "./migrations",
    pathTs: "./migrations",
    // Fixed name; the default includes the database name (one file per env).
    snapshotName: ".snapshot",
  },
  seeder: {
    path: "./seeders",
    pathTs: "./seeders",
    defaultSeeder: "DatabaseSeeder",
  },
});
