# AGENTS.md

## Project

**Projects System Management** — Vite + React 19 + TypeScript SPA with Tailwind CSS v4, React Router, and Supabase JS.

## Layout

```
src/
  components/   # Shared UI and layout
  pages/        # Route-level screens
  lib/          # Clients and utilities (e.g. supabase)
  types/        # Shared types (e.g. Database stub)
```

Use the `@/` path alias for imports from `src/`.

## Commands

| Command             | Purpose                      |
| ------------------- | ---------------------------- |
| `npm run dev`       | Dev server                   |
| `npm run build`     | Typecheck + production build |
| `npm run typecheck` | TypeScript only              |
| `npm run lint`      | ESLint                       |
| `npm run verify`    | Typecheck + lint             |
| `npm run format`    | Prettier write               |

## Stack notes

- Server state: `@tanstack/react-query` (provider in `src/main.tsx`)
- UI: shadcn/ui in `src/components/ui/` — add via `npx shadcn add <name>`
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers`

## Environment

- Copy `.env.example` → `.env.local` and fill Supabase values.
- Never commit `.env`, `.env.local`, or secrets.
- Frontend uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` only (never the service-role key).

## Conventions for agents

- Prefer small, focused changes; do not drive-by refactor unrelated files.
- Follow scoped rules in `.cursor/rules/` (`project-core`, `agent-quality`, `memory-bank`, `react-typescript`, `supabase`).
- Cross-session context: read/update [`memory-bank/`](memory-bank/) per the Memory Bank protocol (product PRD lives in Notion). Say **UMB** to force a full Memory Bank sync.
- Use `getSupabase()` / `isSupabaseConfigured()` from `src/lib/supabase.ts`; keep `Database` types in `src/types/database.ts`.
- Match existing Prettier/ESLint style; do not add docs or comments unless asked (Memory Bank updates are expected).
