# Product context

## Why it exists

Factories and leadership rely on weekly/monthly reports. Problems surface late. This product turns project state into live KPIs, scoped by role, with fast comments and escalation.

## Roles

| Role             | Scope                    | Key jobs                                      |
| ---------------- | ------------------------ | --------------------------------------------- |
| Company Director | All factories / projects | Approve proposals, executive dashboard, notes |
| Factory Manager  | Own factory              | Propose projects, assign PMs, monitor         |
| Project Manager  | Assigned projects        | Phases/tasks, status updates, escalate        |

## Personas (from PRD)

- **Company Director** — needs one aggregated view; hates late paper reports
- **Factory Manager** — needs proposals + factory progress without WhatsApp/email chaos
- **Project Manager** — needs clear WBS, Kanban/Gantt, quick escalation when blocked

## Feature map (priority)

| ID    | Module                | Priority |
| ----- | --------------------- | -------- |
| FT-01 | Factories & accounts  | Must     |
| FT-02 | Project proposals     | Must     |
| FT-03 | Approval workflow     | Must     |
| FT-04 | Phases & tasks (WBS)  | Must     |
| FT-05 | Kanban / Gantt / bars | Should   |
| FT-06 | Comments / mentions   | Should   |
| FT-07 | Escalation / blocked  | Could    |

## Key user stories

- **US-01** — Director sees all factories + auto progress
- **US-02** — Factory Manager submits proposal → `proposed`
- **US-03** — Director approve/reject with reason
- **US-04** — PM phases with weights summing to 100%
- **US-05** — Tasks with statuses; blocked requires reason; Realtime
- **US-06** — Comments on phase/task with author + role + time

## UX direction (planned)

- Director: global KPIs, factory grid, bottlenecks radar
- Factory Manager: factory summary, proposal form, PM oversight
- Project Manager: Kanban/Gantt, phase progress, activity feed

Product copy may be Arabic and/or English; Memory Bank stays English for agents.
