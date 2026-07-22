# Active context

## Current focus

Core app dependencies installed (TanStack Query, shadcn/ui, forms, dates). Next: Supabase schema (DDL/RLS from Notion PRD) and generate types.

## Recent changes

- [2026-07-22] Installed `@tanstack/react-query`, shadcn/ui (+ core UI components), `zod`, `react-hook-form`, `date-fns`, `lucide-react`, `sonner`, `next-themes`; wired providers in `main.tsx`
- [2026-07-22] Added `agent-quality.mdc`, extended Memory Bank (`decisionLog`, `lessonsLearned`, UMB), added `npm run verify`
- Added Memory Bank (`memory-bank/` + `.cursor/rules/memory-bank.mdc`)
- Linked Memory Bank from `AGENTS.md`
- Earlier: Vite/React/Supabase shell, Cursor rules, tsconfig `NodeNext` casing fix for Edge Tools

## Next steps (concrete)

1. Create Supabase project and fill `.env.local`
2. Apply PRD DDL (enums, tables, RLS helpers/policies, Realtime publication)
3. Generate types into `src/types/database.ts`
4. Add Auth + role-aware routing / layouts
5. Implement Must features in order: FT-01 → FT-02 → FT-03 → FT-04

## Open questions

- Confirm React-only path (vs Flutter Web) for v1 — repo is React
- Arabic-only vs bilingual UI for first release
- Which chart/Kanban library for FT-05 (defer until that feature)
