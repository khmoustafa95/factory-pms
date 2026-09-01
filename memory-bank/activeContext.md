# Active context

## Current focus

**Human-readable project URLs** — canonical routes use `/projects/:factoryCode/:projectCode`; legacy UUID links redirect automatically.

## Recent changes

- [2026-09-01] Project URLs: `buildProjectPath` + dual routes (`/projects/FAC/PRJ-001` canonical, `/projects/:uuid` legacy redirect); migration `20260901140000_project_code_routes.sql` adds `project_detail_path`, dashboard RPC `code`, notification links for task/mention events
- [2026-09-01] UX rollout: shared confirm/empty/fetching primitives; URL-synced tabs/filters; guarded deletes; finance mobile cards; dashboard/notifications/command palette polish
- [2026-09-01] Unsaved-changes guard: `DiscardChangesDialog` + `useFormDialogClose` on all 13 `useFormDialog` form dialogs; `PhaseFormDialog`/`TaskFormDialog` basics + collapsible tracking (`sm:max-w-xl`); `TaskCompleteDialog` optional impact props + `StatusMessage`
- [2026-09-01] Form perf cleanup: `useValidationSchema` accepts explicit deps (fixes inline-factory rebuild every render); removed redundant `key={locale}` form remounts; `TaskCompleteDialog` uses `useFormDialog` + shared schema hook
- [2026-09-01] Financial operations: migration `20260901120000_project_financial_operations.sql` (4 tables + RLS + `get_project_financial_snapshot` + extended dashboard/list RPCs); `ProjectFinancePanel` with CRUD dialogs; proposal summary + finance tab on `ProjectDetailPage`; dashboard underfunded/overdue-procurement KPIs; projects list budget-used/funding-status columns; i18n `projectFinance` ar/en
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

1. Apply `20260901120000_project_financial_operations.sql` to staging/live Supabase + smoke-test finance CRUD per role
2. Optional: Realtime invalidate on finance tables; procurement ↔ raw-material task link
3. Scorecard Phase 2: Playwright smoke, RLS snapshot tests, demo seed with sample funding/procurement
4. Manual QA: mobile finance cards, dashboard filter chips URL sync, notification deep links, discard-changes on form dialogs

## Open questions

- Hosting: company on-prem / self-hosted Supabase (preferred for air-gapped) vs cloud SPA + self-hosted API
