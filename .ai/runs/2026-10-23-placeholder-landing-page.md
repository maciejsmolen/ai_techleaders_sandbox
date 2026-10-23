# Placeholder landing page

- **Date:** 2026-10-23
- **Goal:** Replace the Next.js starter page at `/` with a placeholder/sample DevMentor landing page.
- **Spec:** none (small UI change)
- **PR:** https://github.com/maciejsmolen/ai_techleaders_sandbox/pull/2
- **Status:** completed

## Plan

- Rewrite `(frontend)/page.tsx` as a Tailwind-only Server Component (header, hero, feature cards, footer).
- Switch `(frontend)/globals.css` to the full `@import "tailwindcss";` (with preflight) and drop the starter styles.
- Delete starter leftovers: `backdrop.tsx`, `page.module.css`, `public/*.svg`; set DevMentor metadata.
- Update the AGENTS.md preflight note.
- Verify: lint, typecheck, tests, build, and the running app.

## Actions taken

- `packages/app/src/app/(frontend)/page.tsx`: new placeholder landing page (header with Features / Admin links, "Coming soon" hero with two CTAs, three feature cards, footer). Server Component, plain Tailwind.
- `(frontend)/layout.tsx`: DevMentor title/description; dropped the inline Sandboxes icon so the app's `favicon.ico` is used; body gets the dark base classes.
- `(frontend)/globals.css`: full `@import "tailwindcss";` (preflight on), `@source` for `packages/app/src` and `packages/ui/src`; all starter CSS removed.
- Deleted `backdrop.tsx`, the unused `page.module.css`, and the unused starter SVGs in `packages/app/public/`.
- `AGENTS.md`: removed the "preflight off while the starter page exists" rule.

## Decisions & assumptions

- Copy is sample text, based on the product name (developer mentoring); CTAs point at `#features` because nothing real exists yet. Only the Admin link goes somewhere real.
- Page-specific sections stay in `app`; nothing here is reusable enough for `@devmentor/ui` yet.
- No unit test: the page is static markup with no logic; it was checked against the running app instead.

## Verification

- `npm run lint`, `npm run typecheck`: pass. `npm test`: 4/4 pass.
- `NODE_ENV=production npm run build`: pass; `/` is still prerendered static.
- Dev preview (port 3000): `/` 200 with title "DevMentor" and the new content; its CSS contains preflight and the page's utilities (`bg-emerald-400`, `grid-cols-3`, `text-balance`, …). `/admin` 200 still renders with its own layout; `/api/health` 200.
- Not checked visually: no headless browser in the sandbox, so layout was verified via HTML and generated CSS only.

## Open issues / follow-ups

- Replace the sample copy and CTAs with real content once the first product feature is specified.

## Lessons

none
