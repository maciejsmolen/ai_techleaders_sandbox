# Next.js is newer than your training data

Its APIs, conventions, and file structure may differ from what you remember. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (hoisted to the repo root). The managed rules block that `next dev` maintains lives in [`packages/app/AGENTS.md`](packages/app/AGENTS.md).

# DevMentor — architecture rules

DevMentor is a monorepo. These rules are **binding** for all code. If a task seems to need something different (another library, a new package, a dependency that breaks the direction rules), stop and ask. Don't work around a rule silently. Architecture notes for humans are in `README.md`.

## Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (latest, App Router) + React + TypeScript (`strict`) |
| Database | PostgreSQL |
| ORM | MikroORM (`@mikro-orm/postgresql`): entities, migrations, connection pooling |
| Dependency injection | Awilix |
| Styling, frontend (public) pages | Tailwind CSS |
| Styling, backend (admin) pages | shadcn/ui (built on Tailwind) |
| Testing | Vitest |
| Package manager | npm workspaces (`package-lock.json` is the lockfile; don't add yarn or pnpm files) |

- Don't add an alternative to any of these (e.g. Prisma, Drizzle, Inversify, CSS-in-JS, another UI kit) without the user's approval.
- These libraries change between major versions. Before writing setup or config code, check the installed version and its docs (for Next.js, `node_modules/next/dist/docs/`). Don't rely on APIs from memory.

## Monorepo layout

```
packages/
├── app/    # @devmentor/app  — the Next.js application (routes, pages, server actions, DI composition root)
├── core/   # @devmentor/core — reusable, framework-agnostic logic: domain types, services, interfaces, DI tokens, utils
├── db/     # @devmentor/db   — MikroORM config, entities, repositories, migrations, seeders, DB helpers
└── ui/     # @devmentor/ui   — reusable React components (shadcn/ui components + shared Tailwind components)
```

- Packages are named `@devmentor/<folder>`. Import them by package name, never by relative path across packages (`../../core/...` is forbidden).
- Each package has its own `package.json`, `tsconfig.json` (extending a shared base), and a public entry point (`src/index.ts` and/or `exports`). Import only from a package's public exports, not from its internals.
- Dependency direction (no cycles):
  - `app` → `core`, `db`, `ui`
  - `db` → `core`
  - `ui` → `core` (types and utils only)
  - `core` → no internal packages
- `ui` must not import `db` or anything server-only. `core` must not import Next.js, React, or MikroORM.
- New code goes in the lowest package that fits. If it is reusable and framework-agnostic, it goes in `core`. If it touches persistence, `db`. If it is a reusable component, `ui`. If it is app-specific wiring or routes, `app`.
- To add a new package, propose it first (it changes the architecture).
- Next.js transpiles workspace packages automatically, so `transpilePackages` is not needed for them. Internal packages ship TypeScript source; there is no build step.
- `eslint.config.mjs` enforces these boundaries (`no-restricted-imports`). Don't disable those rules; if one blocks you, the code is in the wrong package.

## Database (MikroORM + PostgreSQL)

- Entities, the MikroORM config, repositories, and migrations live in `packages/db` only.
- **All schema changes go through migrations** created with the MikroORM migrator and committed to `packages/db`. Never use `schema:update` or `schema:fresh` against shared or production databases. Never edit a migration that has already been applied; write a new one.
- Always get the ORM through `getOrm()` from `@devmentor/db`. It returns the single per-process instance, cached on `globalThis` so dev hot reloads reuse the pool. Pool size comes from `DATABASE_POOL_MIN`/`DATABASE_POOL_MAX`.
- `src/config.ts` holds the runtime options shared by the app and the CLI. `src/mikro-orm.config.ts` is the CLI-only config (migrator, seeder); the app must not import it.
- List every entity explicitly in `packages/db/src/entities/index.ts` (no folder globs). When the first entity is added, remove `discovery.warnWhenNoEntities: false` from `config.ts`.
- Use a **forked `EntityManager` per request or unit of work** (`em.fork()` or `RequestContext`). Never use the global EntityManager in request handling.
- Run database code on the server only (Server Components, Route Handlers, Server Actions, scripts), never in client components. MikroORM must stay out of the bundle via `serverExternalPackages` in `packages/app/next.config.ts`. `@mikro-orm/core` and `pg` are excluded by Next by default, and `@mikro-orm/postgresql` is listed. Add any other `@mikro-orm/*` package that app code imports at runtime.
- Configuration comes from environment variables. There is one `.env` at the repo root (template: `.env.example`), loaded by `next.config.ts` and by the CLI config. Never commit credentials. `.env*` is gitignored except `.env.example`.

## Dependency injection (Awilix)

- `core` defines service interfaces and registration names. `db` provides the persistence implementations (repositories, EM factory) together with a function that registers them. The **composition root is in `app`**: it builds the container and calls each package's registration function.
- Services receive their dependencies through constructor/factory injection. Don't import singletons directly and don't call `container.resolve` inside services. Resolve only at the edges (route handlers, server actions, server components).
- Lifetimes: infrastructure (ORM instance, config, loggers) is `singleton`. Anything that holds an `EntityManager` or request data is `scoped`. Create a scope per request with `container.createScope()`.
- The container uses **`InjectionMode.PROXY`** with `strict: true`. Factories take the cradle as their single argument and destructure what they need (`({ em }) => …`). Strict mode rejects a singleton that depends on a scoped registration.
- Each package exports a `<Pkg>Cradle` type and a `register<Pkg>(container)` function. `packages/app/src/server/container.ts` combines them (`AppCradle`). At the edges, use `withRequestScope(fn)`: it creates a scope and disposes it afterwards.

## UI: frontend vs backend pages

- **Frontend pages** (public, user-facing) use plain Tailwind CSS utilities and shared components from `@devmentor/ui` that are built with Tailwind. They don't use shadcn/ui components.
- **Backend pages** (admin and management areas) use shadcn/ui components.
- The two areas are separate route groups with **separate root layouts** (each renders its own `<html>`/`<body>` and imports its own CSS), so their styles can't leak into each other:
  - `src/app/(frontend)/` holds the public pages. Its CSS is `(frontend)/globals.css`.
  - `src/app/(backend)/admin/` holds the admin area, served under **`/admin`**. Its CSS is `@devmentor/ui/globals.css` (Tailwind + shadcn theme).
  - There is no top-level `app/layout.tsx`. Navigating between the two areas does a full page load, which is expected.
- shadcn/ui components are generated into `packages/ui` (its `components.json` lives there) and imported as `@devmentor/ui/...`. Don't duplicate them in `app`.
- Tailwind v4 is configured CSS-first (no `tailwind.config.*`). Each area's CSS has `@source` directives that cover `packages/ui/src` and `packages/app/src`; keep them when moving files.
- Add shadcn components from `packages/ui`: `npx shadcn add <component>`.
- Default to Server Components. Add `"use client"` only where interactivity requires it.

## Testing (Vitest)

- Tests sit next to the code as `*.test.ts(x)` in `src/`. Each package is a Vitest project (`packages/*/vitest.config.*`), aggregated by the root `vitest.config.mts`.
- Unit tests don't touch the database. Pass fakes through factory arguments, or build the container with `createAppContainer(fakeOrm)`.
- New services come with tests. A bug fix comes with a test that fails without the fix.

## Commands

Run everything from the repo root:

| Command | What it does |
|---------|--------------|
| `npm run dev` / `build` / `start` | Next.js app (`@devmentor/app`) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` in every package |
| `npm test` | Vitest, all packages (`npm run test -w @devmentor/<pkg>` for one) |
| `npm run db:migration:create -- --name <name>` | Generate a migration from entity changes (`--blank` for an empty one) |
| `npm run db:migration:up` / `db:migration:down` | Apply / revert migrations |
| `npm run db:seed` | Run `DatabaseSeeder` |
| `docker compose up -d` | Local PostgreSQL 18 (matches `.env.example`) |

Target a single package with `-w @devmentor/<pkg>`. New packages expose the same scripts (`lint`, `typecheck`, `test`) so the root scripts pick them up.

# Project AI workflow (`.ai/`)

All AI-related metadata lives in `.ai/`. These conventions are **mandatory** for every agent working in this repository.

## Structure

```
.ai/
├── specs/                  # Active specifications (SDD)
│   ├── implemented/        # Specs that have been fully implemented
│   └── archive/            # Abandoned / superseded / obsolete specs
├── runs/                   # Logs of autonomous AI runs
├── lessons.md              # Index of lessons learned (long-term memory)
└── lessons/                # Detail files for lessons
```

## Naming

Every file in `specs/` (including `implemented/` and `archive/`), `runs/`, and `lessons/` is named `YYYY-MM-DD-slug.md`:

- `YYYY-MM-DD` is the creation date (use today's date).
- `slug` is lowercase kebab-case (`[a-z0-9-]`), short and descriptive, e.g. `2026-10-20-add-order-export.md`.
- Never rename a file after creation (links depend on it). Moving it between spec folders is fine.

## Specs (`.ai/specs/`)

- This project uses spec-driven development: **non-trivial features are specified before they are implemented.** If a spec exists for the work, read it first and follow it; if the implementation must deviate, update the spec in the same change.
- A new spec goes in `.ai/specs/` root. When its implementation is complete, move it (`git mv`) to `.ai/specs/implemented/`. When it is abandoned or superseded, move it to `.ai/specs/archive/`.
- Do not write new specs unless asked or the task clearly warrants one. Don't edit specs in `implemented/` or `archive/` except to fix factual errors.

## Runs (`.ai/runs/`)

- Every **autonomous** AI run (a task executed without step-by-step human guidance) MUST create exactly one log file `.ai/runs/YYYY-MM-DD-slug.md` — create it at the start, update it as you go, and finalize it before finishing.
- Required content:

```markdown
# <Run title>

- **Date:** YYYY-MM-DD
- **Goal:** what was requested
- **Spec:** link to the spec, if any
- **Status:** in-progress | completed | blocked | abandoned

## Plan
## Actions taken        <!-- key steps, files changed, commands that mattered -->
## Decisions & assumptions
## Verification         <!-- tests/lint/build run and their results, stated honestly -->
## Open issues / follow-ups
## Lessons              <!-- links to entries added to .ai/lessons.md, or "none" -->
```

- Log failures and skipped steps as they are; never report unverified work as verified.

## Lessons (`.ai/lessons.md` + `.ai/lessons/`)

- **Before starting a task:** read `.ai/lessons.md` and apply anything relevant.
- **After a user corrects you**, record the lesson right away so the mistake is not repeated. Write it as a rule for your future self: what to do and why, not a story of what happened.
- **After fixing a bug, or when you learn something non-obvious** (a gotcha, a convention not documented elsewhere, a mistake worth not repeating, a useful improvement), add an entry to the index in `.ai/lessons.md`. If it needs more than a few lines, put the detail in `.ai/lessons/YYYY-MM-DD-slug.md` and link it. Entry formats are documented at the top of `lessons.md`.
- Don't record things derivable from the code or git history. Update or delete lessons that become wrong.
- If the same lesson keeps coming up, promote it to a rule in this file and link the lesson.

# Working principles

## Plan complex work before coding

- For anything non-trivial (several files, unclear requirements, or several valid approaches), plan first: explore the code, then write down the approach, the files you'll touch, and how you'll verify it. Get the user's sign-off before implementing. Put the effort into the plan, so the implementation goes through in one pass.
- If there is a spec, the plan implements it. If the plan exposes gaps or ambiguity in the spec, resolve them in the spec first.
- If the implementation goes off track (repeated failed attempts, or a growing pile of patches), stop and re-plan. Don't push through.
- Before presenting a plan for a larger change, review it critically, as a staff engineer would. A fresh subagent can do this review.

## Verify every change

- "Done" means verified. Before reporting completion, run the checks that apply, for every package you touched (see **Commands** above):
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build` for changes that affect routing, config, or the build
  - For schema changes, the migration must apply cleanly to a fresh database.
- For UI or behavior changes, run the app (`npm run dev`) and exercise the change.
- Check that your change respects the architecture rules above: package boundaries, dependency direction, DI, and migrations.
- When fixing a bug, reproduce it first (from the report, logs, or a failing check), then confirm the same reproduction passes after the fix.
- Review your own diff before finishing: would it survive a skeptical reviewer? If a fix works but is hacky, rewrite it cleanly now that you understand the problem.
- Report the real results. If a check fails or can't be run, say so (and log it in the run log).

## Work autonomously, keep context lean

- Given a bug report or failing check, investigate and fix it end to end. Read logs, reproduce, fix, verify. Only ask the user about decisions that are genuinely theirs to make.
- Delegate broad searches and independent sub-tasks to subagents, so the main context stays focused.
- Run independent tasks in parallel, each in its own git worktree, so they don't collide.
- If a workflow repeats often, propose turning it into a skill or command committed to the repo (e.g. `.claude/skills/`).

## Checklist for every task

1. Read `.ai/lessons.md`.
2. Find and read the relevant spec in `.ai/specs/` (if any).
3. If autonomous: create the run log in `.ai/runs/`.
4. For non-trivial work: plan, and get sign-off.
5. Do the work; keep the spec accurate.
6. Verify (see above), then move completed specs to `specs/implemented/`.
7. Record lessons, including any from user corrections; finalize the run log.
