<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# @devmentor/app

The Next.js application. Project-wide rules (architecture, `.ai/` workflow, working principles) live in the root [`AGENTS.md`](../../AGENTS.md) and apply here in full.

- Routes: `src/app/(marketing)/` holds the public pages (Tailwind only); further persona groups (`(auth)`, `(student)`, `(mentor)`) are added with their first page. `src/app/(backend)/admin/` holds the admin area (shadcn/ui from `@devmentor/ui`).
- The Awilix composition root is in `@devmentor/core/container`. Resolve services only through `withScope` in route handlers, server actions, and server components; wrap route handlers in `apiHandler` (or use `makeCrudRoute`) from `@devmentor/core/http`.
- The app never imports `@devmentor/db` or `@mikro-orm/*` directly, but `next.config.ts` → `serverExternalPackages` must still list every `@mikro-orm/*` package loaded at runtime through core (`@mikro-orm/core` is excluded by Next already).
- The `.env` lives at the repo root, not here; `next.config.ts` loads it.
