# Monorepo scaffold: move to `packages/` and install the stack

- **Date:** 2026-10-20
- **Status:** implemented 2026-10-20 (run log: [2026-10-20-monorepo-scaffold](../../runs/2026-10-20-monorepo-scaffold.md))
- **Related:** `AGENTS.md` → "DevMentor — architecture rules", `README.md` → "Architecture"

## Goal

Turn the current single Next.js app (`src/` at the repo root) into the npm-workspaces monorepo described in `AGENTS.md`. The result has four packages (`app`, `core`, `db`, `ui`) and the full stack installed and wired: MikroORM + PostgreSQL, Awilix, Tailwind, and shadcn/ui.

The scaffold must be proven end to end by **one thin vertical slice**: a health check that goes route → DI container → service → database.

## Non-goals

- No product features, domain entities, auth, or real admin screens.
- No restyling of the existing landing page. It moves as-is, and its CSS Modules stay until a later spec.
- No TypeScript 7 upgrade. Stay on the installed TS 5.x major. TS 7 (latest on npm: 7.0.2) gets its own spec once Next.js and the toolchain support it.
- No CI pipeline or deployment setup.

## Current state

- Root `package.json` (`workspace-app`) holds Next 16.3.4, React 19.2.8, TS ^5, and ESLint 9.
- Source: `src/app/{layout.tsx,page.tsx,backdrop.tsx,globals.css,page.module.css,favicon.ico}` and `public/*.svg`.
- Root config files: `next.config.ts`, `tsconfig.json` (`@/*` → `./src/*`), `eslint.config.mjs`, `next-env.d.ts`.
- `.gitignore` uses root-anchored paths (`/.next/`, `/node_modules`, …).
- `openmercato.toml` preview runs `npm run dev -- --hostname 0.0.0.0 --port 3000` **from the repo root**.
- The Next.js agent-rules block in the root `AGENTS.md` is managed by `next dev`. `next dev` writes it into the **Next project directory** (`writeAgentFiles(dir)` in `next/dist/server/lib/generate-agent-files.js`).
- Toolchain: Node 24.21, npm 11.19. MikroORM 7 needs Node ≥ 22.17, so we're fine.

## Target structure

```
/
├── package.json              # private root: "workspaces": ["packages/*"], orchestration scripts only
├── package-lock.json
├── tsconfig.base.json        # shared strict compiler options
├── eslint.config.mjs         # shared config + package-boundary rules
├── vitest.config.ts          # Vitest projects for all packages
├── docker-compose.yml        # local PostgreSQL 18
├── .env.example              # DATABASE_URL etc. (no secrets)
├── AGENTS.md / CLAUDE.md     # project rules (root)
└── packages/
    ├── app/                  # @devmentor/app
    │   ├── AGENTS.md         # Next.js agent-rules block (managed by `next dev`) + app-specific notes
    │   ├── CLAUDE.md         # @AGENTS.md
    │   ├── next.config.ts
    │   ├── postcss.config.mjs
    │   ├── public/
    │   └── src/
    │       ├── app/
    │       │   ├── layout.tsx            # root layout (html/body, fonts)
    │       │   ├── (frontend)/           # Tailwind-only public pages; existing page.tsx moves here
    │       │   ├── (backend)/admin/      # shadcn/ui admin area, own layout; placeholder page at /admin
    │       │   └── api/health/route.ts   # vertical slice
    │       └── server/
    │           └── container.ts          # Awilix composition root + per-request scope helper
    ├── core/                 # @devmentor/core — no framework deps
    │   └── src/{index.ts, health/…}       # HealthService interface + implementation, DI registration names
    ├── db/                   # @devmentor/db
    │   ├── src/{index.ts, mikro-orm.config.ts, orm.ts, register.ts, health/…}
    │   ├── migrations/
    │   └── seeders/
    └── ui/                   # @devmentor/ui
        ├── components.json   # shadcn config
        └── src/{index.ts, components/ui/…, lib/utils.ts, styles/…}
```

Each package has its own `package.json` (`"private": true`, `name`, `exports`), its own `tsconfig.json` extending `../../tsconfig.base.json`, and `lint` / `typecheck` / `test` scripts (plus `build` and `dev` where they apply).

## Design decisions

1. **Internal packages ship TypeScript source.** Their `exports` point at `./src/*.ts`, with no build step. Next.js transpiles workspace packages automatically, so `transpilePackages` is not needed.
2. **The `@/*` path alias stays app-local** (`packages/app/tsconfig.json` → `./src/*`). Imports across packages always use `@devmentor/*`.
3. **The Next.js agent block moves to `packages/app/AGENTS.md`** (with `packages/app/CLAUDE.md` containing `@AGENTS.md`), because that's where `next dev` maintains it. The root `AGENTS.md` keeps a one-line pointer to it and drops the managed block, so it no longer goes stale. The generated files are committed.
4. **MikroORM 7:**
   - Drivers and add-ons: `@mikro-orm/core`, `@mikro-orm/postgresql`, `@mikro-orm/migrations`, `@mikro-orm/seeder`, `@mikro-orm/cli` (dev).
   - v7 uses `@mikro-orm/sql` + kysely instead of knex. Add `@mikro-orm/postgresql`, `@mikro-orm/sql`, `@mikro-orm/migrations` and `@mikro-orm/seeder` (if imported at runtime) to `serverExternalPackages` in `next.config.ts`. `@mikro-orm/core` and `pg` are already on Next's default list.
   - Entities use whichever definition style v7 recommends that needs no `reflect-metadata` and no `experimentalDecorators` (expected: `defineEntity`). Confirm against the v7 docs before writing code.
   - The pool size is configured explicitly in `mikro-orm.config.ts` from environment variables, with defaults.
   - `orm.ts` exposes a lazy `getOrm()` that caches the instance on `globalThis` in development.
   - The MikroORM CLI is run through `@devmentor/db` scripts (`db:migration:create`, `db:migration:up`, `db:migration:down`, `db:seed`), which are also proxied from the root. Check how v7's CLI loads a TS config (native Node type-stripping vs a loader such as `tsx`) and pick the simplest option that works.
5. **Awilix:**
   - `core` exports the registration names and interfaces.
   - `db` exports `registerDb(container)`: the ORM as a singleton (from `getOrm()`), plus a scoped `em` created with `orm.em.fork()`.
   - `app/src/server/container.ts` builds the root container once (cached on `globalThis` in dev), and exposes `withRequestScope(fn)`. That helper creates a scope, runs `fn`, and disposes the scope.
   - Injection mode: **`PROXY`**. Services receive one `cradle` object and destructure their dependencies.
6. **Tailwind v4, CSS-first:**
   - `@tailwindcss/postcss` in `packages/app/postcss.config.mjs`.
   - `@import "tailwindcss"` plus `@source "../../../ui/src"` in the app's global CSS, so classes used in `ui` are generated.
   - The existing `globals.css` custom properties are kept.
7. **shadcn/ui:**
   - Initialise it in `packages/ui` using the CLI's monorepo support, with aliases resolving to `@devmentor/ui/...`.
   - Add the `button` component only, as proof.
   - The shadcn theme variables are scoped to the admin layout, so they don't leak into frontend pages.
8. **Boundary enforcement:** `no-restricted-imports` rules in `eslint.config.mjs` encode the dependency direction from `AGENTS.md`, so a violation fails lint:
   - `core` must not import `@devmentor/*`, `next`, `react` or `@mikro-orm/*`;
   - `ui` must not import `@devmentor/db` or `@devmentor/app`;
   - `db` must not import `@devmentor/ui` or `@devmentor/app`;
   - relative imports must not cross into another package.
9. **Testing (Vitest):**
   - A root `vitest.config.ts` defines one Vitest project per package; each package's `test` script runs its own project.
   - Tests live next to the code as `*.test.ts(x)`.
   - Unit tests don't touch the database; they get fakes through the container or constructor.
   - Proof: unit tests for `HealthService` (healthy and failing `DbPing`) and for the container wiring.
10. **Versions:** upgrade Next.js to the latest 16.x (16.4.2 as of this writing), together with the matching `eslint-config-next`. React is upgraded to the version the Next release requires. A dependency used in several packages is pinned to the same version range in each of them.

## Implementation steps

1. Create a branch and a run log `.ai/runs/2026-10-20-monorepo-scaffold.md` (if run autonomously).
2. Root:
   - Convert `package.json` into a private workspace root, with orchestration scripts: `dev`, `build`, `start` → `-w @devmentor/app`; `lint`, `typecheck` → `--workspaces --if-present`; `db:*` → `-w @devmentor/db`.
   - Add `tsconfig.base.json`, `.env.example`, `docker-compose.yml` (`postgres:18`) and `vitest.config.ts`.
   - Root scripts also include `test` → `vitest run`.
   - Make the `.gitignore` paths unanchored (`.next/`, `node_modules/`, `next-env.d.ts`, …).
3. `git mv` the app (`src/`, `public/`, `next.config.ts`, `next-env.d.ts`) into `packages/app/`, and add its `package.json` and `tsconfig.json`. The existing landing page moves to `src/app/(frontend)/page.tsx`. `npm install`, then confirm the app runs unchanged before going further.
4. Move the Next.js agent block (design decision 3).
5. Scaffold `core`, `db` and `ui` with `package.json`, `tsconfig.json`, `src/index.ts`, and `lint`/`typecheck` scripts.
6. Set up Tailwind in `app` (design decision 6) and shadcn in `ui` (design decision 7). Add the `(backend)/admin` layout and a placeholder page that uses `Button` from `@devmentor/ui`.
7. Set up MikroORM in `db` (design decision 4): config, `getOrm()`, CLI scripts, and an **initial empty migration** to prove the migrator works.
8. Wire Awilix (design decision 5), and implement the vertical slice:
   - `core`: a `HealthService` that depends on a `DbPing` interface;
   - `db`: a `DbPing` implementation running `select 1` on the scoped `em`;
   - `app`: `GET /api/health` returns `{ status: "ok", db: "ok" }`, or a 503 with `db: "error"`.
9. Add Vitest (design decision 9) and the `HealthService` tests.
10. Add the ESLint boundary rules (design decision 8). Prove they work by introducing a forbidden import, watching lint fail, and then removing it.
11. Update the docs:
    - `AGENTS.md`: remove the "Current state" note, record the chosen Awilix injection mode (`PROXY`), the `/admin` prefix and Vitest, and add the new `db:*` and `test` commands to **Commands**.
    - `README.md`: remove the status note, and add the real setup steps (env file, `docker compose up -d`, migrations).
12. Verify (acceptance criteria). Then move this spec to `.ai/specs/implemented/`, record lessons, and finalize the run log.

## Acceptance criteria

- [x] `npm install` at the root succeeds with a single root `package-lock.json`, and no lockfiles inside packages.
- [x] `npm run lint`, `npm run typecheck` and `npm test` at the root pass for every package.
- [x] `npm run build` at the root produces a production build of `@devmentor/app` without bundling MikroORM.
- [x] The `openmercato.toml` preview command (`npm run dev -- --hostname 0.0.0.0 --port 3000` at the root) starts the app, and `/` renders the existing landing page unchanged.
- [x] `/admin` renders with its own layout and a shadcn `Button` imported from `@devmentor/ui`, with correct Tailwind styling.
- [x] With PostgreSQL running and `DATABASE_URL` set, `npm run db:migration:up` applies the initial migration to a fresh database, and `GET /api/health` returns `200 { status: "ok", db: "ok" }`.
- [x] With the database stopped, `GET /api/health` returns 503 and the app does not crash.
- [x] Repeated requests and dev hot reloads don't grow the number of PostgreSQL connections beyond the configured pool size, which shows a single cached ORM instance.
- [x] The ESLint boundary rules reject a `core` → `@mikro-orm/core` import and a relative import across packages.
- [x] Nothing outside `packages/` contains application source. `AGENTS.md` and `README.md` describe the actual state.

## Risks

- **MikroORM 7 + Next.js bundling:** externals may be missing, which shows up as build or runtime errors from dynamic requires. Mitigation: build and hit `/api/health` early (step 8), and extend `serverExternalPackages` as needed.
- **TS config loading for the MikroORM CLI** may need a loader. That's acceptable as a dev dependency of `db` only.
- **Tailwind scanning across packages:** if the `@source` path is wrong, styles are silently missing in `ui` components. The `/admin` check covers this.

## Resolved questions (2026-10-20)

1. **Local PostgreSQL:** `docker-compose.yml` with `postgres:18` (latest stable).
2. **Awilix injection mode:** `PROXY`.
3. **Admin URL prefix:** `/admin`.
4. **Testing:** Vitest, added in this spec.

## Implementation notes (deviations from the plan)

1. **Separate root layouts instead of one shared root layout.** The starter page's `:root` variables (`--background`, `--primary`, `--border`, …) clash with the shadcn theme. So `(frontend)/layout.tsx` and `(backend)/admin/layout.tsx` each render `<html>`/`<body>` and import their own CSS, and there is no `app/layout.tsx`. `global-not-found` was not needed: unmatched URLs return 404.
2. **No Tailwind preflight on the frontend yet.** Leaving it out keeps the starter page pixel-identical. Switch to the full `@import "tailwindcss"` when that page is replaced.
3. **`serverExternalPackages` lists only `@mikro-orm/postgresql`.** The built server chunk loads it as an external, and `@mikro-orm/sql` and `kysely` are reached only through it, so they never enter the bundle.
4. **The MikroORM config is split.**
   - `src/config.ts` holds the runtime options and is used by the app.
   - `src/mikro-orm.config.ts` is CLI-only (migrator, seeder) and loads the root `.env` via `process.loadEnvFile`.
   - The app loads the same `.env` with `@next/env`'s `loadEnvConfig` in `next.config.ts`.
   - `discovery.warnWhenNoEntities` is off until the first entity exists.
5. **The MikroORM CLI uses the `tsx` loader** (dev dependency of `db`), set via `"mikro-orm": { "tsLoader": "tsx" }` in `packages/db/package.json`. Node's native type stripping can't resolve the extensionless imports.
6. **The initial migration is blank** (`Migration20261020203009_init`, `select 1`): there are no entities yet.
7. **`container.ts` exposes `createAppContainer(orm)`.** `getContainer()` composes it with `getOrm()`, so the wiring is unit-testable with a fake ORM.
8. **shadcn 4.22 generates Base UI–based components** (`@base-ui/react`) and uses the `cn` package for class merging.
9. **The Vitest configs for the root and `app` are `.mts`.** Those packages aren't `"type": "module"`, and switching `app` would change how `next.config.ts` loads.
10. **`noUncheckedIndexedAccess` was tried and dropped.** It broke the existing landing page, which is out of scope here.
11. **Verified against PostgreSQL 17.** Docker isn't available in the build environment; `docker-compose.yml` targets `postgres:18`, with the volume path checked against the official image.
12. **The migration snapshot has a fixed name** (`migrations.snapshotName: ".snapshot"` → `packages/db/migrations/.snapshot.json`, committed). By default MikroORM names it after the database, which creates one file per environment.
