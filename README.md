# DevMentor

DevMentor is a web application built with Next.js, React, and TypeScript on top of PostgreSQL. It is organised as an npm-workspaces monorepo.

## Tech stack

| Concern | Technology |
|---------|------------|
| Framework | [Next.js](https://nextjs.org) (App Router), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org) |
| Database | [PostgreSQL](https://www.postgresql.org) |
| ORM | [MikroORM](https://mikro-orm.io): entities, migrations, connection pooling, unit of work |
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix) |
| Frontend styling | [Tailwind CSS](https://tailwindcss.com) |
| Backend (admin) UI | [shadcn/ui](https://ui.shadcn.com) |
| Testing | [Vitest](https://vitest.dev) |
| Monorepo | npm workspaces |

## Architecture

### Packages

```
packages/
├── app/    @devmentor/app   Next.js application: routes, pages, server actions, DI composition root
├── core/   @devmentor/core  Framework-agnostic building blocks: domain types, services, interfaces, utils
├── db/     @devmentor/db    MikroORM config, entities, repositories, migrations, seeders
└── ui/     @devmentor/ui    Reusable React components (shadcn/ui + shared Tailwind components)
```

Dependencies flow in one direction only:

```
          app
        /  |  \
       ui  |   db
        \  |  /
         core
```

Each line points downward: `app` → `ui`, `db`, `core`; `ui` → `core`; `db` → `core`.

- `core` depends on no other internal package and on no framework (no Next.js, React, or MikroORM).
- `db` builds on `core`. `ui` uses only types and utils from `core`.
- `app` puts everything together. It is the only package that knows about all the others.
- Packages import each other by name (`@devmentor/core`), never by relative path.

### Data layer

- PostgreSQL is accessed only through MikroORM, from `packages/db`.
- Schema changes are made **only through migrations**, which are committed to `packages/db`.
- A single MikroORM instance per process owns the connection pool. Each request or unit of work uses its own forked `EntityManager`.
- Database code runs only on the server: Server Components, Route Handlers, Server Actions, and scripts.
- Connection settings come from environment variables (e.g. `DATABASE_URL`).

### Dependency injection

An Awilix container is the backbone of the server side:

1. `core` declares service interfaces and their registration names.
2. `db` (and future infrastructure packages) provide the implementations, plus a function that registers them.
3. `app` is the **composition root**. It creates the container and registers the modules. Per request, it creates a scoped container.

Services get their dependencies injected. Only the edges resolve from the container: route handlers, server actions, and server components.

Lifetimes:
- Infrastructure (ORM, config, logging) is a singleton.
- Request-bound services (anything holding an `EntityManager`) are scoped.

The container runs in `PROXY` injection mode with `strict` lifetimes. `GET /api/health` is the reference slice: route → request scope → `HealthService` (core) → `DbPing` (db) → PostgreSQL. It returns `200 {"status":"ok","db":"ok"}`, or `503` when the database is unreachable.

### UI

- **Frontend pages** (public, user-facing) are styled with Tailwind CSS. They live in `src/app/(frontend)/`.
- **Backend pages** (admin and management) are built with shadcn/ui components. They live in `src/app/(backend)/admin/` and are served under `/admin`.
- Each area has its own root layout and stylesheet, so the shadcn theme never reaches the public pages.
- Reusable components, including the generated shadcn/ui components, live in `packages/ui`.

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
