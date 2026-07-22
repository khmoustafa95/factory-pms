# Progress

## Done

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
- [x] FT-01 Factories & accounts (director CRUD + account role assignment)
- [x] FT-02 Project proposals (factory manager draft/submit; role-scoped list)
- [x] FT-03 Approval workflow (director approve/reject with reason)
- [x] Env scripts: Vite modes (local/staging/production) + Supabase local CLI scripts
- [x] i18n: Arabic + English, RTL, locale persistence, translated UI copy
- [x] Theme: light / dark / system toggle with next-themes
- [x] Responsive layout: mobile nav drawer, scrollable tables/tabs, semantic tokens

## Backlog

- [ ] Apply migration to live Supabase project + verify RLS
- [ ] FT-05 Kanban / Gantt / progress UI
- [ ] FT-06 Comments
- [ ] FT-07 Escalation / blocked

## Blockers / issues

- Migration not yet applied to a live Supabase project — UI needs `.env.local` + SQL run
- Product PRD lives in Notion; keep Memory Bank in sync when scope changes

## Changelog

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
