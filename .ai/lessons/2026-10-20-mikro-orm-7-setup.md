# MikroORM 7 setup in this monorepo

- **Date:** 2026-10-20
- **Context:** [monorepo scaffold spec](../specs/implemented/2026-10-20-monorepo-scaffold.md), [run](../runs/2026-10-20-monorepo-scaffold.md)
- **Problem / finding:** several v7 behaviours differ from older MikroORM, and from what you'd expect:
  1. `MikroORM.init` **throws** when no entities are discovered (`discovery.warnWhenNoEntities` defaults to `true`, despite its name).
  2. The CLI needs a TypeScript loader to read a `.ts` config. It tries oxc → swc → tsx → jiti → tsimp → nub, and only warns if none is installed. Node's native type stripping isn't enough for our extensionless imports.
  3. The CLI doesn't load `.env` files.
  4. The package is ESM-only. `@mikro-orm/postgresql` re-exports `MikroORM`, `defineConfig`, `EntityManager`, etc.; import from there, not from `@mikro-orm/core`.
  5. `migration:create --blank` writes a `select 1` placeholder for `up` and `down`.
  6. `migration:up` writes a schema snapshot named **after the database** (`.snapshot-<dbName>.json`), so each environment adds its own file. Set `migrations.snapshotName`.
- **Root cause:** v7 is a rewrite on top of `@mikro-orm/sql` + kysely, with explicit extensions (`extensions: [Migrator, SeedManager]`).
- **Lesson:**
  - Keep `discovery.warnWhenNoEntities: false` only until the first entity exists.
  - Keep `tsx` as a dev dependency of `@devmentor/db`, with `"mikro-orm": { "tsLoader": "tsx", "configPaths": [...] }` in its `package.json`.
  - Load the root `.env` in the CLI config with `process.loadEnvFile`.
  - Keep the migrator and seeder in the CLI-only config, so they never reach the app runtime.
