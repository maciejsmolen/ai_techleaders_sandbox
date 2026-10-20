import { defineConfig, type Options } from "@mikro-orm/postgresql";

import { entities } from "./entities";

function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Runtime ORM options shared by the app and the CLI. */
export function createOrmConfig(env: NodeJS.ProcessEnv = process.env): Options {
  const clientUrl = env.DATABASE_URL;
  if (!clientUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }

  return defineConfig({
    clientUrl,
    entities: [...entities],
    pool: {
      min: intFromEnv(env.DATABASE_POOL_MIN, 0),
      max: intFromEnv(env.DATABASE_POOL_MAX, 10),
    },
    // No entities exist yet; remove this once the first one is added.
    discovery: { warnWhenNoEntities: false },
    debug: env.NODE_ENV === "development" && env.DATABASE_DEBUG === "true",
  });
}
