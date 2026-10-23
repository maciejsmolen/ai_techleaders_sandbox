# Next.js is newer than your training data

Its APIs, conventions, and file structure may differ from what you remember. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (hoisted to the repo root). The managed rules block that `next dev` maintains lives in [`packages/app/AGENTS.md`](packages/app/AGENTS.md).

# DevMentor — architecture rules

DevMentor is a monorepo. These rules are **binding** for all code. If a task seems to need something different (another library, a new package, a dependency that breaks the direction rules), stop and ask. Don't work around a rule silently. Architecture notes for humans are in `README.md`. The engineering standards (naming table, principles, security minimums, code review checklist) are in [`.ai/specs/engineering-standards.md`](.ai/specs/engineering-standards.md); they are binding too.

## Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (latest, App Router) + React + TypeScript (`strict`) |
| Database | PostgreSQL |
| ORM | MikroORM (`@mikro-orm/postgresql`): entities, migrations, connection pooling |
| Dependency injection | Awilix |
| Validation | Zod (shared schemas for routes and forms, env validation) |
| Logging | pino (via `getLogger()` / the `logger` cradle entry, with credential redaction) |
| Styling, frontend (public) pages | Tailwind CSS |
| Styling, backend (admin) pages | shadcn/ui (built on Tailwind) |
| Testing | Vitest |
| Package manager | npm workspaces (`package-lock.json` is the lockfile; don't add yarn or pnpm files) |

- Don't add an alternative to any of these (e.g. Prisma, Drizzle, Inversify, CSS-in-JS, another UI kit) without the user's approval.
- These libraries change between major versions. Before writing setup or config code, check the installed version and its docs (for Next.js, `node_modules/next/dist/docs/`). Don't rely on APIs from memory.

## Monorepo layout

```
packages/
├── app/    # @devmentor/app  — the Next.js application: routes, pages, server actions
├── core/   # @devmentor/core — services, ports, the DI container (composition root), HTTP layer, config, logger
├── db/     # @devmentor/db   — MikroORM config, entities, migrations, seeders, DB helpers
└── ui/     # @devmentor/ui   — React components: shadcn/ui primitives, the backend panel layer, concept components
```

- Packages are named `@devmentor/<folder>`. Import them by package name, never by relative path across packages (`../../core/...` is forbidden).
- Each package has its own `package.json`, `tsconfig.json` (extending a shared base), and a public entry point (`src/index.ts` and/or `exports`). Import only from a package's public exports, not from its internals.
- Dependency direction (`app → core → db`, no cycles):
  - `app` → `core`, `ui`. It reaches the database only through core services, never by importing `db` or `@mikro-orm/*`.
  - `core` → `db`
  - `db` → no internal packages
  - `ui` → no internal packages (so the API envelope type is declared in both `core/src/http` and `ui/src/backend/api`)
- Only `db` imports `@mikro-orm/*`; it re-exports the types others need (`EntityManager`, `MikroORM`). `core` must not import Next.js or React.
- New code goes in the lowest package that fits. Persistence goes in `db`; business rules, ports and HTTP helpers in `core`; reusable components in `ui`; routes and pages in `app`.
- To add a new package, propose it first (it changes the architecture).
- Next.js transpiles workspace packages automatically, so `transpilePackages` is not needed for them. Internal packages ship TypeScript source; there is no build step.
- `eslint.config.mjs` enforces these boundaries (`no-restricted-imports`), and bans the global `fetch` in `app` and `ui` outside `apiCall`. Don't disable those rules; if one blocks you, the code is in the wrong package.

### Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`,
`availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) is a
same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/core/src/services/<concept>/<name>.service.ts`
- `packages/core/src/validators/<concept>/` (shared Zod schemas, when needed)
- `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx` under
  the relevant persona route group

Create a concept folder only when its first file is added — never scaffold empty
ones. This is a directory convention, not a module runtime: there is no per-concept
setup/ACL/auto-discovery. See `.ai/specs/engineering-standards.md` for the full
naming table and the payments-port/event-emitter patterns.

Event IDs follow `concept.entity.action` (e.g. `bookings.booking.created`) and are
emitted through the typed emitter in `packages/core/src/events`, registered on the
`Cradle` — this is in-process only; there is no queue/worker in this project.
(`core/src/events` doesn't exist yet; add it with the first feature that emits an event.)

### Reusable API & UI layer

Every route and every page reuses two shared layers instead of re-implementing
fetch/validation/auth/error-handling per feature:

- `packages/core/src/http/` (`@devmentor/core/http`) — `errors.ts` (typed `AppError`
  hierarchy), `apiHandler.ts` (wraps a route: catches `AppError`s, maps to status + JSON
  envelope `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`,
  logs unexpected failures), `parse.ts` (`parseBody`/`parseInput`: Zod-parsed input only,
  no mass assignment), `makeCrudRoute.ts` (schemas + service in, `{ GET, POST, PUT, DELETE }`
  out, for plain CRUD resources). `auth.ts` (`requireSession`, `requireRole`, ownership
  assertions) comes with the auth feature.
- `packages/ui/src/backend/` (`@devmentor/ui/backend/<category>`) — `api/apiCall.ts`
  (the only sanctioned `fetch()` call site), `forms/CrudForm.tsx`, `tables/DataTable.tsx`,
  `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`.

New reusable components have one designated home each — never scattered ad hoc:

1. Shadcn primitive → `ui/src/components/ui/` (via `npx shadcn@latest add`, never
   hand-written).
2. Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`.
3. Component tied to one concept's domain shape → `ui/src/components/<concept>/`,
   named after the same concept folder used in `db`/`core`.
4. Used by exactly one page → colocate next to that `page.tsx` until a second
   consumer appears.

See `.ai/specs/engineering-standards.md` for the full rationale and the DRY/SRP/
dependency-inversion reasoning behind this split. The reference example is
`GET /api/health` (`apiHandler` + `withScope`) and the `/admin` system-status table
(`apiCall` + `DataTable`).

## Database (MikroORM + PostgreSQL)

- Entities, the MikroORM config, repositories, and migrations live in `packages/db` only.
- **All schema changes go through migrations** created with the MikroORM migrator and committed to `packages/db`. Never use `schema:update` or `schema:fresh` against shared or production databases. Never edit a migration that has already been applied; write a new one.
- Always get the ORM through `getOrm()` from `@devmentor/db`. It returns the single per-process instance, cached on `globalThis` so dev hot reloads reuse the pool. Pool size comes from `DATABASE_POOL_MIN`/`DATABASE_POOL_MAX`.
- `src/config.ts` holds the runtime options shared by the app and the CLI. `src/mikro-orm.config.ts` is the CLI-only config (migrator, seeder); the app must not import it.
- List every entity explicitly in `packages/db/src/entities/index.ts` (no folder globs). When the first entity is added, remove `discovery.warnWhenNoEntities: false` from `config.ts`.
- Use a **forked `EntityManager` per request or unit of work** (`em.fork()` or `RequestContext`). Never use the global EntityManager in request handling.
- Run database code on the server only (Server Components, Route Handlers, Server Actions, scripts), never in client components. Routes and pages that touch the database are `export const dynamic = "force-dynamic"`; the app must build and boot with no database reachable. MikroORM must stay out of the bundle via `serverExternalPackages` in `packages/app/next.config.ts`. `@mikro-orm/core` and `pg` are excluded by Next by default, and `@mikro-orm/postgresql` is listed. Add any other `@mikro-orm/*` package that app code imports at runtime.
- Configuration comes from environment variables. App-level settings are parsed with Zod in `core/src/config/env.ts` (`getEnv()`); database settings are read by `db/src/config.ts`, because `db` can't import `core`. There is one `.env` at the repo root (template: `.env.example`), loaded by `next.config.ts` and by the CLI config. Never commit credentials. `.env*` is gitignored except `.env.example`.

## Dependency injection (Awilix)

- The **composition root is in `core`**: `packages/core/src/container/container.ts` (`createAppContainer`) registers every dependency by hand, and `cradle.ts` declares the `Cradle` type. No `loadModules` globbing: a new service is one explicit line in each file, so every binding is greppable.
- Services are classes (`<Name>Service` in `services/<concept>/<name>.service.ts`) registered with `asClass(...)`, or factories registered with `asFunction(...)`. They receive their dependencies through the constructor/factory argument. Don't import singletons directly and don't call `container.resolve` inside services. Resolve only at the edges (route handlers, server actions, server components) with `withScope(fn)` from `@devmentor/core/container`: it creates a scope, runs `fn` with the cradle, and disposes the scope.
- Lifetimes: infrastructure (ORM instance, env, logger) is a singleton (`asValue`). Anything that holds an `EntityManager` or request data is `scoped`.
- The container uses **`InjectionMode.PROXY`** with `strict: true`. Factories and constructors take the cradle as their single argument and destructure what they need (`({ em }) => …`). Strict mode rejects a singleton that depends on a scoped registration.
- `getContainer()` builds the container once per process (cached on `globalThis`). If the ORM can't start, it throws `ServiceUnavailableError` (503) and retries on the next request.
- External integrations (payments, notifications) are ports in `core` (`<name>.port.ts`) with adapters under `adapters/`; the container chooses the adapter.

## UI: frontend vs backend pages

- **Frontend pages** (public, user-facing, in the persona route groups) use plain Tailwind CSS utilities and shared components from `@devmentor/ui` that are built with Tailwind. They don't use shadcn/ui components.
- **Backend pages** (admin and management areas) use shadcn/ui components.
- The areas are separate route groups with **separate root layouts** (each renders its own `<html>`/`<body>` and imports its own CSS), so their styles can't leak into each other:
  - `src/app/(marketing)/` holds the public pages (landing, mentor search, mentor profiles). Its CSS is `(marketing)/globals.css`.
  - The other persona groups from the spec — `(auth)/`, `(student)/`, `(mentor)/` — are created with their first page, each with its own root layout.
  - `src/app/(backend)/admin/` holds the admin area, served under **`/admin`**. Its CSS is `@devmentor/ui/globals.css` (Tailwind + shadcn theme).
  - There is no top-level `app/layout.tsx`. Navigating between the two areas does a full page load, which is expected.
- shadcn/ui primitives are generated into `packages/ui/src/components/ui/` (its `components.json` lives in `packages/ui`) and imported as `@devmentor/ui/components/ui/<name>`. Don't duplicate them in `app`, and don't hand-write them.
- Tailwind v4 is configured CSS-first (no `tailwind.config.*`). Each area's CSS has `@source` directives that cover `packages/ui/src` and `packages/app/src`; keep them when moving files.
- Add shadcn components from `packages/ui`: `npx shadcn@latest add <component>`.
- Default to Server Components. Add `"use client"` only where interactivity requires it.

## Testing (Vitest)

- Tests sit next to the code as `*.test.ts(x)` in `src/`. Each package is a Vitest project (`packages/*/vitest.config.*`), aggregated by the root `vitest.config.mts`.
- Unit tests don't touch the database. Pass fakes through constructor/factory arguments, build the container with `createAppContainer(fakeOrm)`, or mock `@devmentor/core/container`'s `withScope` in route tests.
- `ui` tests run in jsdom with Testing Library (`@testing-library/react`, `user-event`); other packages run in Node. Tests set `LOG_LEVEL=silent`.
- New services come with tests. A bug fix comes with a test that fails without the fix.

## Commands

Run everything from the repo root:

| Command | What it does |
|---------|--------------|
| `npm run dev` / `build` / `start` | Next.js app (`@devmentor/app`) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` in every package |
| `npm test` | Vitest, all packages (`npm run test -w @devmentor/<pkg>` for one) |
| `npm audit` | Dependency vulnerability check (part of the validation gate) |
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
  - `npm audit` when dependencies change
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
