import { execFile } from "node:child_process";
import { rmSync } from "node:fs";
import { promisify } from "node:util";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

import { artifactsDir, repoRoot, startAppServer, type AppServer } from "./app-server";

declare module "vitest" {
  export interface ProvidedContext {
    /** The app, backed by a migrated, empty database. */
    baseUrl: string;
    /** The app with an unreachable database. */
    dbDownUrl: string;
  }
}

const UNREACHABLE_DATABASE_URL = "postgresql://nobody:nothing@127.0.0.1:1/none";

async function migrate(databaseUrl: string): Promise<void> {
  await promisify(execFile)("npm", ["run", "db:migration:up"], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

/**
 * Starts PostgreSQL in a throwaway container (testcontainers, needs Docker),
 * applies the migrations, and boots the production build against it.
 * `INTEGRATION_DATABASE_URL` points at an existing empty database instead
 * (for machines without Docker); CI always uses the container.
 */
export default async function setup(project: TestProject) {
  rmSync(artifactsDir, { recursive: true, force: true });
  let container: StartedPostgreSqlContainer | undefined;
  const servers: AppServer[] = [];

  const teardown = async () => {
    await Promise.all(servers.map((server) => server.stop()));
    await container?.stop();
  };

  try {
    let databaseUrl = process.env.INTEGRATION_DATABASE_URL;
    if (!databaseUrl) {
      container = await new PostgreSqlContainer("postgres:18").start();
      databaseUrl = container.getConnectionUri();
    }
    await migrate(databaseUrl);

    const [app, dbDown] = await Promise.all([
      startAppServer("app", databaseUrl),
      startAppServer("app-db-down", UNREACHABLE_DATABASE_URL),
    ]);
    servers.push(app, dbDown);

    project.provide("baseUrl", app.url);
    project.provide("dbDownUrl", dbDown.url);
  } catch (error) {
    await teardown();
    throw error;
  }

  return teardown;
}
