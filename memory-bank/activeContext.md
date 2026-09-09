# Active context

## Current focus

WBS and timeline are one project-detail tab: schedule strip + phase Gantt above the existing phase/task cards. Projects list no longer embeds long descriptions in rows (title + optional tooltip excerpt; full text on detail).

Director project import creates rows in **`consultation`** (not draft) so directors can see and complete opinions immediately. Existing matched rows still update without changing status. Factory managers submit drafts into consultation as before.

Consultation sits between draft and proposed: factory managers submit into `consultation`; company directors record research/board opinions and complete consultation → `proposed`; approve/reject remain on `proposed` only.

Proposal duration is entered in **months** at submit time. Calendar start/end dates are set after approval (factory manager) before phases and start execution. PM assignment remains after approval.


WBS role handoff after approval: factory manager designs phases and starts execution; assigned project manager prepares tasks (`todo`) then executes on Kanban. `approved` is the planning stage — no new status enum.

Projects list search: PostgREST `or()` cannot parse dotted embed columns (`factories.name`). Search now matches project title/description/code plus factory ids from a separate factories query.

Budget change-request review: director-only approve/reject was failing on `review_project_change` because a `CASE` of string literals inferred `text` instead of `change_request_status`. Fixed locally via `20260907120000_fix_review_project_change_status_cast.sql`.

On-prem production runbook: `docs/on-prem-production.md` (Arabic). Official hosting on a **Windows PC that also runs other office work** — not Ubuntu Server; data stays on-prem; remote sites wait for VPN.

Review artifact: `docs/user-stories.md` (Arabic) lists current implemented user stories vs PRD US-01–US-06, plus post-approval finance/lifecycle stories.

**All project finance is post-approval:** proposal screens have no funding or operations CRUD; those belong on the Finance tab after `approved`.

## Recent changes

- [2026-09-09] Arabic UI font: local `itfQomraArabic` (Light/Regular/Bold `.otf` in `public/fonts`) via `@font-face`; RTL body prefers it; removed `@fontsource-variable/noto-sans-arabic`. Geist remains for LTR. `npm run verify` passed.
- [2026-09-08] Timeline bars show actual phase progress (`calculatePhaseProgress` from tasks): fill overlay + % label on each bar; tasks passed via `tasksByPhase`. `npm run verify` passed.
- [2026-09-08] Professional timeline polish: split-pane Gantt (phase labels + track), month ticks/grid, status legend, today pill marker, duration chips on bars. `npm run verify` passed.
- [2026-09-08] Merged project detail Timeline into WBS tab (`ProjectTimeline` embedded above phase cards). Status-colored phase bars; empty states for missing schedule / empty track; `?tab=timeline` aliases to `wbs`. Projects list drops inline description (title + ~120-char tooltip). `npm run verify` passed.
- [2026-09-08] Dropped leftover check `projects_proposed_requires_pm` (blocked consultation → proposed without PM). Migration `20260908130200_drop_proposed_requires_pm.sql` applied locally.
- [2026-09-08] Director project import inserts as `consultation` (with `proposed_by`), not `draft`; updates still leave status unchanged. ar/en import copy updated. `npm run verify` passed.
- [2026-09-08] Consultation status: enum + `transition_project_status` (`draft|rejected` → `consultation` → `proposed` → approve/reject). FM form drops research/board opinions. Director `ProjectConsultationDialog` on list/detail. Notifications `project_consultation`. Migrations `20260908130000` / `20260908130100` applied locally. `npm run verify` passed.
- [2026-09-08] Proposal duration in months; calendar dates after approval: form/import use `proposed_duration_months` → `proposed_duration_value`/`month`. Submit RPC requires duration, not dates. While `approved`, FM can set start/end (contract freeze allows date edits only in approved). Start + phase inserts require calendar window. Checklist step + `ProjectScheduleDialog`. Migration `20260908120000_duration_months_after_approval.sql` applied locally. `npm run verify` passed.
- [2026-09-07] PM assignment after approval: removed PM from proposal form/submit schema/payload. `transition_project_status` no longer requires PM to propose; start execution does. `reassign_project_pm` limited to approved/in_progress/paused; first assign has optional reason. Planning checklist adds Assign PM. Migration `20260907210000_pm_after_approval.sql` applied locally. `npm run verify` passed.
- [2026-09-07] Projects Excel import + announcement fields: migration `20260907200000_project_announcement_fields.sql` (enum + 5 columns + director SELECT/INSERT/UPDATE all statuses including drafts). Form/detail/list/approve/export i18n. Director-only Import on Projects (`factory_code`+`code` upsert, status omitted so inserts stay `draft`). `npm run verify` passed; migration applied with `supabase db push --local`. User will smoke-test in the browser.
- [2026-09-07] Factory Excel import: Import on Factories asks to download `factories-template.xlsx` (exceljs, dynamic import); CSV also accepted. Strict header set `code,name,location,is_active`; upsert on `code`; all-or-nothing reject. Browser: director Import dialog, template download advanced to dropzone, bad CSV rejected, valid CSV previewed `1 added / 1 updated`. `npm run verify` passed.
- [2026-09-07] WBS role handoff: FM owns phases (`can_manage_project_phases`); assigned PM owns tasks including `approved`; trigger keeps task status `todo` until start; `phases_ready` inbox event. Planning checklist on overview; Start dialog always available to FM with readiness reasons + empty-task warning. Kanban `canExecuteTasks` only after `in_progress`. Migration `20260907140000_wbs_role_handoff.sql` applied locally (`supabase db push --local`). `npm run verify` passed.
- [2026-09-07] Projects list search (`Tes`) failed with PostgREST `PGRST100` / `failed to parse logic tree` at `factories.name` inside `.or()`. `or()` treats `factories` as a column and then expects an operator, not `.name`. Search now uses project `title`/`description`/`code` plus `factory_id.in.(…)` from a factories name/code query. Same pattern on escalations (`projects.title`). Quoted ilike values. Native search-cancel hidden so only one clear X. `npm run verify` passed.
- [2026-09-07] Director approve/reject of a pending budget (or schedule) change request failed with `column "status" is of type change_request_status but expression is of type text`. Root cause: `CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END` in `review_project_change` infers `text`. Cast the CASE to `change_request_status`. Migration `20260907120000_fix_review_project_change_status_cast.sql` applied with `supabase db push --local`. Flow is otherwise as designed: FM/assigned PM request after approval → in-app notify all company directors → director reviews on project overview (no dashboard KPI queue).
- [2026-09-07] Added `docs/on-prem-production.md`: official on-prem guide for a shared Windows host (Docker Desktop + Caddy, no Ubuntu Server), LAN-first then VPN for remote PCs, 200-user cap, director-operable backups. Linked from README and staging doc.
- [2026-09-07] Generated `docs/user-stories.md` for product review: PRD US-01–US-06 with current acceptance, plus US-A01–US-A93 covering auth, org, proposals, lifecycle, WBS, finance, escalations, notifications, dashboard, settings. Sourced from Notion PRD + implemented RBAC/UI.
- [2026-09-06] Funding also moved after approval: `canManageProjectFunding` + RLS `can_write_project_funding` only in `approved`/`in_progress`/`paused` (director/FM). Proposal detail no longer shows a finance panel or funding summary; approve dialog drops proposed-funding total. Migration `20260906130000_funding_after_approval.sql`.
- [2026-09-06] Operations first split: procurement/staff/overhead writes only after approval. Superseded for funding by the entry above.
- [2026-09-06] Duplicate `(factory_id, code)` insert/update maps `projects_factory_code_uidx` to `validation.projectCodeTaken` (ar/en). Toast mapping in `mutation-error`; form field error in `ProjectFormDialog`; save/update callers pass `t`. `npm run verify` + mutation-error tests passed.
- [2026-09-06] Calendar nav overlay sat under the caption (legacy `navLayout`, no `relative` months, no z-index), so prev/next month clicks never hit the buttons; caption was a static label with no year jump. Fixed `calendar.tsx` (`navLayout="around"`, positioned chevrons, dropdown styles) and `DatePicker` (`captionLayout="dropdown"`, `startMonth`/`endMonth` 50y back / 25y forward). Browser: FM New proposal start date Sep→Oct, year 2028, month Mar, selected `15 Mar 2028`; end date Sep→Oct. `npm run verify` passed.
- [2026-09-02] Lifecycle governance: migration `20260902120000_lifecycle_governance.sql` (contract freeze, WBS/finance RLS split, pause/complete roles, `completion_requested_*`, `project_change_requests`, escalation acknowledge, RPCs). UI dialogs for start / complete / change / reassign; Escalations acknowledge + filter; i18n + notification types. Applied with `supabase db push --local`. `npm run verify` and `npm test` passed.
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

1. Smoke consultation flow: FM submit → director opinions + complete → proposed → approve/reject
2. Follow `docs/on-prem-production.md` on the Windows host: power/Docker caps/firewall, then production secrets (not demo JWT), then LAN users only
3. Choose VPN (Tailscale vs WireGuard) before creating accounts at unlinked remote sites
4. Apply consultation + duration + PM-after-approval migrations when a non-dev database is created — on-prem production uses a clean migration apply, not `db reset`
5. Optional: Realtime invalidate on finance tables; procurement ↔ raw-material task link
6. Scorecard Phase 2: Playwright smoke, RLS snapshot tests, demo seed with sample funding/procurement
7. Optional: reuse `src/lib/import/` for accounts Excel import with the same template + upsert contract

## Open questions

- VPN choice for unlinked remote sites (Tailscale vs site-to-site WireGuard) — not decided in the runbook
- Later hardware upgrade: same Docker volumes + keep `pms.factory.local`; OS of the future server can differ
