import { Migrator } from "@mikro-orm/migrations";
import { SeedManager } from "@mikro-orm/seeder";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const existsSync = vi.fn<(path: string) => boolean>();
vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  existsSync: (path: string) => existsSync(path),
}));

const loadEnvFile = vi.spyOn(process, "loadEnvFile").mockImplementation(() => {});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgres://devmentor:devmentor@localhost:5432/devmentor");
  loadEnvFile.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

const loadConfig = async () => (await import("./mikro-orm.config")).default;

describe("MikroORM CLI config", () => {
  it("loads the repo-root .env when it exists", async () => {
    existsSync.mockReturnValue(true);

    await loadConfig();

    expect(loadEnvFile).toHaveBeenCalledWith(expect.stringMatching(/\/\.env$/));
    expect(existsSync.mock.calls[0]![0]).toBe(loadEnvFile.mock.calls[0]![0]);
  });

  it("skips the .env when there is none", async () => {
    existsSync.mockReturnValue(false);

    await loadConfig();

    expect(loadEnvFile).not.toHaveBeenCalled();
  });

  it("adds the migrator and seeder on top of the runtime config", async () => {
    existsSync.mockReturnValue(false);

    const config = await loadConfig();

    expect(config.clientUrl).toBe(process.env.DATABASE_URL);
    expect(config.extensions).toEqual([Migrator, SeedManager]);
    expect(config.migrations).toMatchObject({ path: "./migrations", pathTs: "./migrations", snapshotName: ".snapshot" });
    expect(config.seeder).toMatchObject({ path: "./seeders", defaultSeeder: "DatabaseSeeder" });
  });
});
