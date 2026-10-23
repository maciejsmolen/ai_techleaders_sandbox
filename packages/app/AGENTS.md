<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# @devmentor/app

The Next.js application. Project-wide rules (architecture, `.ai/` workflow, working principles) live in the root [`AGENTS.md`](../../AGENTS.md) and apply here in full.

- Routes: `src/app/(frontend)/` holds the public pages (Tailwind only). `src/app/(backend)/admin/` holds the admin area (shadcn/ui from `@devmentor/ui`).
- The Awilix composition root is `src/server/container.ts`. Resolve services only through `withRequestScope` in route handlers, server actions, and server components.
- `next.config.ts` → `serverExternalPackages` must list every `@mikro-orm/*` package imported at runtime (`@mikro-orm/core` is excluded by Next already).
- The `.env` lives at the repo root, not here; `next.config.ts` loads it.
