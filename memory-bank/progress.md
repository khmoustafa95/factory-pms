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

## Backlog

- [ ] Supabase schema (DDL + enums) from Notion PRD
- [ ] RLS policies + helper functions
- [ ] Realtime on `tasks` / `comments` / `projects`
- [ ] Generate `src/types/database.ts` from schema
- [ ] Auth UI + session handling
- [ ] FT-01 Factories & accounts
- [ ] FT-02 Project proposals
- [ ] FT-03 Approval workflow
- [ ] FT-04 Phases & tasks (WBS)
- [ ] FT-05 Kanban / Gantt / progress UI
- [ ] FT-06 Comments
- [ ] FT-07 Escalation / blocked

## Blockers / issues

- No live Supabase schema in repo yet — types remain a stub
- Product PRD lives in Notion; keep Memory Bank in sync when scope changes

## Changelog

### 2026-07-22

- Added Memory Bank (`memory-bank/*`) and always-on rule `.cursor/rules/memory-bank.mdc`
- Documented current shell vs PRD backlog for Enterprise PMS
- Ported useful legacy `.cursorrules` into `agent-quality.mdc` + Memory Bank extensions; skipped credentials, cursor-tools, mode theater, `typedSelect`, mandatory `useCallback`
- Added `npm run verify` (typecheck + lint)
- Installed TanStack Query, shadcn/ui (radix-nova + core components), forms (RHF+zod), date-fns, lucide; wired QueryClient + ThemeProvider + Toaster
