# Active context

## Current focus

**Kanban task completion** — when marking a task done, capture actual end date + spent cost; require schedule/financial justification on overrun vs due date / expected cost.

## Recent changes

- [2026-08-02] Fix: completing last task failed when phase `actual_end_date` (today) preceded phase `start_date` — `sync_phase_status_from_tasks` now clamps to `start_date` / max task actual end; Kanban uses `toastMutationError`
- [2026-08-02] Migration `20260802160000_task_completion_tracking.sql`: `tasks.actual_end_date`, `schedule_deviation_reason`, `financial_deviation_reason`; Kanban opens `TaskCompleteDialog` on done; TaskFormDialog aligned
- [2026-08-02] Task form: removed expected duration from UI; keep due date only for schedule; expected_duration_days defaults/preserved in payload
- [2026-08-02] Task form: completion fields (actual duration/cost, cost category) appear only when status is `done`; create = planning only; edit = planning + status (+ progress/blocked); assignee removed from dialog
- [2026-08-02] Task create form: planning fields only (title/description/due/weight/expected duration/cost); tracking (status/progress/actuals/cost category/assignee) on edit only
- [2026-08-02] Phase create form: hide field-tracking fields (actual end, deviation reasons, problem/solution); show only when editing
- [2026-08-02] Seed slimmed to accounts only: 2 factories (DMS/ALP) + 1 company director + 2 factory managers + 3 project managers (+ USD currency); removed demo projects/phases/tasks/inactive user; updated `demo-accounts.md` / `demo-accounts.ts` / i18n notes
- [2026-08-02] Migration `20260802120000_project_flow_hardening.sql`: `projects.code` (unique), `phases.actual_budget`, `project_execution_ready()`; `get_dashboard_stats` extended with `draft_count`/`proposed_count`/`in_progress_count`/`overdue_task_count`
- [2026-08-02] `src/lib/wbs.ts`: split `canManageWbs` into `canManagePhases` (approved/in_progress/paused) + `canManageTasks` (in_progress/paused, deprecated wrapper kept); added `canStartExecution` (FM + matching factory + `approved` status), `getExecutionReadiness()` (`ExecutionReadinessReason[]`), `remainingPhaseBudget`, `isPhaseBudgetSumValid`, `remainingTaskBudget`
- [2026-08-02] `ProjectFormDialog` rewritten: explicit `code` + `proposed_start_date`/`proposed_end_date` (derived duration display) replacing numeric duration/unit picker; inline "add project manager" flow (`useCreateAccount`) that now also invalidates `factory-project-managers` query key
- [2026-08-02] `PhaseFormDialog`/`phase.ts`: accepts `remainingBudget`/`projectBudget`, caps `expected_budget`, shows remaining-weight + remaining-budget hints + project budget context; `actual_budget` field shown once phase is completed or `actual_end_date` is set; validation requires financial reason when `actual_budget` deviates from `expected_budget`, schedule reason when `actual_end_date` deviates from `planned_end_date`
- [2026-08-02] `TaskFormDialog`/`task.ts`: optional `remainingBudget` caps `expected_cost` with a remaining-budget hint
- [2026-08-02] `ProjectWbsTab`: takes `canManagePhases`/`canManageTasks` separately (edit/delete phase vs add/edit/delete task gated independently); added phase-budget summary (`wbs.budgetSummary`/`remainingBudget`/`budgetInvalid`)
- [2026-08-02] `ProjectDetailPage`: "Start execution" gated by `canStartExecution` only, disabled with a readiness-reasons tooltip (`projects.executionNotReady.*`) when not ready; other execution actions (pause/resume/complete) + WBS management gated by `canManagePhases`/`canManageTasks`; passes `remainingBudget`/`projectBudget` to Phase/Task dialogs
- [2026-08-02] `ProjectsPage`: list-row "Start execution" gated by `canStartExecution` (role/factory check only — no phases loaded here, so readiness relies on RPC error feedback); pause/resume/complete gated by `canManagePhases`
- [2026-08-02] `mutation-error.ts`: `toastMutationError(error, fallback, t?)` now maps known `transition_project_status` RPC exception text to localized `projects.rpcErrors.*` keys
- [2026-08-02] `useDashboard.ts`/`DashboardPage`: `DashboardStats` gained `draftCount`/`proposedCount`/`inProgressCount`/`overdueTaskCount`; factory managers see those 4 KPI cards instead of "Active factories" (directors unchanged)
- [2026-08-02] `phase-metrics.ts` already used `phase.actual_budget` (falls back to summed task `actual_cost`) for financial deviation — confirmed still correct with new field
- [2026-08-02] `validations.test.ts` updated: `createProjectFormSchema` (removed) → `createSubmitProjectSchema` with `code`/dates/`assigned_pm_id`; `npm run verify` + `npm run build` + `vitest run` (34 tests) all pass

- [2026-08-01] Migration `20260801140000_phase_field_tracking.sql`: task `weight_percent` / `progress_percent` / duration / cost / `cost_category`; phase `expected_budget` / `actual_end_date` / deviation reasons / problem+solution; progress formula uses weighted task progress; phase completion sets `actual_end_date`
- [2026-08-01] Frontend: `phase-metrics.ts`, updated `progress.ts`, Phase/Task form dialogs, WBS metrics cards, field-health badge on progress overview; seed updated; i18n ar/en
- [2026-08-01] Task weight DB constraint: reject sum **> 100%** only (exact 100% enforced in UI like phase weights) so single-row edits remain possible

- [2026-07-28] Proposal duration UX: project form now uses numeric duration + unit (day/week/year) instead of manual start/end dates; execution start sets `actual_start_date`/`actual_end_date` from duration via `transition_project_status`
- [2026-07-28] Phase scheduling: added `start_date`/`end_date` on phases with DB + frontend validation against project window; phase status auto-syncs from task progress (removed manual status editing)
- [2026-07-28] Task due dates validated against phase schedule (frontend + DB trigger)
- [2026-07-28] Project timeline rebuilt as date-positioned Gantt bars with today marker
- [2026-07-28] Login page: `DemoAccountsDialog` shows trial credentials + copy actions (`demo123456`)
- [2026-07-28] Migration `20260728130000_duration_and_phase_dates.sql` + seed updates for duration/phase dates

## Next steps (concrete)

1. Run `npm run supabase:reset` — seed now injects accounts + 2 factories only (no demo projects)
2. Smoke-test proposal → approval → WBS → start execution with empty data
3. Optional later: deviation history table, Excel import

## Open questions

- Hosting target (Vercel vs Netlify)
