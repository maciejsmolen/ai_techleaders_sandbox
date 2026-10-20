@AGENTS.md

# Claude Code notes

The project conventions in `AGENTS.md` — especially the **Project AI workflow (`.ai/`)** section — are mandatory for Claude Code. In short:

- Read `.ai/lessons.md` before starting work; record new lessons there (details in `.ai/lessons/`) after fixing bugs or learning something non-obvious.
- Specs live in `.ai/specs/` (`implemented/` when done, `archive/` when dropped), named `YYYY-MM-DD-slug.md`.
- Every autonomous run writes a log to `.ai/runs/YYYY-MM-DD-slug.md`.
- For complex tasks, use plan mode to get sign-off before implementing (see **Working principles** in `AGENTS.md`).
- Long-term learnings go in `.ai/lessons.md`, not in Claude's private memory, so that all agents and teammates share them.
