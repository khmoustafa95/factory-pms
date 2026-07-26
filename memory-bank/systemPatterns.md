# System patterns

## Current layout

```
src/
  components/       # Shared UI and layout
    ui/             # shadcn primitives (button, card, dialog, …)
  pages/            # Route screens
  lib/              # Clients/utils (supabase, cn)
  types/            # Shared types (Database stub)
```

- Path alias: `@/` → `src/` (root `tsconfig.json` + `tsconfig.app.json` + Vite)
- Routing: React Router in `App.tsx`
- App providers in `main.tsx`: `QueryClientProvider` → `ThemeProvider` → `BrowserRouter` + `Toaster`
- App is still an early shell; most PRD features are not implemented yet

## Supabase access

- `isSupabaseConfigured()` — UI / env checks
- `getSupabase()` — lazy singleton client typed with `Database`
- Types live in `src/types/database.ts` (stub until `supabase gen types`)
- Account provisioning: Edge Function `supabase/functions/manage-account` (create user + reset password + `revoke_user_sessions`)
- Role helpers: `src/lib/account-permissions.ts` (who may create/manage which roles)

## UI helpers

- `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge)
- Add components with `npx shadcn add <name>`

## Planned domain model

Tables: `profiles`, `factories`, `projects`, `phases`, `tasks`, `comments`

Enums (planned):

- `user_role`: `company_director` | `factory_manager` | `project_manager`
- `project_status`: `draft` | `proposed` | `approved` | `rejected` | `in_progress` | `completed` | `paused`
- `phase_status`: `pending` | `in_progress` | `completed`
- `task_status`: `todo` | `in_progress` | `blocked` | `done`
- `entity_type`: `project` | `phase` | `task` (for comments)

Helpers (planned): `get_auth_role()`, `get_auth_factory_id()` for RLS.

Realtime (planned): publish `tasks`, `comments`, `projects`.

## Conventions

- Match existing Prettier/ESLint; follow `.cursor/rules/`
- Server/async state: TanStack Query; local UI state: React
- Forms: react-hook-form + zod when building FT-02+
- ESLint: `react-refresh/only-export-components` off under `src/components/ui/` (shadcn variants)
