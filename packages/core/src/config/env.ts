import { z } from "zod";

// App-level settings. Database settings are read by `@devmentor/db` itself,
// because `db` can't import `core`.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

/** Validates the environment; throws with every invalid variable listed. */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let cachedEnv: Env | undefined;

/** The process environment, parsed once. */
export function getEnv(): Env {
  cachedEnv ??= parseEnv();
  return cachedEnv;
}
