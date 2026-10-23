import { describe, expect, it } from "vitest";

import { createOrmConfig } from "./config";

const url = "postgres://devmentor:devmentor@localhost:5432/devmentor";

describe("createOrmConfig", () => {
  it("requires DATABASE_URL", () => {
    expect(() => createOrmConfig({})).toThrow("DATABASE_URL is not set");
  });

  it("uses the URL and the default pool size", () => {
    const config = createOrmConfig({ DATABASE_URL: url });

    expect(config.clientUrl).toBe(url);
    expect(config.pool).toEqual({ min: 0, max: 10 });
    expect(config.debug).toBe(false);
  });

  it("reads the pool size, falling back on values that aren't numbers", () => {
    expect(createOrmConfig({ DATABASE_URL: url, DATABASE_POOL_MIN: "2", DATABASE_POOL_MAX: "20" }).pool).toEqual({
      min: 2,
      max: 20,
    });
    expect(createOrmConfig({ DATABASE_URL: url, DATABASE_POOL_MAX: "lots" }).pool).toEqual({ min: 0, max: 10 });
  });

  it("logs SQL only in development with DATABASE_DEBUG=true", () => {
    const debug = (env: Record<string, string>) => createOrmConfig({ DATABASE_URL: url, ...env }).debug;

    expect(debug({ NODE_ENV: "development", DATABASE_DEBUG: "true" })).toBe(true);
    expect(debug({ NODE_ENV: "production", DATABASE_DEBUG: "true" })).toBe(false);
    expect(debug({ NODE_ENV: "development" })).toBe(false);
  });

  it("defaults to process.env", () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = url;
    try {
      expect(createOrmConfig().clientUrl).toBe(url);
    } finally {
      process.env.DATABASE_URL = previous;
    }
  });
});
