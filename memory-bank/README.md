# Memory Bank

Persistent project context for Cursor agents across sessions.

## Workflow

1. **Session start** — Read `activeContext.md` + `progress.md` (and architecture/product files when relevant).
2. **Do the work** — Follow `.cursor/rules/` and `AGENTS.md` for coding standards.
3. **Session end** — Update `activeContext.md` and `progress.md`; update other files only when their domain changed.

## Source of truth

| Concern              | Source                               |
| -------------------- | ------------------------------------ |
| Product / PRD        | Notion: _Projects Management system_ |
| Implementation state | This folder                          |
| Coding conventions   | `.cursor/rules/`, `AGENTS.md`        |

| File                | Role                           |
| ------------------- | ------------------------------ |
| `projectbrief.md`   | Scope, goals, constraints      |
| `productContext.md` | Users, UX, product rationale   |
| `systemPatterns.md` | Architecture and code patterns |
| `techContext.md`    | Stack and environment          |
| `activeContext.md`  | Now / next                     |
| `progress.md`       | Done / backlog / changelog     |
| `decisionLog.md`    | Append-only decisions          |
| `lessonsLearned.md` | Append-only lessons            |

Append changelog/decision/lesson entries — do not wipe history. Say **UMB** or **Update Memory Bank** for a full session sync.

Do not duplicate coding rules here — link or reference them.
