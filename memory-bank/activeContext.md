# Active context

## Current focus

**TaskFlow ports (wave 1 + high-value wave 2) complete** — debounce, virtualized dashboard table, dropzone + file-type icons, command palette, Excel-compatible CSV export, lazy date picker. Excel import wizard, custom fields, and Mina Scheduler calendar were left out on purpose.

## Recent changes

- [2026-08-24] Browser follow-up: palette unmounts on close (no stuck overlay); dialogs keep `onFocusOutside` from dismissing when `dismissOnOutsideClick` is false so DatePicker works inside New proposal; FM login verified calendar (15 Aug 2026) + dropzone/`budget.xlsx`
- [2026-08-24] Ported TaskFlow ideas into factory-pms patterns (not a package clone): `useDebouncedValue`; virtualized dashboard explore table; `FileDropzone`/`FileTypeIcon`; `Ctrl+K` command palette; CSV spreadsheet export on dashboard + projects; lazy `DatePicker` on project/phase/task forms
- [2026-08-17] Applied `20260816120000_dashboard_insight_rpcs.sql` locally (`get_dashboard_insights` / `get_dashboard_projects` confirmed in pg_proc). Local history had leftover `20260805160000` / `20260805170000` (discarded WIP, not in repo) — marked reverted so push could proceed.
- [2026-08-16] Scorecard Phase 1: GitHub Actions CI (`.github/workflows/ci.yml`); `check:i18n` + `locale-parity.test.ts` wired into `verify`; migration `20260816120000_dashboard_insight_rpcs.sql`; `useDashboard` hooks call RPCs; dashboard split into `DashboardAttentionSection` + `DashboardProjectsPanel`
- [2026-08-05] TS 6 tsconfig: removed deprecated `baseUrl` + `ignoreDeprecations: "6.0"` from `tsconfig.app.json` / root `tsconfig.json` (paths already relative; fixes IDE TS5103 when language service is still on 5.x)
- [2026-08-05] Comment @mentions: `comment_mentions` table, `list_mentionable_profiles`, `create_comment(..., mentioned_ids)`, UI `@` autocomplete + highlighted tokens, `comment_mention` notification type
- [2026-08-05] In-app notifications: `notifications` table + RLS; server-side events from `transition_project_status`, task-blocked trigger, comment-insert trigger; bell + sheet in `AppLayout`; ar/en copy; Realtime invalidate
- [2026-08-05] Dashboard redesign: attention-first KPIs (blocked/overdue/proposed/deadlines/phase issues); removed factory count + quick-link cards; Recharts donut/bar with click-to-filter drill-down into project table; phase overdue/schedule/budget signals in `useDashboardInsights`/`useDashboardProjects`; i18n ar/en
- [2026-08-03] Account create: explicit `Authorization` bearer on `manage-account` invoke; clearer edge-function error strings; `toastMutationError` maps Unauthorized/Forbidden/session/email-taken to i18n; GeneratedPasswordDialog has full-width copy button; ProjectFormDialog opens password dialog after PM create

## Next steps (concrete)

1. Optional next TaskFlow-inspired work: Excel import wizard, custom project fields, deadlines calendar (not a Gantt replacement)
2. Scorecard Phase 2: Playwright smoke, RLS snapshot tests, feature flags, demo seed profile, Sentry, further god-page splits, paged dashboard projects
3. Apply migrations to live/staging Supabase + verify RLS

## Open questions

- Hosting: company on-prem / self-hosted Supabase (preferred for air-gapped) vs cloud SPA + self-hosted API
