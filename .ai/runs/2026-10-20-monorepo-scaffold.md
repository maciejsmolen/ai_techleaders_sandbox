# Monorepo scaffold

- **Date:** 2026-10-20
- **Goal:** implement the approved spec: move the app into `packages/app`, scaffold `core`, `db` and `ui`, and wire MikroORM, Awilix, Tailwind, shadcn/ui and Vitest
- **Spec:** [2026-10-20-monorepo-scaffold](../specs/implemented/2026-10-20-monorepo-scaffold.md)
- **Status:** completed (uncommitted on branch `feat/monorepo-scaffold`)

## Plan

Follow the spec's implementation steps 1–12 on the branch `feat/monorepo-scaffold`.

## Actions taken

1. Created the branch. Updated the spec with the user's answers (PostgreSQL 18 via compose, `PROXY`, `/admin`, Vitest).
2. Baseline on `main`: lint and `tsc` passed; `next build` **failed**. The cause was the sandbox's global `NODE_ENV=development`, not the code (see lessons).
3. Root:
   - npm-workspaces root `package.json` with orchestration scripts;
   - `tsconfig.base.json`, `vitest.config.mts`, a shared `eslint.config.mjs` with boundary rules;
   - `docker-compose.yml` (`postgres:18`) and `.env.example`;
   - unanchored `.gitignore`.
4. Moved `src/`, `public/`, `next.config.ts` and `next-env.d.ts` into `packages/app`. The landing page moved to `(frontend)/`. Used `cp -a` + `rm`, because the overlay filesystem rejects directory renames.
5. Upgraded Next.js 16.3.4 → 16.4.2 and React 19.2.8 → 19.3.1.
6. Moved the Next.js agent block to `packages/app/AGENTS.md`, regenerated with Next's own `writeAgentFiles` (16.4 changed the block text), and added `packages/app/CLAUDE.md`. The root `AGENTS.md` now has a pointer instead.
7. `ui`:
   - shadcn `components.json` (aliases `@devmentor/ui/*`) and the theme in `src/styles/globals.css`;
   - `button` added via `npx shadcn add button`. The layout was mirrored from a throwaway `shadcn init --monorepo` probe in `/tmp`, since deleted.
8. `app`:
   - separate root layouts for `(frontend)` and `(backend)/admin`, Tailwind v4 through PostCSS, and an `/admin` page using `Button`;
   - Awilix composition root `src/server/container.ts` (`createAppContainer`, `getContainer`, `withRequestScope`);
   - `GET /api/health`;
   - `next.config.ts` with root `.env` loading and `serverExternalPackages`.
9. `core`: `HealthService`, the `DbPing` port, `CoreCradle` and `registerCore`.
10. `db`:
    - `config.ts` (runtime) and `mikro-orm.config.ts` (CLI);
    - `getOrm()`, cached on `globalThis`;
    - `DbPing` implementation, `registerDb`, `DbCradle`;
    - `DatabaseSeeder` and the blank initial migration `Migration20261020203009_init`;
    - CLI scripts, using the `tsx` loader.
11. Tests:
    - `core`: `HealthService` ok and error paths;
    - `app`: container wiring, and one `EntityManager` fork per scope.
12. Docs:
    - `AGENTS.md`: PROXY/strict, `/admin` and root layouts, Tailwind/preflight, the `getOrm`/config split, a Testing section, a Commands table; "Current state" removed; the verify checklist updated;
    - `README.md`: status note removed; setup steps, commands and the health slice added.
13. Moved the spec to `specs/implemented/`, with its implementation notes and deviations.

## Decisions & assumptions

- **Separate root layouts per area.** The starter page's CSS variables clash with the shadcn theme. Spec deviation 1.
- **No Tailwind preflight on the frontend** while the starter page exists, so it renders unchanged. Spec deviation 2.
- **`serverExternalPackages: ["@mikro-orm/postgresql"]` only.** I confirmed in the build output that nothing else from MikroORM is bundled.
- **`noUncheckedIndexedAccess` left out.** It broke the existing `backdrop.tsx`, and restyling or refactoring that page is a non-goal.
- **PostgreSQL 18 in compose**, the latest stable. The user said yes to compose without naming a version.
- **Verification ran against PostgreSQL 17**, since Docker isn't available here:
  - the workspace's managed instance, through a scratch database `devmentor_verify`, now dropped;
  - a throwaway cluster on port 5499 for the database-down tests, now removed.
  - The workspace database `open-mercato` was used only for `select 1` probes and still has 0 tables.
- **Restarted the pm2 `workspace-preview`** once, after reinstalling `node_modules`. It was serving 500s.

## Verification

All results below are from this run.

- **Install:** `npm install` at the root: up to date. One root `package-lock.json`, no nested lockfiles. `npm ls` is clean.
- **Lint, typecheck, test:** `npm run lint`, `npm run typecheck` and `npm test` all exit 0 (Vitest: 2 files, 4 tests).
- **Build:** `NODE_ENV=production npm run build` exits 0, with routes `/`, `/_not-found`, `/admin` and `ƒ /api/health`. The server chunk loads `@mikro-orm/postgresql` as an external, and the only `.next/node_modules` entry is `@mikro-orm`.
- **Preview command** (pm2, `npm run dev -- --hostname 0.0.0.0 --port 3000` at the root): `/` returns 200 with the original starter copy, `/admin` 200, `/api/health` 200, `/nope` 404.
- **CSS isolation**, from the built CSS:
  - `/admin`'s stylesheet has the shadcn `--primary: #171717`, preflight, and `.bg-primary` / `.h-8`;
  - `/`'s stylesheet keeps `--primary: #e5f520`, with no preflight and no `.bg-primary`.
  - The `/admin` HTML renders a `data-slot="button"` button with the shadcn classes.
- **Migrations** on a fresh database: `db:migration:up` → `list` → `down` → `up` all succeed. `db:seed` succeeds. While reviewing the diff I found per-database snapshot files and fixed the name with `snapshotName: ".snapshot"`. Re-checked on a scratch database (since dropped): only `.snapshot.json` is written.
- **Health check** (`next start` on port 3200, `DATABASE_POOL_MAX=4`):
  - 50 concurrent requests: all 200, at most 2 connections open;
  - database stopped: 503 and the app keeps running;
  - database restarted: 200 again, with no app restart;
  - app cold-started with the database down: 503, then 200 once the database is up.
- **Dev hot reload:** three edits to the route each changed the response (`probe: 1→2→3`), and the connection count stayed at 1.
- **Boundary lint:** deliberate violations were rejected, then removed:
  - `core` → `@mikro-orm/core`;
  - `app` → `../../../core/src`;
  - `ui` → `@devmentor/db`;
  - `db` → `@devmentor/ui`.
- **Root `.env`:** with `DATABASE_URL` unset, both the CLI (`migration:list`) and `loadEnvConfig` read the temporary root `.env`, which was then deleted.
- **Not verified:** `docker compose up`, because Docker isn't available. The image's `VOLUME /var/lib/postgresql` was checked against the official Dockerfile for 18.

## Open issues / follow-ups

- Commit the work and open a PR (not done; waiting for the user).
- Replace the starter landing page, then enable Tailwind preflight on the frontend (`@import "tailwindcss";`) and delete the unused `(frontend)/page.module.css`.
- The first real entity: add it to `packages/db/src/entities/index.ts`, remove `warnWhenNoEntities: false`, and generate a migration.
- TypeScript 7 upgrade (separate spec).
- npm 11 warns that `unrs-resolver`'s postinstall isn't in `allowScripts`. Lint works without it, but review it with `npm install-scripts ls`.

## Lessons

Added or updated in [`.ai/lessons.md`](../lessons.md):
- the `NODE_ENV` build failure;
- MikroORM 7 externals (corrected), with a [detail file](../lessons/2026-10-20-mikro-orm-7-setup.md);
- the `next dev` agent block (updated);
- the sandbox preview dev server;
- the sandbox PostgreSQL;
- overlay filesystem directory renames.
