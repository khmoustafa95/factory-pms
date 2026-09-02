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
- Command palette (`Ctrl+K`) in `AppLayout` searches nav + project titles (RLS-scoped)
- Dashboard explore table is virtualized (`@tanstack/react-virtual`); list search is debounced (`useDebouncedValue`)
- Date fields use a lazy `DatePicker` (react-day-picker code-split); attachments use dropzone + file-type icons
- Spreadsheet export is UTF-8 BOM CSV (`downloadSpreadsheet`) opened by Excel — not a TaskFlow package clone

## Supabase access

- `isSupabaseConfigured()` — UI / env checks
- `getSupabase()` — lazy singleton client typed with `Database`
- Types live in `src/types/database.ts` (stub until `supabase gen types`)
- Account provisioning: Edge Function `supabase/functions/manage-account` (create user + reset password + `revoke_user_sessions`)
- Role helpers: `src/lib/account-permissions.ts` (who may create/manage which roles)

## UI helpers

- `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge)
- Add components with `npx shadcn add <name>`
- **Dialogs** (`src/components/ui/dialog.tsx`): flex column, `max-h-[90vh]`, no outside-click dismiss by default (`dismissOnOutsideClick`); use `DialogHeader` / `DialogBody` / `DialogFooter`; close button positioned with `end-*` for RTL. Form dialogs: `<form className="flex min-h-0 flex-1 flex-col">` wrapping body + footer.

## Domain model (implemented)

Hierarchy: `factories` → `projects` → `phases` → `tasks` (+ `comments`, attachments, status transitions).

- **Phases:** `weight_percent` (sum 100% in UI), planned `start_date`/`end_date`, `expected_budget`, `actual_end_date`, schedule/financial deviation reasons, problem/solution text. Status auto-synced from tasks.
- **Tasks:** `weight_percent` (sum 100% per phase in UI), `progress_percent`, expected/actual duration days, expected/actual cost, `cost_category` (`raw_material` | `non_raw_material`).
- **Progress:** project% = Σ (phase.weight/100 × Σ (task.weight/100 × task.progress)); recalculated by DB trigger.
- **Field metrics:** actual duration/cost roll up from tasks; schedule/financial deviation computed in `src/lib/phase-metrics.ts`; derived field health on progress overview.
- **Dashboard:** `get_dashboard_stats`, `get_dashboard_insights`, `get_dashboard_projects` RPCs (`security invoker`); SPA filters explore rows client-side after RPC.
- **Lifecycle governance:** assigned PM writes phases/tasks; factory manager or director pause/resume; factory manager requests completion, director confirms. After approval, budget/dates/code freeze except `request_project_change` / `review_project_change`. Funding write = director + FM; procurement/staff/expense write = assigned PM + FM. Escalations are blocked tasks with `escalation_status` + `acknowledge_task_escalation`.

## Conventions

- Match existing Prettier/ESLint; follow `.cursor/rules/`
- Server/async state: TanStack Query; local UI state: React
- Forms: react-hook-form + zod when building FT-02+
- ESLint: `react-refresh/only-export-components` off under `src/components/ui/` (shadcn variants)
