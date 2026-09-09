# Product context

## Why it exists

Factories and leadership rely on weekly/monthly reports. Problems surface late. This product turns project state into live KPIs, scoped by role, with fast comments and escalation.

## Roles

| Role | Scope | Key jobs |
| ---- | ----- | -------- |
| Company Director + control | All factories / projects | Discuss & approve, funding, accounts, factories, settings |
| Company Director, statistics only (`can_control = false`) | All factories / projects | Dashboard, lists, detail (read-only); own name in settings |
| Factory Manager + control | Own factory | Propose, design phases **and** tasks, Kanban, ops finance, start/pause |
| Factory Manager, statistics only | Own factory | Dashboard, lists, detail (read-only); own name in settings |

There is no project-manager role in the app. Postgres still has enum value `project_manager` for history.

## Personas (from PRD)

- **Company Director** — needs one aggregated view; hates late paper reports
- **Factory Manager** — needs proposals + factory progress without WhatsApp/email chaos (also executes WBS after approval)

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
- **US-02** — Factory Manager submits proposal (+ supporting files) → consultation then proposed; no assigned PM
- **US-03** — Company Director discusses with Factory Manager via comments, then approve/reject with reason
- **US-04** — Factory Manager phases with weights summing to 100%
- **US-05** — Tasks with statuses; blocked requires reason; Realtime
- **US-06** — Comments on phase/task with author + role + time

## UX direction (planned)

- Director (control): global KPIs, approvals, org admin; director (viewer): same dashboards read-only
- Factory Manager (control): factory summary, proposal form, phases/tasks/Kanban; factory viewer: statistics only

Product copy may be Arabic and/or English; Memory Bank stays English for agents.
