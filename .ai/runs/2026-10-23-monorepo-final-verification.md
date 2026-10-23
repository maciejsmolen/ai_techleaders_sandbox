# Monorepo migration: final verification

- **Date:** 2026-10-23
- **Goal:** Continue the monorepo migration from the saved plan; if the last phase is done, verify the whole project (install, build, tests, startup) before reporting it complete.
- **Spec:** [2026-10-20-monorepo-scaffold](../specs/implemented/2026-10-20-monorepo-scaffold.md)
- **Status:** completed

## Plan

All 12 implementation steps and all acceptance criteria in the spec were already complete (merged in PR #1), so no phase was left to implement. Run the final whole-project verification on `main`.

## Actions taken

- `npm ci` from the root lockfile (clean reinstall).
- Lint, typecheck, tests, production build.
- Migrations up/down on a scratch database (`devmentor_verify`, dropped afterwards).
- `next start` on port 3100 and the pm2 dev preview on port 3000; requested `/`, `/admin`, `/api/health`.
- Fixed the dev preview after the reinstall (stale `.next/dev` cache, see Lessons). No code changes were needed.

## Decisions & assumptions

- The DB-down (503) and connection-pool criteria were verified on 2026-10-20 and nothing has changed since, so they were not re-run.

## Verification

- `npm ci`: OK, 0 vulnerabilities. Warning: `esbuild` and `unrs-resolver` postinstall scripts aren't in `allowScripts` (pre-existing; lint and the migration CLI work anyway).
- `npm run lint`, `npm run typecheck`: pass, all packages.
- `npm test`: 2 files, 4 tests passed.
- `NODE_ENV=production npm run build`: pass. `@mikro-orm/postgresql` is loaded as an external, not bundled.
- `db:migration:up` on a fresh database applied `Migration20261020203009_init`; `db:migration:down` reverted it.
- `next start` (3100): `/` 200 (starter page), `/admin` 200 (Dashboard), `/api/health` 200 `{"status":"ok","db":"ok"}`.
- Dev preview (3000): first 500 on every route after `npm ci`; after clearing `.next/dev` and restarting, all three routes return 200 and the health check returns ok.

## Open issues / follow-ups

- Review the `allowScripts` warning (`npm install-scripts ls`).
- Next 16.4.3 is available (installed: 16.4.2).
- Product work: replace the starter landing page, first entity + migration, TypeScript 7 upgrade.

## Lessons

- Updated the sandbox preview lesson in [`.ai/lessons.md`](../lessons.md): after `npm ci` the dev cache must be cleared, not just the server restarted.
