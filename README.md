# DevMentor

DevMentor is a web application built with Next.js, React, and TypeScript on top of PostgreSQL. It is organised as an npm-workspaces monorepo.

## Tech stack

| Concern | Technology |
|---------|------------|
| Framework | [Next.js](https://nextjs.org) (App Router), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org) |
| Database | [PostgreSQL](https://www.postgresql.org) |
| ORM | [MikroORM](https://mikro-orm.io): entities, migrations, connection pooling, unit of work |
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix) |
| Validation | [Zod](https://zod.dev) |
| Logging | [pino](https://getpino.io) |
| Frontend styling | [Tailwind CSS](https://tailwindcss.com) |
| Backend (admin) UI | [shadcn/ui](https://ui.shadcn.com) |
| Testing | [Vitest](https://vitest.dev) |
| Monorepo | npm workspaces |

## Architecture

The binding rules are in [`AGENTS.md`](AGENTS.md); the engineering standards (naming, principles, security minimums, review checklist) are in [`.ai/specs/engineering-standards.md`](.ai/specs/engineering-standards.md).

### Packages

```
packages/
├── app/    @devmentor/app   Next.js application: routes and pages
├── core/   @devmentor/core  Services, ports, the DI container, the HTTP layer, env config, logger
├── db/     @devmentor/db    MikroORM config, entities, migrations, seeders
└── ui/     @devmentor/ui    shadcn/ui primitives, the backend panel layer, concept components
```

Dependencies flow in one direction only:

```
   app ──► core ──► db
    │
    └────► ui
```

- `app` uses `core` (services, `withScope`, `apiHandler`) and `ui` (components). It never imports `db` or MikroORM: the database is reached only through core services.
- `core` uses `db` and no framework (no Next.js or React). Only `db` imports MikroORM; it re-exports the types `core` needs.
- `db` and `ui` depend on no other internal package. Because `ui` can't import `core`, the API envelope type is declared on both sides.
- Packages import each other by name (`@devmentor/core/http`), never by relative path. ESLint enforces all of this.

Domain code is organized by **concept folders** repeated across the layers (`entities/bookings/`, `services/bookings/`, `validators/bookings/`, `api/bookings/`), created when the concept's first file is added. There is no module runtime.

### Data layer

- PostgreSQL is accessed only through MikroORM, from `packages/db`.
- Schema changes are made **only through migrations**, which are committed to `packages/db`.
- A single MikroORM instance per process owns the connection pool. Each request or unit of work uses its own forked `EntityManager`.
- Database code runs only on the server: Server Components, Route Handlers, Server Actions, and scripts. The app builds and boots with no database reachable.
- Connection settings come from environment variables (e.g. `DATABASE_URL`).

### Dependency injection

An Awilix container is the backbone of the server side. Its **composition root is in `core`** (`packages/core/src/container/`): `container.ts` registers every dependency by hand and `cradle.ts` declares the `Cradle` type.

- Services get their dependencies through their constructor. Only the edges resolve from the container, with `withScope(fn)`: route handlers, server actions, and server components.
- Infrastructure (ORM, env, logger) is a singleton. Request-bound services (anything holding an `EntityManager`) are scoped; `withScope` creates and disposes one scope per call.
- The container runs in `PROXY` injection mode with `strict` lifetimes. If the database can't be reached when it is built, requests get a 503 and the next one retries.

### HTTP layer and API envelope

Route handlers are thin: validation → auth → service call → envelope. They are built with the helpers in `@devmentor/core/http`, never with a hand-written `try/catch`:

- `apiHandler(fn)` turns the return value into `{ "ok": true, "data": … }`, and a thrown `AppError` (`NotFoundError`, `ValidationError`, …) into its status and `{ "ok": false, "error": { "code", "message", "fieldErrors"? } }`. Unexpected errors are logged (pino, with credential redaction) and returned as a 500 without details.
- `parseBody(request, schema)` returns only the Zod-parsed input, so clients can't mass-assign fields.
- `makeCrudRoute({ service, createSchema, updateSchema })` returns `{ GET, POST, PUT, DELETE }` for plain CRUD resources.

`GET /api/health` is the reference slice: route → `apiHandler` → `withScope` → `HealthService` (core) → `DbPing` (db) → PostgreSQL. It returns `200 {"ok":true,"data":{"status":"ok","db":"ok"}}`, or `503 {"ok":false,"error":{"code":"service_unavailable",…}}` when the database is unreachable.

### UI

- **Frontend pages** (public, user-facing) are styled with plain Tailwind CSS. They live in persona route groups: `src/app/(marketing)/` today, with `(auth)`, `(student)` and `(mentor)` added with their first pages.
- **Backend pages** (admin and management) are built with shadcn/ui components. They live in `src/app/(backend)/admin/` and are served under `/admin`.
- Each area has its own root layout and stylesheet, so the shadcn theme never reaches the public pages.
- `packages/ui` holds the shadcn primitives (`components/ui/`) and the backend panel layer (`backend/`): `apiCall` (the only way the client calls `/api/*`), `CrudForm` (schema-driven forms), `DataTable` (lists with loading, empty and error states), and the feedback components. The `/admin` system-status table is the reference example.

## Getting started

Requirements: Node.js ≥ 22.17 (MikroORM 7), npm, and Docker (for the local database) or any PostgreSQL instance.

```bash
npm install
cp .env.example .env          # adjust DATABASE_URL if you don't use docker compose
docker compose up -d          # PostgreSQL 18
npm run db:migration:up
npm run dev
```

Then open:
- [http://localhost:3000](http://localhost:3000) for the public site;
- [/admin](http://localhost:3000/admin) for the admin area;
- [/api/health](http://localhost:3000/api/health) for the health check.

### Common commands

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint in every package, including the package-boundary rules |
| `npm run typecheck` | TypeScript in every package |
| `npm test` | Vitest across all packages |
| `npm run build` | Production build of the app |
| `npm run db:migration:create -- --name <name>` | New migration (from entity changes) |
| `npm run db:migration:up` / `db:migration:down` | Apply / revert migrations |
| `npm run db:seed` | Seed the database |

> If your shell exports `NODE_ENV=development`, run the build as `NODE_ENV=production npm run build`; `next build` fails otherwise.

## AI-assisted development

Coding agents follow `AGENTS.md`, which `CLAUDE.md` imports. It contains:
- the binding architecture rules;
- the working principles: plan first, verify, record lessons;
- the `.ai/` workflow: specs in `.ai/specs/`, run logs in `.ai/runs/`, and lessons learned in `.ai/lessons.md`.
