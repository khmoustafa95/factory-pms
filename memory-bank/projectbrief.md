# Project brief

## Name

**Projects System Management** (Enterprise PMS) — repo: `factory-pms`.

## Goal

Give company leadership real-time visibility into factory projects (progress, budget, timeline, blockers) instead of delayed manual reports.

## Hierarchy

`Company` → `Factories` → `Projects` (proposal / budget / timeline) → `Phases` (weights) → `Tasks` → `Comments / activity`

## Scope (in)

- Web SPA for three roles: Company Director, Factory Manager, Project Manager
- Supabase Auth, Postgres, RLS, Realtime
- Proposal → approval → planning → execution → escalation workflows
- Role-scoped dashboards and comments on project / phase / task

## Scope (out / later)

- Mobile-native apps (Flutter was considered; not in current SPA path)
- Public SEO / marketing site (internal app behind auth)
- Custom Node backend (Supabase BaaS is intentional)

## Constraints

- Frontend: publishable Supabase key only — never service-role
- RLS on all domain tables; no RLS bypass from the SPA
- Focused changes; no drive-by refactors or unsolicited docs outside `memory-bank/`
- Prefer existing scripts: `typecheck`, `lint`, `format`, `build`
