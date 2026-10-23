# GitHub CI and 100% unit-test coverage

- **Date:** 2026-10-23
- **Goal:** CI on every pull request (build, lint, unit tests, integration tests with testcontainers PostgreSQL + agent-browser); an explicit AGENTS.md rule that every new feature is 100% unit-tested; backfill unit tests to 100% of the existing code.
- **Spec:** none (plan approved in-session)
- **Status:** in-progress

## Plan

0. Commit/push the staged engineering-standards work (PR #3); CI work on `feat/ci`, stacked on it.
1. Coverage: `@vitest/coverage-v8`, 100% thresholds, `test:coverage`.
2. Backfill unit tests to 100%.
3. Integration tests in `packages/app/integration/`: testcontainers PostgreSQL, migrations, `next start`, agent-browser.
4. `.github/workflows/ci.yml`: lint, unit, build, integration jobs.
5. AGENTS.md (100% rule), README, lessons.
6. Verify locally, then on GitHub until all jobs are green.

## Actions taken
## Decisions & assumptions
## Verification
## Open issues / follow-ups
## Lessons
