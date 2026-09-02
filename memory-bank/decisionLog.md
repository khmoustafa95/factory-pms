# Decision log

Append-only. Format: `YYYY-MM-DD — Summary — Rationale / implications`

## Entries

- 2026-09-02 — Least-privilege lifecycle: assigned PM writes phases/tasks; factory manager (same factory) or director pause/resume; factory manager requests completion and director confirms (director may complete directly). After approval, budget/dates/code freeze except via `request_project_change` + director `review_project_change` (GUC bypass). PM reassignment is an immediate factory-manager RPC with notifications, not a director-reviewed change. `completion_requested` is timestamp columns so existing status dashboards stay valid.
- 2026-09-02 — Escalations stay blocked-task based; `escalation_status` (`open|acknowledged|resolved`) plus acknowledge RPC for governors — leadership can mark “seen” without unblocking the task.
- 2026-09-01 — Kanban status moves use `@dnd-kit/core` droppable columns (not `@dnd-kit/sortable`). Task `sort_order` stays WBS/phase order; dragging only changes `status` through the existing mutation + blocked/done dialogs.
- 2026-09-01 — Financial operations layer: `project_funding_entries`, `project_procurement_items`, `project_staff`, `project_expense_lines` (overhead only — WBS costs stay on phases/tasks); `get_project_financial_snapshot` + list/dashboard rollups; single **Finance & operations** tab (not four tabs, not ERP).
- 2026-09-01 — Canonical project URLs use `/projects/{factory_code}/{project_code}`; UUID kept for internal FKs and legacy links (SPA redirects to canonical path on load). Notification SQL uses `project_detail_path()` for new task/mention events.
- 2026-09-01 — Destructive actions without dedicated forms use shared `ConfirmDialog` + `useConfirmAction` instead of one-off `window.confirm` — keeps ar/en copy and loading state consistent.
- 2026-08-24 — Spreadsheet “Excel export” is UTF-8 BOM CSV (`downloadSpreadsheet`) rather than `exceljs`/`xlsx` — Arabic-safe in Excel, no extra Node/browser bundle, dynamic import not required.
- 2026-08-16 — Dashboard insights/project rows move to `get_dashboard_insights` / `get_dashboard_projects` (`security invoker`) — client-side full-table aggregation silently breaks past PostgREST row caps; SQL aggregates stay RLS-scoped like `get_dashboard_stats`.
- 2026-08-16 — CI gates PRs with typecheck/lint/test/i18n-parity/build; locale parity is a Vitest leaf-key walk (en↔ar) because `ar as TranslationDictionary` cannot catch missing Arabic keys at compile time.
- 2026-08-05 — Comment mentions store `@[Name](user:uuid)` tokens + `comment_mentions` rows validated against `list_mentionable_profiles` (SECURITY DEFINER) so PMs can mention without broad profiles RLS; mention notifications reuse the in-app inbox.
- 2026-08-05 — In-app notifications stay fully on-prem capable: Postgres rows + Supabase Realtime (or future polling), no FCM/email SaaS; inserts only via SECURITY DEFINER helpers/triggers so the SPA cannot forge inbox spam.
- 2026-08-05 — Dashboard prioritizes attention signals (blocked/overdue/proposals/phase issues) over static asset counts; Recharts + in-page filter drill-down instead of embedding Power BI — fits SPA RLS scope and current (non-historical) data model.
- 2026-08-03 — Auth `isLoading` only for bootstrap / user change; `TOKEN_REFRESHED` and same-user `INITIAL_SESSION` keep the UI mounted — tab focus must not look like a re-login.
- 2026-08-02 — Task completion on Kanban/form: require `actual_end_date` + `actual_cost`; overrun vs `due_date` / `expected_cost` requires schedule/financial deviation reasons (new task columns).

- 2026-08-02 — Proposal calendar dates are the source of truth on submit; duration is derived as days and stored for schedule helpers — avoids dual conflicting inputs.
- 2026-08-01 — Field tracking model: tasks are the source of actual duration/cost/progress (weights sum to 100% per phase in UI); phases hold planned baseline (`expected_budget`, schedule dates) plus deviation justifications and problem/solution — mirrors the legacy Excel tracker without importing spreadsheets.
- 2026-08-01 — DB enforces task weight sum **≤ 100%** (not exact equality) because single-row SPA mutations cannot atomically rebalance siblings; UI requires exact 100% (same pattern as phase weights). Delete rebalances freed weight onto a sibling.
- 2026-07-28 — Comment creation now goes through `create_comment()` RPC and does not accept client `author_id` — author identity is resolved server-side from `auth.uid()` to prevent spoofing and keep lifecycle actions consistently RPC-driven.
- 2026-07-28 — Project activity is unified through `get_project_activity` (comments + status transitions) with an `activity_kind` discriminator — a single server-sorted timeline simplifies UI consistency and avoids dual-query ordering drift between sections.
- 2026-07-28 — Status transitions are persisted in an immutable audit table (`project_status_transitions`) and rendered in project activity — lifecycle governance requires a durable history independent of mutable comments.
- 2026-07-28 — Tightened RLS to remove proposal-stage PM direct project updates and enforce proposal-discussion commenters at DB level (director + factory manager) — keeps governance consistent even if clients bypass frontend guards.
- 2026-07-28 — Project lifecycle transitions moved to a dedicated DB RPC `transition_project_status()` with a guard trigger blocking direct `projects.status` updates — UI-only guardrails are insufficient; centralizing transitions in DB enforces role/state/validation rules consistently across all clients.
- 2026-07-27 — Squashed iterative `20260726` migrations into base security/auth migrations; `grant_api_privileges` runs **last** with explicit `REVOKE EXECUTE` on `recalculate_project_progress` and trigger helpers — blanket function grants had re-opened SECURITY DEFINER internals to authenticated clients.
- 2026-07-27 — Disallow SVG in `app-assets` public bucket — SVG in public storage is an XSS/phishing vector when opened directly; raster formats only (PNG/JPEG/WebP).
- 2026-07-27 — Proposal **discussion** is company director ↔ factory manager; **approval** is by company director. Assigned PM is required on submit for execution after approval (not the proposal discussant/approver). Supporting files remain in `project-attachments`.
- 2026-07-26 — Account provisioning via `manage-account` Edge Function (service role) + SPA Accounts UI — directors create FM/PM; factory managers create PM for their factory; password reset calls `revoke_user_sessions`. Auth Admin `app_metadata` custom keys are unreliable on insert — `handle_new_user` also reads `user_metadata.user_role` / `factory_id`.
- 2026-07-26 — App chrome follows Linear/Notion patterns: soft sidebar active state, user block + sign-out as menu rows (not outline CTA), single `PageHeader` + `app-panel` surface for list chrome, utilities in top bar end.
- 2026-07-26 — App chrome uses shadcn `Sidebar` (`collapsible="icon"`) instead of a top nav bar — more space for content, persists collapse via cookie, RTL `side="right"`, mobile Sheet; brand stays in `SidebarHeader`.
- 2026-07-26 — Local auth: keep `[auth] enable_signup = false` (no public registration) and `[auth.email] enable_signup = true` so email/password login works for provisioned/seeded users. GoTrue treats the email flag as “email provider enabled,” not signup-only.
- 2026-07-26 — Always `GRANT` table CRUD to `anon`/`authenticated`/`service_role` in migrations (plus default privileges). RLS policies assume those role grants exist; missing grants break login after Auth succeeds.

- 2026-07-22 — Memory Bank as `memory-bank/` + `.cursor/rules/*.mdc` instead of a monolithic `.cursorrules` — keeps always-on context small and splits concerns for token efficiency.
- 2026-07-22 — React SPA path for v1 (not Flutter Web) — matches existing `factory-pms` scaffold and PRD React option.
- 2026-07-22 — Rejected porting `typedSelect`, demo credentials, `cursor-tools`, and custom mode-collaboration YAML — not present here and would conflict with security / React Compiler guidance / Cursor built-in modes.
- 2026-07-22 — Adopted TanStack Query + shadcn/ui (radix-nova) + RHF/zod/date-fns as the app dependency baseline from the Notion PRD tech stack.
- 2026-07-22 — App branding in `app_settings` + Supabase Storage (`app-assets`) — directors edit via `/settings`; all users read for header/login; defaults in `DEFAULT_APP_SETTINGS` when DB unavailable.
- 2026-07-22 — FT-01 account provisioning via Supabase Auth dashboard + director edits `profiles` (no service-role signup from SPA).
- 2026-07-22 — Lightweight custom i18n (`LocaleContext` + locale JSON) instead of react-i18next — small bundle, full control over RTL and typed keys; validation messages remain English until schema factories are added.
- 2026-07-22 — Server-side progress via PostgreSQL trigger + RPCs for dashboard/activity — atomic progress updates, fewer client round-trips, RLS-scoped reads via `security invoker` on RPCs.
- 2026-07-22 — Shared list/mutation helpers (`list-filters`, `toastMutationError`, `formatFactoryLabel`) over a generic `PaginatedListPage` — incremental DRY without a high-risk layout abstraction; i18n labels live in locale files only.
- 2026-07-22 — `types/joins.ts` as canonical join-type layer with `fetchPaginatedList` + `joinMappers` — typed selects documented in one place until `supabase gen types` supports nested relations; hooks import from joins instead of inline casts.
- 2026-07-23 — Local seed provisions Auth users with `app_metadata` and lets `on_auth_user_created` create profiles — avoids ownership errors on `auth.users` and matches production provisioning path.
- 2026-08-05 — Prefer removing deprecated TS 6 options (`baseUrl`) over `ignoreDeprecations: "6.0"` — the flag is transitional (gone in TS 7) and IDE language services still on 5.x reject `"6.0"` with TS5103.
