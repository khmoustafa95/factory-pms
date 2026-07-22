# Active context

## Current focus

**Security hardening** — signup role escalation fixed, inactive accounts blocked at auth + RLS. Next: merge seed PR, apply migrations to live Supabase.

## Recent changes

- [2026-07-22] Security: `handle_new_user` reads role from `app_metadata` only; `is_auth_active()` in RLS; frontend blocks inactive login; signup disabled locally
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
3. Create users and assign roles; walk through full workflow end-to-end
4. Optional: `npm run supabase:types` after local DB is up
5. Optional: Arabic UI copy pass

## Open questions

- Hosting target (Vercel vs Netlify)
- Validation message i18n — done via schema factories + `validation.*` locale keys
