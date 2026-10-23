# Lessons Learned

Long-term memory for AI agents working in this repository. Read this file **before starting any task**; append to it **after fixing a bug, finishing a run, or discovering anything non-obvious**.

## How this works

- This file is the **index**: one line per lesson, newest first.
- Lessons that need more than a few lines live in `.ai/lessons/YYYY-MM-DD-slug.md`, and the index links to them.
- Do not duplicate what the code, git history, or `AGENTS.md` already say. Record what was *non-obvious*.
- If a lesson turns out wrong or outdated, fix or delete it — don't leave it contradicting reality.

## Index entry format

```
- YYYY-MM-DD — **Short title** — one-sentence takeaway. ([details](lessons/YYYY-MM-DD-slug.md))
```

The `details` link is optional for short lessons.

## Detail file format (`.ai/lessons/YYYY-MM-DD-slug.md`)

```markdown
# <Title>

- **Date:** YYYY-MM-DD
- **Context:** what was being done (link the spec/run if any)
- **Problem / finding:** what went wrong or was discovered
- **Root cause:** why
- **Lesson:** what to do (or avoid) next time
```

## Lessons

<!-- Add new entries below this line, newest first. -->

- 2026-10-23 — **Every CI job needs `timeout-minutes`, and network installs need retries** — an apt mirror download in `agent-browser install --with-deps` stalled for 10+ minutes on a push to `main`, and without a timeout GitHub would have waited 6 hours. The workflow now sets apt `Acquire::Retries`/`Acquire::http::Timeout`, retries the install up to 3× with `timeout 5m`, and caps every job. Keep this for any new step that downloads things.
- 2026-10-23 — **A `.gitignore` pattern with a slash in the middle is anchored to the `.gitignore`'s folder** — `integration/.artifacts/` in the root file never matched `packages/app/integration/.artifacts`, and the artifacts got committed. Prefix with `**/` for nested paths, and check with `git check-ignore -v <path>` before committing.
- 2026-10-23 — **agent-browser selectors aren't Playwright's** — `button:has-text('…')` fails with "Element not found". Use CSS, or `find role <role> click --name "<name>"` (`Browser.clickRole` in the integration helper).
- 2026-10-23 — **Never rely on class names at runtime** — the production build minifies them, so `new.target.name`/`constructor.name` become `""` (errors showed `name: ""` in pino logs). Set `name` explicitly on each error class; identify errors by `instanceof` or a `code` field.
- 2026-10-23 — **After renaming or moving a route group, run `npx next typegen` in `packages/app`** — `tsc` otherwise fails on stale `.next/types/validator.ts` entries pointing at the old paths.
- 2026-10-23 — **In-browser checks: use agent-browser, not jsdom** — jsdom crashes evaluating Next's client bundle. `agent-browser install --with-deps` installs Chrome and its system libraries via apt (works in the sandbox); then `agent-browser open <url>`, `wait --text`, `snapshot -c`. Without `--with-deps` Chrome fails with `libnspr4.so: cannot open shared object file`.
- 2026-10-20 — **Sandbox: a preview `next dev` always runs, and only one is allowed** — pm2 process `workspace-preview` runs the root `npm run dev` on port 3000. Next 16 refuses a second dev server for the same project dir, so test against port 3000, or use `next start` on another port. After reinstalling `node_modules` (`npm ci`) it serves 500s (e.g. `Cannot find module '@vercel/turbopack/postcss'`) from the stale dev cache; a restart alone doesn't fix it. Run `pm2 stop workspace-preview && rm -rf packages/app/.next/dev && pm2 start workspace-preview`. Stop your own servers by PID: `pkill -f "<pattern>"` also matches, and kills, the shell running it.
- 2026-10-20 — **Sandbox: a PostgreSQL 17 is already running** — `DATABASE_URL` (database `open-mercato`) is exported, and pm2 manages the server. Don't stop it. For scratch work, create and drop a separate database. To test the database being down, run a throwaway cluster: `/usr/lib/postgresql/17/bin/initdb` + `pg_ctl` on another port.
- 2026-10-20 — **Sandbox: `mv`/`git mv` of a directory fails with `Invalid cross-device link`** — the overlay filesystem can't rename directories from the lower layer. Use `cp -a` + `rm -rf`; git still detects the renames.
- 2026-10-20 — **`next build` fails if `NODE_ENV=development` is set in the shell** — the sandbox exports it globally, which makes the `/_global-error` prerender crash with `Cannot read properties of null (reading 'useContext')`. It isn't a code bug: run `NODE_ENV=production npm run build` (or unset it). Check `echo $NODE_ENV` before chasing React duplicates.
- 2026-10-20 — **MikroORM 7 + Next.js: externalize only the driver** — v7 dropped knex for `@mikro-orm/sql` + kysely, and Next's built-in `serverExternalPackages` list covers only `@mikro-orm/core`, `@mikro-orm/knex` and `pg`. Listing `@mikro-orm/postgresql` is enough, because `sql` and `kysely` are reached only through it. Verify in the build output: the server chunk should load it as an external, not inline it. ([details](lessons/2026-10-20-mikro-orm-7-setup.md))
- 2026-10-20 — **`next dev` owns the agent-rules block in the Next project dir** — `writeAgentFiles(dir)` targets `packages/app`, not the repo root, and only runs when it detects an agent. The block text changes between Next versions (16.4 changed its heading level), so don't copy it by hand. Regenerate it with `node -e 'require("./node_modules/next/dist/server/lib/generate-agent-files.js").writeAgentFiles("packages/app")'`.
