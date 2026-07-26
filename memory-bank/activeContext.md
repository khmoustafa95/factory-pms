# Active context

## Current focus

**Local login end-to-end fixed** — Auth password login worked, but profile fetch failed with `42501` until API roles got table grants. Retry `director@demo.local` / `Demo123!`.

## Recent changes

- [2026-07-26] Added `20260726100000_grant_api_privileges.sql` — `authenticated`/`anon` lacked SELECT/INSERT/UPDATE/DELETE on public tables (only Dxtm), so post-login `profiles` read failed with generic "Unable to sign in"
- [2026-07-26] Fixed login: `[auth.email] enable_signup` must be `true` (misleading name — false also blocks password login); global `[auth] enable_signup = false` still blocks new signups
- [2026-07-23] Fixed DB bootstrap: helpers after tables in `20260722100000_initial_schema.sql`; seed uses `app_metadata` (no `ALTER auth.users` triggers); synced `.env.development` anon JWT
- [2026-07-22] Phase 3 refactor: `fetchPaginatedList`, `useFormDialog` (all form dialogs), `types/joins.ts` with select constants + `joinMappers`
- [2026-07-22] Performance: DB trigger for `progress_percent`; RPCs `get_dashboard_stats()` + `get_project_activity()`; removed client `syncProjectProgress`
- [2026-07-22] Security: `handle_new_user` reads role from `app_metadata` only; `is_auth_active()` in RLS; frontend blocks inactive login; signup disabled locally
- [2026-07-22] Comprehensive `supabase/seed.sql`: all statuses, roles, blocked tasks, comments; demo accounts (`Demo123!`)
- [2026-07-22] i18n infrastructure: `LocaleContext`, `src/i18n/locales/{en,ar}.ts`, RTL + Noto Sans Arabic, `ThemeToggle` / `LocaleToggle`, responsive `AppLayout` mobile drawer
- [2026-07-22] Responsive list pages: `AdaptiveList` on Factories, Accounts, Escalations, Projects — mobile card view + desktop table via `ResponsiveTable` wrapper inside `AdaptiveList`
- [2026-07-22] i18n: form dialogs (project, reject, factory, account, phase, task) use `useTranslation` + semantic theme colors
- [2026-07-22] Env scripts: `.env.development` / `.env.staging` / `.env.production`, npm scripts per stage, `supabase init` + local CLI helpers
- [2026-07-22] FT-05: Kanban board, timeline/Gantt-style view, progress overview, dashboard KPIs
- [2026-07-22] FT-06: Comments on project/phase/task + activity feed with realtime invalidation
- [2026-07-22] FT-07: Escalations page for blocked tasks with leadership notification via comments
- [2026-07-22] FT-04: Project WBS page — phases with 100% weight validation, tasks with statuses and blocked reason
- [2026-07-22] FT-03: Directors approve/reject `proposed` projects; rejection requires reason shown to factory managers
- [2026-07-22] FT-02: Projects page — factory managers create/edit drafts, submit proposals (`proposed`)

## Next steps (concrete)

1. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
2. Apply migrations to live Supabase project + verify RLS
3. Optional: Arabic UI copy pass

## Open questions

- Hosting target (Vercel vs Netlify)
- Validation message i18n — done via schema factories + `validation.*` locale keys
