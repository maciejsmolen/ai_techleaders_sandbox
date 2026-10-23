# GitHub CI and 100% unit-test coverage

- **Date:** 2026-10-23
- **Goal:** CI on every pull request (build, lint, unit tests, integration tests with testcontainers PostgreSQL + agent-browser); an explicit AGENTS.md rule that every new feature is 100% unit-tested; backfill unit tests to 100% of the existing code.
- **Spec:** none (plan approved in-session)
- **PR:** https://github.com/maciejsmolen/ai_techleaders_sandbox/pull/4 (stacked on #3 → #2)
- **Status:** completed

## Plan

0. Commit/push the staged engineering-standards work (PR #3); CI work on `feat/ci`, stacked on it.
1. Coverage: `@vitest/coverage-v8`, 100% thresholds, `test:coverage`.
2. Backfill unit tests to 100%.
3. Integration tests in `packages/app/integration/`: testcontainers PostgreSQL, migrations, `next start`, agent-browser.
4. `.github/workflows/ci.yml`: lint, unit, build, integration jobs.
5. AGENTS.md (100% rule), README, lessons.
6. Verify locally, then on GitHub until all jobs are green.

## Actions taken

- Committed and pushed the staged engineering-standards work (`bcdaa9f`), opened PR #3; fixed its run log and lesson first (agent-browser does work in the sandbox).
- **Coverage:** root devDependency `@vitest/coverage-v8`; `vitest.config.mts` coverage over `packages/*/src/**/*.{ts,tsx}`, excluding tests and `packages/ui/src/components/ui/**` (shadcn-generated), thresholds `{ 100: true }`, reports in `coverage/`; root script `test:coverage`.
- **Backfilled unit tests** from 80% to 100% (45 new tests, 59 → 104):
  - db: `config.test.ts`, `orm.test.ts`, `health/db-ping.test.ts`, `mikro-orm.config.test.ts`;
  - core: `http/errors.test.ts`, plus a `withScope` dispose-on-throw test;
  - ui: `lib/utils.test.ts`, plus branch tests in `apiCall`, feedback, `DataTable`, `fields`, `CrudForm`;
  - app: page and layout tests and `system-status.test.tsx` (jsdom via `// @vitest-environment jsdom`).
  - Removed one dead branch (`value ?? ""` in `CrudForm`'s `FieldRow`) instead of testing it.
  - No `v8 ignore` comments.
- **Integration tests** (`packages/app/integration/`): `global-setup.ts` (testcontainers `postgres:18`, or `INTEGRATION_DATABASE_URL`; migrations via `npm run db:migration:up`; two `next start` servers, one healthy and one with an unreachable database), `app-server.ts`, `browser.ts` (agent-browser CLI wrapper), `app.int.test.ts` (5 tests); `vitest.integration.config.mts`; scripts `test:integration` (app and root). The app devDependencies `testcontainers`, `@testcontainers/postgresql`, `agent-browser`, `jsdom` and Testing Library were added.
- **CI:** `.github/workflows/ci.yml` with the jobs Lint & typecheck, Unit tests (100% coverage; artifact plus a summary on the run page), Build, and Integration tests (agent-browser `install --with-deps`, Chrome cache, `AGENT_BROWSER_ARGS=--no-sandbox`, artifacts on failure). Triggers: `pull_request`, push to `main`, `workflow_dispatch`.
- **Docs:** `AGENTS.md` Testing section reworked: a binding 100% coverage rule for every feature and change, no new exclusions or `v8 ignore` without approval, integration-test and CI rules, commands, the verify checklist, agent-browser for UI checks. `README.md` gets a "Testing and CI" section.

## Decisions & assumptions

- Vitest stays the unit-test framework (already in the stack); "incorporate" was implemented as the coverage gate plus CI.
- shadcn primitives are excluded from coverage as generated code; everything else counts.
- Integration tests run against the production build (`next start`), not `next dev`, so they test what ships.
- `INTEGRATION_DATABASE_URL` exists for machines without Docker (like this sandbox); CI always uses testcontainers.
- PRs are stacked (#4 → #3 → #2), so `pull_request` triggers on every base branch.

## Verification

- Locally: lint, typecheck pass; `npm test` 104/104; `npm run test:coverage` 100% statements (308/308), branches (185/185), functions (102/102), lines (281/281); `NODE_ENV=production npm run build` pass; `npm audit` 0 vulnerabilities.
- The coverage gate catches a regression: a temporary untested function made `test:coverage` exit 1 (lines 99.64%, functions 99.02%); after removing it, back to 100%.
- Integration locally (sandbox PostgreSQL scratch database via `INTEGRATION_DATABASE_URL`, agent-browser + Chrome): 5/5 pass, no `next start` left running. The first run found a Playwright-only selector; fixed.
- **GitHub Actions run 40010756419 on PR #4: all 4 jobs green on the first run.** The integration job used testcontainers (no `INTEGRATION_DATABASE_URL` in CI), 5/5 passed; the unit job showed 104 tests at 100% coverage.

## Open issues / follow-ups

- Branch protection: the first attempt failed (`403: Upgrade to GitHub Pro or make this repository public`); the user then made the repository public. **Enabled on `main` (2026-10-23):** the four CI checks are required (pinned to the GitHub Actions app, id 15368), `enforce_admins` on, force-pushes and deletion blocked; no required reviews, and "up to date before merging" off (stacked PRs). PR #2 was blocked until it contained the workflow, so the stack was merged top-down (#4 → #3 → #2).
- The first `feat/ci` commit accidentally included `integration/.artifacts/` (local logs and a screenshot, no credentials); a follow-up commit untracked them and fixed the ignore pattern. They remain in that commit's history.
- npm warns about unapproved install scripts (now also `agent-browser`, `cpu-features`, `ssh2`, `protobufjs`, from testcontainers); everything works without them. Review with `npm install-scripts ls`.

## Lessons

Added to [`.ai/lessons.md`](../lessons.md): `.gitignore` anchoring with a mid-pattern slash; agent-browser selectors vs Playwright. The engineering-standards lesson about in-browser checks was corrected (agent-browser works after `install --with-deps`).
