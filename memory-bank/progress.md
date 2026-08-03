# Progress

## Done

- [x] Staging seed: `pgcrypto` + `extensions.crypt`/`gen_salt` for `db reset --linked`
- [x] WBS readiness + start-execution UX: granular `canManagePhases`/`canManageTasks`/`canStartExecution`, `getExecutionReadiness()` with tooltip reasons, phase/task remaining-budget capping, RPC error → i18n mapping, FM dashboard KPI cards (draft/proposed/in-progress/overdue)
- [x] Field tracking: phase budget/deviations/problems + task weight/duration/cost/progress (Excel-aligned rollups)
- [x] Collapsible sidebar shell (brand header, icon collapse, RTL, mobile sheet)
- [x] Vite + React 19 + TypeScript + Tailwind v4 scaffold
- [x] React Router + basic layout / home page
- [x] Supabase client helper (`getSupabase` / `isSupabaseConfigured`) + Database stub
- [x] Env example, Prettier, ESLint, Husky + lint-staged
- [x] Cursor rules (`project-core`, `react-typescript`, `supabase`, `fix-terminal-output`)
- [x] `AGENTS.md` + format-after-edit hook
- [x] Memory Bank protocol and seed files
- [x] Lean `agent-quality` rule (filtered from legacy `.cursorrules`)
- [x] `decisionLog.md` + `lessonsLearned.md` + `npm run verify`
- [x] Install app deps: TanStack Query, shadcn/ui, RHF+zod, date-fns, lucide, sonner
- [x] Supabase migration SQL (DDL, enums, RLS, Realtime) in `supabase/migrations/`
- [x] Typed `src/types/database.ts` matching migration
- [x] Auth UI + session handling + role-aware routing
- [x] FT-01 Factories & accounts (director CRUD + account create/password reset via Edge Function; FM manages PMs)
- [x] FT-02 Project proposals (factory manager draft/submit + supporting files; role-scoped list)
- [x] FT-03 Approval workflow (director approve/reject with reason; director↔FM discussion on proposal)
- [x] Env scripts: Vite modes (local/staging/production) + Supabase local CLI scripts
- [x] i18n: Arabic + English, RTL, locale persistence, translated UI copy
- [x] Theme: light / dark / system toggle with next-themes
- [x] Responsive layout: mobile nav drawer, scrollable tables/tabs, semantic tokens
- [x] Localized Zod validation messages (ar/en)
- [x] AdaptiveList mobile card view for list pages
- [x] Route-level code splitting (React.lazy)
- [x] Vitest unit tests for i18n + validation
- [x] `supabase/seed.sql` demo accounts (1 director, 2 FMs, 3 PMs + 2 factories)
- [x] Security: restrict signup role metadata; enforce `is_active` on login
- [x] Error Boundary + global query error handling (`QueryState`, `AppErrorBoundary`)
- [x] General settings: configurable app name, logo, sign-in branding (`/settings`, director-only)
- [x] DB performance: progress trigger + `get_dashboard_stats` / `get_project_activity` RPCs
- [x] Motion animations: page transitions, staggered lists/cards, shimmer skeletons, tab/content fade
- [x] Clean code refactor: shared mutation/list/filter helpers, removed dead label maps, i18n fix in PhaseFormDialog
- [x] Clean code phase 2: `PaginatedListPage`, `EscalationFormDialog`, `FormCheckboxField`, `form-utils`, `supabase-joins`
- [x] Clean code phase 3: `fetchPaginatedList`, `useFormDialog`, `types/joins.ts` canonical join types + select strings

- [x] Codebase audit: migration consolidation, security hardening, integration/cache fixes

## Backlog

- [ ] Apply migration to live Supabase project + verify RLS
- [ ] E2E tests (Playwright)

## Blockers / issues

- Migration not yet applied to a live Supabase project — UI needs `.env.local` + SQL run
- Product PRD lives in Notion; keep Memory Bank in sync when scope changes

## Changelog

### 2026-08-03

- Fixed remote staging seed failure (`gen_salt does not exist`): `seed.sql` enables `pgcrypto` and uses `extensions.crypt` / `extensions.gen_salt`
- Documented troubleshooting in `docs/staging-deployment.md`

### 2026-08-02 (session 61)

- Phase WBS metrics: removed raw/non-raw material cost breakdown; show single actual cost rolled up from tasks (or phase `actual_budget`)

### 2026-08-02 (session 60)

- Root cause of Kanban "unable to update task status": completing last task set phase `actual_end_date` to today before phase `start_date` → constraint failure; fixed in `20260802170000_fix_phase_actual_end_on_complete.sql`; improved error toast extraction

### 2026-08-02 (session 59)

- Kanban: marking task done opens completion dialog for actual end date + spent cost; schedule/financial justification required when exceeding due date / expected cost
- Migration `20260802160000_task_completion_tracking.sql` + TaskFormDialog completion fields aligned

### 2026-08-02 (session 58)

- Task form: removed expected duration field from UI; kept due date for scheduling (expected_duration_days still defaulted/preserved in DB payload)

### 2026-08-02 (session 57)

- Task dialog: actual duration/cost + cost category only when status is `done` (not on every edit); create stays planning-only; assignee field removed from dialog; validation requires actual duration ≥ 1 when done

### 2026-08-02 (session 56)

- Task create dialog audited: only planning fields (title, description, due date, weight, expected duration, expected cost); status defaults to `todo`; progress/actuals/cost category/assignee shown on edit only

### 2026-08-02 (session 55)

- Phase create dialog: hide field-tracking fields (actual end date, actual budget, deviation reasons, problem/solution); those appear only when editing an existing phase

### 2026-08-02 (session 54)

- Slimmed `supabase/seed.sql` to user accounts only (director + 2 factory managers + 3 project managers) plus 2 active factories and USD currency — no projects/phases/tasks
- Updated `supabase/demo-accounts.md`, `src/lib/demo-accounts.ts`, and ar/en demo-account notes (removed inactive account)

### 2026-08-02 (session 53)

- Migration `20260802120000_project_flow_hardening.sql`: `projects.code`, `phases.actual_budget`, `project_execution_ready()`, extended `get_dashboard_stats`
- `wbs.ts`: split `canManageWbs` into `canManagePhases`/`canManageTasks`; added `canStartExecution`, `getExecutionReadiness` (typed `ExecutionReadinessReason`), `remainingPhaseBudget`, `isPhaseBudgetSumValid`, `remainingTaskBudget`
- `PhaseFormDialog`/`phase.ts`: remaining-budget cap + hints, conditional `actual_budget` field, financial/schedule deviation-reason enforcement tied to `actual_budget`/`actual_end_date`
- `TaskFormDialog`/`task.ts`: optional remaining-budget cap on `expected_cost`
- `ProjectWbsTab`: independent `canManagePhases`/`canManageTasks` gating + phase-budget summary
- `ProjectDetailPage`/`ProjectsPage`: "Start execution" gated strictly by `canStartExecution` with readiness-reasons tooltip on the detail page; RPC failures mapped to localized `projects.rpcErrors.*` via updated `toastMutationError(error, fallback, t)`
- `useDashboard.ts`/`DashboardPage`: factory-manager-only KPI cards for draft/proposed/in-progress/overdue counts
- `useCreateAccount` invalidates `factory-project-managers` query key so inline PM creation refreshes assignment dropdowns
- `validations.test.ts` updated for `createSubmitProjectSchema` (code/dates/PM) after `createProjectFormSchema` removal
- Validation: `npm run verify`, `npm run build`, and `vitest run` (34 tests) all passed

### 2026-08-01 (session 52)

- Field tracking (Excel-aligned): tasks carry weight/progress/duration/cost/category; phases carry expected budget, actual end, deviation reasons, problem/solution
- Progress: `Σ (phase.weight × Σ (task.weight × task.progress))`; DB `recalculate_project_progress` updated
- UI: WBS phase metric cards (planned vs actual, deviations), task weight/progress columns, field-health badge on progress overview
- Migration `20260801140000_phase_field_tracking.sql` + seed; `npm run verify` + progress unit tests passed

### 2026-07-27 (session 36)

- Terminology update only (no behavior changes): user-facing "Escalations" renamed to "Critical alerts" (`التنبيهات الحرجة`) in `ar/en` locale copy (nav, dashboard cards, action labels, dialog text, and validation messages)
- `npm run verify` passed (typecheck + lint)

### 2026-07-28 (session 37)

- Dashboard redesign: expanded KPI cards with total projects/tasks, overdue tasks, and 7-day deadlines
- Added responsive chart-like sections (project status distribution, task status distribution, progress buckets, top blocked projects)
- Added `useDashboardInsights` hook with role-scoped Supabase aggregation over `projects`/`tasks` + blocked tasks per project
- i18n updated for new dashboard labels in `ar/en`
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 38)

- Dashboard project intelligence: added `useDashboardProjects` hook for role-scoped detailed project rows (status/progress/budget/timeline/factory + blocked task count)
- Added dashboard project details panel with responsive table and localized filtering (`search`, `status`, `factory` for director)
- Added new i18n keys for dashboard project details section in `ar/en`
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 39)

- Dashboard advanced filters: added progress-range, blocked-state (blocked/not blocked), and task-activity (has in-progress/done/todo tasks) filters on project details panel
- Expanded per-project details with task metrics (`done`, `in_progress`, `blocked`, `total`) computed from role-scoped `tasks` query in `useDashboardProjects`
- Updated dashboard localization for new filter labels and task-metrics columns in `ar/en`
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 40)

- Added explicit project execution transition hook `useStartProjectExecution` in `useProjects.ts` to move project status from `approved` to `in_progress`
- Added "Start execution" action on `ProjectDetailPage` for users who can manage WBS, visible only while project status is `approved`
- Added localized labels/toasts for the new action in `src/i18n/locales/ar.ts` and `src/i18n/locales/en.ts`
- Validation: `npm run verify` and `npm run build` passed; npm printed `Unknown env config "devdir"` warning (environment-level, not project code)

### 2026-07-28 (session 41)

- Completed lifecycle + RBAC review of project flow across frontend guards and Supabase RLS
- Findings: current flow is functional but governance/security is weak due to missing server-side state-machine enforcement and over-permissive project update rights for FM/PM
- Identified UI/RLS mismatch: proposal discussion is restricted in UI but not fully enforced at DB comment insert policy
- Prepared recommended target flow (global-style): explicit transition matrix, guard-based transitions, RPC-based state changes, and stricter completion/pause rules

### 2026-07-28 (session 42)

- Added migration `20260728110000_tighten_project_rls.sql`
- Projects RLS hardening: PM direct project updates are now limited to execution-stage statuses only (`approved`, `in_progress`, `paused`)
- Comments RLS alignment: project-level comment inserts during proposal statuses (`draft`, `proposed`, `rejected`) are now restricted to company director + factory manager (matching UI policy)
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 43)

- Added execution lifecycle actions to `ProjectDetailPage`: pause, resume, complete (in addition to start)
- Added `ProjectPauseDialog` with required reason validation and localized labels/messages
- Added `usePauseProjectExecution`, `useResumeProjectExecution`, and `useCompleteProjectExecution` hooks using `transition_project_status` RPC
- Extended validation/i18n dictionaries (`ar/en`) with pause reason and execution action/result messages
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 44)

- Added the same execution lifecycle quick actions to `ProjectsPage` rows/cards: start, pause, resume, complete
- Reused `canManageWbs` to keep role/scoped execution permissions consistent with project detail behavior
- Integrated `ProjectPauseDialog` in `ProjectsPage` for pause reason capture before transition RPC call
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 45)

- Added locked execution action indicator in `ProjectsPage` when status is execution-eligible but user lacks permission
- Added localized tooltip reasons (`ar/en`) for common denial causes (out-of-factory scope, PM not assigned, PM not assignee, generic no-access)
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 46)

- Added the same locked execution-action indicator + tooltip reasons to `ProjectDetailPage` for consistency with `ProjectsPage`
- Reused the same localized messages and role-scope hint logic to explain hidden/disabled transitions at detail level
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 47)

- Added migration `20260728113000_project_status_audit_log.sql` with `project_status_transitions` audit table + read RLS scoped by `can_access_project(project_id)`
- Extended `transition_project_status` DB function to append immutable transition records (`from_status`, `to_status`, `changed_by`, `changed_by_name`, `changed_by_role`, `reason`, `created_at`)
- Added frontend query support (`queryKeys.projectStatusTransitions`, `useProjectStatusTransitions`) and cache invalidation after transitions/comments
- Enhanced `ProjectActivityTab` with a dedicated "Status transitions" section beside comments, fully localized (`ar/en`)
- Updated `src/types/database.ts` for the new audit table shape
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 48)

- Added migration `20260728114500_unified_activity_feed.sql` to unify comments and status transitions in `get_project_activity`
- Extended RPC return payload with `activity_kind`, transition fields (`from_status`, `to_status`, `reason`), while keeping comment context fields
- Refactored `ProjectActivityTab` to render a single chronological feed instead of separate transitions/comments sections
- Updated frontend RPC typing and activity hook mapping for the unified feed shape
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 49)

- Added migration `20260728120000_create_comment_rpc.sql` introducing `create_comment(p_entity_type, p_entity_id, p_body)` with server-side author resolution via `auth.uid()`
- Switched `useCreateComment` from direct `comments` insert to `supabase.rpc('create_comment', ...)`
- Updated `CommentThread` and escalation submit flow to remove client-provided `authorId`
- Updated Supabase function typing in `src/types/database.ts` for the new RPC
- Validation: `npm run verify` and `npm run build` both passed

### 2026-07-28 (session 51)

- Proposal duration model: `proposed_duration_value` + `proposed_duration_unit` (day/week/year) replaces date pickers in project form; actual dates computed on `approved → in_progress`
- Phase dates: `phases.start_date` / `end_date` required; validated within project schedule; status auto-derived from tasks
- Task due dates validated within phase window (Zod + DB trigger)
- `ProjectTimeline` renders real date-positioned Gantt bars + today marker
- Login trial UX: `DemoAccountsDialog` on `/login` with all demo emails/password
- Migration `20260728130000_duration_and_phase_dates.sql`; seed updated
- Validation: `npm run verify` + `npm test` passed (27 tests)

### 2026-07-28 (session 50)

- Fixed `20260728114500_unified_activity_feed.sql` migration failure (`42P13 cannot change return type`) by dropping `public.get_project_activity(uuid)` before recreating it with the unified feed return columns
- Confirmed local DB migration push succeeds: `npx supabase db push --local` applied `20260728114500_unified_activity_feed.sql` and `20260728120000_create_comment_rpc.sql`

### 2026-07-27 (session 35)

- **Migration consolidation (12 → 8):** merged `handle_new_user` chain into `20260722110000`; FM profile policy into same; `revoke_user_sessions` → `20260727120000`; `grant_api_privileges` → `20260727130000` (last, with revokes on `recalculate_project_progress` + trigger fns)
- **Security:** `grant_api_privileges` no longer re-exposes internal recalc functions; anon limited to `app_settings`/`currencies` SELECT; SVG removed from logo MIME allowlist; `is_auth_active()` on currencies + app_settings director policies
- **Proposal backfill:** proposed projects without factory PM revert to `draft` instead of failing CHECK constraint
- **Auth:** `refreshProfile()`; `isLoading` during `onAuthStateChange` (fixes login bounce); profile set on `signIn`
- **Integration:** attachment upload invalidates cache; factory mutations invalidate paginated list; activity tab `canComment` uses `canManage`; dashboard accounts card for factory managers
- **Performance:** `usePhases`/`useTasks`/`useProjectRealtime` gated when WBS hidden; narrowed realtime invalidation (no global projects/escalations on every task tick)
- **Cleanup:** removed dead `HomePage.tsx`, unused `canEditProject()`; comment/escalation max length validation; settings tabs error/retry UI
- `npm run verify` + `npm test` clean (27 tests)

### 2026-07-27 (session 34)

- Proposal discussion is between **company director** and **factory manager** only (`canDiscussProposal`); PM can view but not post
- Approval/reject UI restored to **company director** (`canApproveAsDirector`)
- i18n copy updated for director review + director–FM discussion (ar/en)

### 2026-07-27 (session 33)

- PM proposal review workflow: FM submits with supporting files + required assigned PM; PM reviews detail (summary, attachments, comments) then approve/reject
- Migration `20260727110000_project_proposal_attachments.sql`: `project_attachments`, private storage bucket, `can_access_project()`, PM update on `proposed`, `projects_proposed_requires_pm`
- UI: proposal detail mode on `/projects/:id` for draft/proposed/rejected; list approve/reject for assigned PM (not director)
- Seed: proposed solar project assigned to Ahmed PM
- i18n: updated proposal copy (ar/en) for PM review + attachments

### 2026-07-27 (session 32)

- Changed default currency SAR → USD; seed data localized to Syria (Damascus, Aleppo, Homs factories)
- Added `currencies` table (migration `20260727100000_currencies_table.sql`) with RLS (director CRUD, all read)
- Settings page now accessible to all roles; default tab is Account (view/edit full name, read-only email/role)
- Director-only tabs: General (branding), Currencies (add/edit/delete/set default)
- ProjectFormDialog currency field uses Select from active currencies instead of free text input
- Added `useCurrencies`, `useActiveCurrencies`, `useCreateCurrency`, `useUpdateCurrency`, `useDeleteCurrency` hooks
- i18n: added `settings.account.*`, `settings.currencies.*` keys for ar/en

### 2026-07-26 (session 31)

- Factory manager can edit project details (not only draft/rejected): list Edit + detail-page Edit; form Save-only mode for non-proposal statuses; `useUpdateProject` allows proposed/approved/in_progress/paused

### 2026-07-26 (session 30)

- Fixed Activity tab Error Boundary crash: Supabase Realtime throws if `.on()` is called on an already-subscribed channel topic; `ProjectActivityTab` + `CommentThread` both used `comments-project-{id}`. Unique channel names + removed duplicate subscribe.

### 2026-07-26 (session 29)

- Account provisioning: Edge Function `manage-account` (create + reset password)
- Migrations: FM can update PM profiles; `handle_new_user` reads `user_metadata`; `revoke_user_sessions` for forced logout
- UI: Accounts page for director + factory manager; create account; generate password dialog; session revoke on reset
- Verified locally: director creates FM/PM; FM creates PM only; reset returns new password after session revoke

### 2026-07-26 (session 28)

- RBAC capability audit vs user requirements:
  - Director: all projects ✅, create factories ✅, edit accounts only (no create / no password reset) ⚠️
  - Factory manager: cannot access Accounts page; RLS read-only on profiles; can assign PMs on projects ⚠️/❌
  - Project manager: multi-project via `assigned_pm_id` ✅
  - Password generate + force logout of target session: not implemented ❌

### 2026-07-26 (session 27)

- RTL pass: logical alignment (`text-start`/`text-end`/`ps`/`pe`), ProgressBar fills from inline-start, explicit `dir` on sidebar/inset/tabs, locale bootstrap script in `index.html`, back arrow by direction

### 2026-07-26 (session 26)

- App shell polish (Linear/Notion-inspired): sign-out as sidebar menu item aligned with nav; compact top bar; `PageHeader` + `app-panel` across lists
- Dashboard / Project detail / Escalations headers unified; Card `interactive` only for clickable tiles; dark `--sidebar-primary` neutralized

### 2026-07-26 (session 25)

- `supabase/seed.sql`: all demo text in Arabic; password `demo123456`
- Added `supabase/demo-accounts.md` as the easy-reference credentials file; linked from README

### 2026-07-26 (session 24)

- Fixed ESLint: `form.watch` → `useWatch`; Auth `signIn`/`signOut` wrapped in `useCallback`; context files exempt from `react-refresh/only-export-components`; logo object URL via `useMemo` (no setState-in-effect)
- `npm run verify` clean (0 errors, 0 warnings)

### 2026-07-26 (session 23)

- App shell: top header navigation → collapsible sidebar (`collapsible="icon"`)
- Brand (logo + company name) in sidebar header; user block + theme/locale/sign-out in footer
- Mobile: sheet drawer; desktop: icon collapse + rail + Ctrl/Cmd+B; RTL places sidebar on the right
- Added `sidebar` / `sheet` UI primitives; `a11y.toggleSidebar` i18n

### 2026-07-26 (session 22)

- Login failed with "Email logins are disabled": `[auth.email] enable_signup = false` blocks email password login in GoTrue
- Set `[auth.email] enable_signup = true` while keeping `[auth] enable_signup = false`; restarted local Supabase
- After Auth 200, app still toast "Unable to sign in": public tables lacked `SELECT`/`INSERT`/`UPDATE`/`DELETE` for `authenticated`/`anon` (PostgREST 42501 on `profiles`)
- Added + applied `20260726100000_grant_api_privileges.sql`; verified director token can read own profile

### 2026-07-23 (session 21)

- Local Supabase start: fixed helper-before-table order in initial migration (`profiles` / `projects` must exist before RLS helpers)
- Seed: provision users via `raw_app_meta_data` role + factory_id (trigger creates profiles); removed `ALTER TABLE auth.users DISABLE TRIGGER` (seed role is not owner)
- Synced `.env.development` publishable/anon key with `supabase start` JWT
- Stack healthy: API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`

### 2026-07-22 (session 20)

- `fetchPaginatedList` generic helper; all paginated hooks refactored
- `useFormDialog` hook adopted by all 7 form dialogs (incl. dual-submit ProjectFormDialog)
- `types/joins.ts`: canonical join row types, select string constants, `joinMappers`; re-exported from `database.ts`
- Tests for `fetchPaginatedList` and `joinMappers`

### 2026-07-22 (session 19)

- `PaginatedListPage` layout component adopted by Factories, Accounts, Projects, Escalations pages
- `EscalationFormDialog` extracted from `EscalationsPage`
- shadcn `Checkbox` + `FormCheckboxField` in factory/account dialogs
- `form-utils` nullable select helpers; `supabase-joins` `mapJoinRows`/`mapJoinRow` in hooks
- `FormFieldError` in `ProjectFormDialog`, `TaskFormDialog`, `ProjectRejectDialog`

### 2026-07-22 (session 18)

- Extracted `toastMutationError`, `list-filters` (`getActiveInactiveFilterOptions`, `buildFactoryFilterOptions`, `applyActiveStatusFilter`), `formatFactoryLabel`, `ActiveStatusBadge`, `FormFieldError`, `useEditDialog`
- Added `toFactoryPayload` / `toPhasePayload`; removed unused `*_LABELS` maps and `phase-status.ts`
- Fixed hardcoded English weight validation in `PhaseFormDialog`; moved `useDashboardStats` to `hooks/useDashboard.ts`
- Unit tests for `list-filters` and `mutation-error`

### 2026-07-22 (session 17)

- Motion utilities in `index.css` + `src/components/motion/` (`PageTransition`, `StaggerGroup`, `FadeIn`)
- Applied to AppLayout outlet, dashboard KPIs, login, kanban columns, AdaptiveList mobile cards, QueryState shimmer, card hover, tabs content, progress bar

### 2026-07-22 (session 16)

- Migration `20260722130000_performance_functions.sql`: `recalculate_project_progress` trigger on tasks/phases; `get_dashboard_stats()` + `get_project_activity()` RPCs
- Frontend: removed `syncProjectProgress` from task mutations; dashboard/activity use `.rpc()`; narrower cache invalidation

### 2026-07-22 (session 15)

- `app_settings` singleton table + `app-assets` storage bucket (migration `20260722120000_app_settings.sql`)
- Settings page at `/settings` (General tab): app name (en/ar), short name, logo upload, sign-in description
- `AppSettingsProvider` / `AppBrand` replace hardcoded branding in header, login, document title, favicon
- Removed static `app.name` / `auth.signInDescription` from i18n locales

### 2026-07-22 (session 14)

- Merged PR #7 (security) + PR #8 (QueryState/Error Boundary) on `cursor/merge-branches-2853`
- `QueryState`, `AppErrorBoundary`, `getQueryErrorMessage`; list pages + project detail refactored

### 2026-07-22 (session 13)

- Migration `20260722110000_security_auth_hardening.sql`: `is_auth_active()`, hardened `handle_new_user`, RLS blocks inactive users
- `AuthContext` signs out inactive/missing profiles; localized login errors; `enable_signup = false`

### 2026-07-22 (session 12)

- Comprehensive `supabase/seed.sql`: 3 factories, 7 users, 7 projects (all statuses), phases, tasks, comments; demo password `Demo123!`

### 2026-07-22 (session 11)

- Localized Zod schemas via `create*Schema(t)` factories
- `AdaptiveList` mobile cards for Projects/Factories/Accounts/Escalations
- React.lazy route splitting; main chunk ~344 kB (was ~887 kB)
- Vitest tests for translator + validation; Kanban horizontal scroll + status Select

### 2026-07-22 (session 10)

- `AdaptiveList` on Factories, Accounts, Escalations, Projects list pages — mobile cards + desktop tables; empty state handled by `AdaptiveList`

### 2026-07-27

- [x] `docs/staging-deployment.md` — Arabic staging deploy guide (free Supabase + Cloudflare Pages / Vercel)
- [x] `public/_redirects` for SPA client-side routing on static hosts
- [x] README link to staging deployment doc

### 2026-07-22 (session 9)

- Project detail i18n: `ProjectDetailPage`, `ProjectWbsTab`, `ProjectProgressOverview`, `ProjectTimeline`, `ProjectActivityTab`, `CommentThread`, `TaskKanbanBoard`

### 2026-07-22 (session 8)

- List pages i18n: `DashboardPage`, `ProjectsPage`, `FactoriesPage`, `AccountsPage`, `EscalationsPage` — `useTranslation`, `PageHeader`, `StatusMessage`, `ResponsiveTable`, `getRoleLabel`, `formatLocalizedDate` / `formatLocalizedBudget` / `formatLocalizedDateTime`, semantic theme tokens

### 2026-07-22 (session 7)

- Form dialogs i18n: `ProjectFormDialog`, `ProjectRejectDialog`, `FactoryFormDialog`, `AccountFormDialog`, `PhaseFormDialog`, `TaskFormDialog` — `useTranslation`, `getRoleLabel` / `getTaskStatusLabel` / `getPhaseStatusLabel`, `text-destructive` for errors

### 2026-07-22 (session 6)

- Vite env modes: `.env.development` (local Supabase), `.env.staging`, `.env.production`
- npm scripts: `dev:local`, `dev:staging`, `build:staging`, `start:local`, `supabase:*`
- `supabase init` + `seed.sql` placeholder

### 2026-07-22 (session 5)

- FT-04: `/projects/:id` WBS page with phase CRUD, 100% weight validation, task CRUD, blocked reason

### 2026-07-22 (session 4)

- FT-03: director approve/reject on proposed projects; rejection reason surfaced to factory managers

### 2026-07-22 (session 3)

- FT-02: project proposal form, draft/submit workflow, projects list with role-scoped access

### 2026-07-22 (session 2)

- Added initial Supabase schema migration from Notion PRD domain model
- Implemented auth, protected routes, and FT-01 (Factories + Accounts pages)
- Hand-authored `Database` types (replace with `supabase gen types` after migration applied)

### 2026-07-22

- Added Memory Bank (`memory-bank/*`) and always-on rule `.cursor/rules/memory-bank.mdc`
- Documented current shell vs PRD backlog for Enterprise PMS
- Ported useful legacy `.cursorrules` into `agent-quality.mdc` + Memory Bank extensions; skipped credentials, cursor-tools, mode theater, `typedSelect`, mandatory `useCallback`
- Added `npm run verify` (typecheck + lint)
- Installed TanStack Query, shadcn/ui (radix-nova + core components), forms (RHF+zod), date-fns, lucide; wired QueryClient + ThemeProvider + Toaster
