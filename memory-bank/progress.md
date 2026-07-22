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

## Backlog

- [ ] Apply migration to live Supabase project + verify RLS
- [ ] FT-02 Project proposals
- [ ] FT-03 Approval workflow
- [ ] FT-04 Phases & tasks (WBS)
- [ ] FT-05 Kanban / Gantt / progress UI
- [ ] FT-06 Comments
- [ ] FT-07 Escalation / blocked

## Blockers / issues

- Migration not yet applied to a live Supabase project — UI needs `.env.local` + SQL run
- Product PRD lives in Notion; keep Memory Bank in sync when scope changes

## Changelog

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
