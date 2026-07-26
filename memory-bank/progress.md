# Progress

## Done

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
- [x] FT-02 Project proposals (factory manager draft/submit; role-scoped list)
- [x] FT-03 Approval workflow (director approve/reject with reason)
- [x] Env scripts: Vite modes (local/staging/production) + Supabase local CLI scripts
- [x] i18n: Arabic + English, RTL, locale persistence, translated UI copy
- [x] Theme: light / dark / system toggle with next-themes
- [x] Responsive layout: mobile nav drawer, scrollable tables/tabs, semantic tokens
- [x] Localized Zod validation messages (ar/en)
- [x] AdaptiveList mobile card view for list pages
- [x] Route-level code splitting (React.lazy)
- [x] Vitest unit tests for i18n + validation
- [x] Comprehensive `supabase/seed.sql` demo data (all enums/statuses)
- [x] Security: restrict signup role metadata; enforce `is_active` on login
- [x] Error Boundary + global query error handling (`QueryState`, `AppErrorBoundary`)
- [x] General settings: configurable app name, logo, sign-in branding (`/settings`, director-only)
- [x] DB performance: progress trigger + `get_dashboard_stats` / `get_project_activity` RPCs
- [x] Motion animations: page transitions, staggered lists/cards, shimmer skeletons, tab/content fade
- [x] Clean code refactor: shared mutation/list/filter helpers, removed dead label maps, i18n fix in PhaseFormDialog
- [x] Clean code phase 2: `PaginatedListPage`, `EscalationFormDialog`, `FormCheckboxField`, `form-utils`, `supabase-joins`
- [x] Clean code phase 3: `fetchPaginatedList`, `useFormDialog`, `types/joins.ts` canonical join types + select strings

## Backlog

- [ ] Apply migration to live Supabase project + verify RLS
- [ ] E2E tests (Playwright)

## Blockers / issues

- Migration not yet applied to a live Supabase project — UI needs `.env.local` + SQL run
- Product PRD lives in Notion; keep Memory Bank in sync when scope changes

## Changelog

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
