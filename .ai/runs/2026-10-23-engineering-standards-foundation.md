# Engineering standards: foundation phase

- **Date:** 2026-10-23
- **Goal:** Implement `.ai/specs/engineering-standards.md`, foundation only: dependency direction `app → core → db`, DI container in core, the shared server layer (`core/src/http`), the client layer (`ui/src/backend`), `/api/health` as the reference example, docs.
- **Spec:** [engineering-standards](../specs/engineering-standards.md)
- **Status:** completed

## Plan

User decisions: the spec wins over AGENTS.md on conflicts; foundation scope only; approved deps `zod`, `pino`, and ui devDeps `jsdom`, `@testing-library/react`, `@testing-library/user-event`.

1. Reverse core/db; move the container into `core/src/container` (explicit registrations, `withScope`).
2. `core/src/http`: errors, `apiHandler`, `parseBody`, `makeCrudRoute`; `config/env.ts`, `logger.ts`.
3. `ui/src/backend`: `apiCall`, feedback, `DataTable`, `CrudForm`; shadcn primitives into `components/ui/`.
4. App: `(frontend)` → `(marketing)`; `/api/health` on `apiHandler`; `/admin` system-status table via `apiCall` + `DataTable`.
5. ESLint boundaries for the new direction; docs (AGENTS.md, README, spec implementation notes).
6. Verify: lint, typecheck, tests, build (also without a DB), running app, `npm audit`.

## Actions taken

- Branch `feat/engineering-standards`, stacked on `feat/landing-page` (PR #2, still open; it changes the files that moved to `(marketing)`).
- **db:** `DbPing` interface moved into `db/src/health/db-ping.ts`; `di.ts` (`registerDb`) deleted; `index.ts` re-exports the `EntityManager`/`MikroORM` types; dependencies on `@devmentor/core` and `awilix` dropped.
- **core:** depends on `@devmentor/db`, `zod`, `pino`. Added `container/{container,cradle,index}.ts` (explicit registrations, `getContainer`, `withScope`), `http/{errors,apiHandler,parse,makeCrudRoute,index}.ts`, `config/env.ts`, `logger.ts`, `services/health/health.service.ts` (class). Removed `di.ts` and `health/health-service.ts`. Exports `.`, `./container`, `./http`.
- **ui:** `backend/{api,feedback,forms,tables}` with per-category exports; `Button` moved to `components/ui/`; `table`, `input`, `label`, `checkbox`, `native-select` added with `npx shadcn@latest add`; `components.json` `ui` alias updated. Added `zod`, `lucide-react` (required by the generated components), and devDeps `jsdom`, `@testing-library/react`, `@testing-library/user-event`; Vitest runs ui in jsdom (`test/setup.ts` for cleanup).
- **app:** `(frontend)` → `(marketing)`; `src/server/container.ts` and its test removed (test moved to core); `api/health/route.ts` rewritten on `apiHandler` + `withScope` with a route test; `/admin` renders `system-status.tsx` (`apiCall` + `DataTable`). Dropped the `@devmentor/db`, `awilix` and `server-only` dependencies and the `server-only` test alias.
- **ESLint:** boundaries rewritten for `app → core → db`, `ui` standalone; `no-restricted-globals: fetch` in `app`/`ui` except `apiCall.ts`.
- **Docs:** `AGENTS.md` (stack, layout, direction, Section 3 of the spec, DB, DI, UI, testing, `npm audit`), `packages/app/AGENTS.md`, `README.md` (architecture), `.env.example` (`LOG_LEVEL`), spec "Implementation notes (2026-10-23)".

## Decisions & assumptions

- User decisions (2026-10-23): the spec wins over the old `AGENTS.md`; foundation scope only; new deps approved as listed. `lucide-react` was added without a separate question because the shadcn components the stack generates require it.
- No `users`/`mentors` code or `docs/product-scope.md` exists, so the spec's migration steps 1, 3 and 8 had nothing to act on; `/api/health` + the `/admin` status table are the reference example. All deviations are listed in the spec's implementation notes.
- `/api/health` now returns the envelope (`{ ok, data }` / `{ ok: false, error }`); the status codes (200/503) are unchanged.
- Auth, events, validators, persona groups other than `(marketing)`, and domain concepts are left for their features (the spec says not to add them speculatively).

## Verification

- `npm run lint`: pass. Boundary rules checked with throwaway files: `app → @devmentor/db` / `@mikro-orm/core`, `core → @devmentor/ui` / `@mikro-orm/core` / `react`, `db → @devmentor/core`, `ui → @devmentor/core`, and a raw `fetch` in ui all fail (8 errors), then the files were removed.
- `npm run typecheck`: pass (after `next typegen` refreshed stale route types).
- `npm test`: 13 files, 59 tests pass (core 29, ui 28, app 2).
- `NODE_ENV=production npm run build`: pass; `@mikro-orm/postgresql` and `pino` load as externals. Also builds with an unreachable `DATABASE_URL`.
- `npm audit`: 0 vulnerabilities.
- Dev preview (:3000, cache cleared after the route-group rename): `/` 200 (landing page unchanged), `/admin` 200 (dashboard + "System status", loading state server-rendered), `/api/health` 200 `{"ok":true,"data":{"status":"ok","db":"ok"}}`.
- `next start` with an unreachable DB (:3101): `/` and `/admin` 200, `/api/health` 503 `service_unavailable`; one error log line, no connection string in it.
- Bugs found and fixed during verification: error class names were empty in the minified build (now explicit, confirmed in the production log); `getContainer()` reported any build failure as a database outage (regression test fails on the old code, passes now).
- In a real browser (agent-browser + Chrome, added afterwards; jsdom can't run Next's client bundle): `/admin` renders the System status table with "Database: OK".

## Open issues / follow-ups

- Merge PR #2 first; then retarget this PR to `main`.
- pino's `err.type` in production logs is still `""` (pino reads the minified constructor name); `name` and `code` carry the information.
- Next steps per the spec: auth (`auth.ts`, CSRF check, bcrypt/JWT/cookies, rate limiting), then the first concept with `validators/` (needs a client-safe `@devmentor/core/validators/*` export), events when a feature emits one.

## Lessons

Added to [`.ai/lessons.md`](../lessons.md): explicit error names (minification), `next typegen` after route-group renames, in-browser checks with agent-browser.
