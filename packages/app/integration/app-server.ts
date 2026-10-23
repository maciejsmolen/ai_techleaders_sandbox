import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

export const appDir = path.resolve(import.meta.dirname, "..");
export const repoRoot = path.resolve(appDir, "../..");
/** Server logs and screenshots; CI uploads this folder when the job fails. */
export const artifactsDir = path.join(appDir, "integration/.artifacts");

const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

export interface AppServer {
  url: string;
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port"))));
    });
  });
}

async function waitUntilServing(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited with code ${child.exitCode}`);
    try {
      // `/` doesn't need the database, so this also works for the "database down" server.
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not listening yet; poll again.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`${url} did not respond within ${STARTUP_TIMEOUT_MS} ms`);
}

/** Starts the production build (`next start`) with the given database. Run `npm run build` first. */
export async function startAppServer(name: string, databaseUrl: string): Promise<AppServer> {
  if (!existsSync(path.join(appDir, ".next/BUILD_ID"))) {
    throw new Error("No production build found. Run `npm run build` before the integration tests.");
  }
  mkdirSync(artifactsDir, { recursive: true });
  const log = createWriteStream(path.join(artifactsDir, `${name}.log`));

  const port = await freePort();
  const child = spawn(path.join(repoRoot, "node_modules/.bin/next"), ["start", "--port", String(port)], {
    cwd: appDir,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: databaseUrl },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);

  const url = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.kill("SIGTERM");
      await exited;
    }
    log.end();
  };

  try {
    await waitUntilServing(url, child);
  } catch (error) {
    await stop();
    throw error;
  }
  return { url, stop };
}
