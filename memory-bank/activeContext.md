# Active context

## Current focus

**Activity tab realtime crash fixed** — duplicate Supabase channel subscribe threw Error Boundary.

## Recent changes

- [2026-07-26] Fixed Activity tab crash: unique Realtime channel names + removed duplicate `useCommentsRealtime` in `ProjectActivityTab`
- [2026-07-26] Implemented account create/reset: Edge Function `manage-account`, RLS for FM→PM updates, Accounts UI for director + factory manager, `revoke_user_sessions` on password reset
- [2026-07-26] Audited RBAC vs requested capabilities: director all-projects + factories OK; account create/password reset missing; FM cannot access Accounts; PM multi-project OK via `assigned_pm_id`
- [2026-07-26] Fixed RTL alignment across app: ProgressBar fill from inline-start, table/actions `text-end`, sidebar/sign-out `dir`, tabs `dir`, back arrow by locale, early `dir` in index.html
- [2026-07-26] Design system pass: sidebar footer sign-out as `SidebarMenuButton`, clean top bar, shared `PageHeader`/`app-panel`, dashboard/detail/escalations aligned, neutral dark sidebar primary
- [2026-07-26] Seed data Arabic; demo password `demo123456`; accounts listed in `supabase/demo-accounts.md` (+ README link)
- [2026-07-26] Moved locale/theme toggles to physical top-left of the app top bar; sign-out stays in sidebar footer
- [2026-07-26] Cleared ESLint warnings: `useWatch` in GeneralSettingsForm, `useCallback` for auth signIn/signOut, eslint override for context co-exported hooks; logo preview via `useMemo` + revoke cleanup
- [2026-07-26] Replaced top `AppLayout` header nav with collapsible sidebar: logo + company name in header, icon-mode collapse (Ctrl/Cmd+B), mobile sheet, user footer with theme/locale/sign-out
- [2026-07-26] Added shadcn `sidebar` / `sheet` / `tooltip` / `skeleton` + `useIsMobile` (`useSyncExternalStore`)
- [2026-07-26] `AppBrand` supports `layout="sidebar"` and forwards link props for `asChild`
- [2026-07-26] Added `20260726100000_grant_api_privileges.sql` — `authenticated`/`anon` lacked SELECT/INSERT/UPDATE/DELETE on public tables (only Dxtm), so post-login `profiles` read failed with generic "Unable to sign in"
- [2026-07-26] Fixed login: `[auth.email] enable_signup` must be `true` (misleading name — false also blocks password login); global `[auth] enable_signup = false` still blocks new signups
- [2026-07-23] Fixed DB bootstrap: helpers after tables in `20260722100000_initial_schema.sql`; seed uses `app_metadata` (no `ALTER auth.users` triggers); synced `.env.development` anon JWT
- [2026-07-22] Phase 3 refactor: `fetchPaginatedList`, `useFormDialog` (all form dialogs), `types/joins.ts` with select constants + `joinMappers`

## Next steps (concrete)

1. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
2. Apply migrations + deploy `manage-account` Edge Function to live Supabase; verify RLS
3. Optional: further shell polish (nav groups, breadcrumbs in top bar)

## Open questions

- Hosting target (Vercel vs Netlify)
