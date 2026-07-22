# Active context

## Current focus

**Merged security + query UX** — auth hardening and QueryState/Error Boundary on one branch. Next: apply migrations to live Supabase, E2E tests.

## Recent changes

- [2026-07-22] QueryState component: unified loading skeletons, localized errors, retry; AppErrorBoundary; refactored list pages, dashboard, project detail, comments, activity tab
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

1. `npm run supabase:start` + `npm run dev:local` for local stack (requires Docker)
2. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
3. Apply migrations to live Supabase project + verify RLS
4. Optional: Arabic UI copy pass

## Open questions

- Hosting target (Vercel vs Netlify)
- Validation message i18n — done via schema factories + `validation.*` locale keys
