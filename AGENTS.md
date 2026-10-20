<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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

- "Done" means verified. Before reporting completion, run the checks that apply:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build` for changes that affect routing, config, or the build
- For UI or behavior changes, run the app (`npm run dev`) and exercise the change.
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
