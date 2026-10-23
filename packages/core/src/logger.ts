import pino, { type DestinationStream, type Logger } from "pino";

import { getEnv } from "./config/env";

export type { Logger };

// Never log credentials: these keys are censored at the top level and one
// level deep (e.g. `{ body: { password } }`, `{ headers: { authorization } }`).
const sensitiveKeys = ["password", "token", "accessToken", "refreshToken", "jwt", "authorization", "cookie"];
const redactPaths = sensitiveKeys.flatMap((key) => [key, `*.${key}`]);

export function createLogger(
  options: { level?: string } = {},
  destination?: DestinationStream,
): Logger {
  return pino(
    { level: options.level ?? "info", redact: { paths: redactPaths, censor: "[redacted]" } },
    destination,
  );
}

// One logger per process. It doesn't depend on the container, so errors can
// still be logged when the container can't be built (database down).
const globalForLogger = globalThis as typeof globalThis & { __devmentorLogger?: Logger };

export function getLogger(): Logger {
  globalForLogger.__devmentorLogger ??= createLogger({ level: getEnv().LOG_LEVEL });
  return globalForLogger.__devmentorLogger;
}
