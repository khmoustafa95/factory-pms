# Active context

## Current focus

**FT-02 (Project proposals)** implemented. Next: **FT-03 Approval workflow** (director approve/reject).

## Recent changes

- [2026-07-22] FT-02: Projects page — factory managers create/edit drafts, submit proposals (`proposed`); directors/PMs get role-scoped list view
- [2026-07-22] Added `supabase/migrations/20260722100000_initial_schema.sql` — full PRD domain schema, RLS helpers/policies, Realtime publication
- [2026-07-22] Replaced `database.ts` stub with typed tables/enums matching migration
- [2026-07-22] Auth: `AuthProvider`, login page, protected + role-based routes
- [2026-07-22] FT-01 UI: Factories CRUD + Accounts role/factory assignment (company director only)
- [2026-07-22] Installed `@tanstack/react-query`, shadcn/ui (+ core UI components), `zod`, `react-hook-form`, `date-fns`, `lucide-react`, `sonner`, `next-themes`; wired providers in `main.tsx`
- [2026-07-22] Added `agent-quality.mdc`, extended Memory Bank (`decisionLog`, `lessonsLearned`, UMB), added `npm run verify`
- Added Memory Bank (`memory-bank/` + `.cursor/rules/memory-bank.mdc`)
- Linked Memory Bank from `AGENTS.md`
- Earlier: Vite/React/Supabase shell, Cursor rules, tsconfig `NodeNext` casing fix for Edge Tools

## Next steps (concrete)

1. Create Supabase project and fill `.env.local`
2. Run migration SQL in Supabase (or `supabase db push` when CLI linked)
3. Create first auth user in Supabase Dashboard; set role to `company_director` on `profiles`
4. Implement **FT-03** — director approve/reject with reason
5. Implement **FT-04** — phases & tasks WBS

## Open questions

- Confirm React-only path (vs Flutter Web) for v1 — repo is React
- Arabic-only vs bilingual UI for first release
- Which chart/Kanban library for FT-05 (defer until that feature)
