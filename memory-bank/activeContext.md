# Active context

## Current focus

**Factory manager project editing** — FM can update project details beyond draft/rejected (list + detail).

## Recent changes

- [2026-07-26] Factory managers can edit project info (title, description, budget, dates, PM) for all statuses except completed; edit on list + detail page
- [2026-07-26] Fixed Activity tab crash: unique Realtime channel names + removed duplicate `useCommentsRealtime` in `ProjectActivityTab`
- [2026-07-26] Implemented account create/reset: Edge Function `manage-account`, RLS for FM→PM updates, Accounts UI for director + factory manager, `revoke_user_sessions` on password reset
- [2026-07-26] Audited RBAC vs requested capabilities
- [2026-07-26] Fixed RTL alignment across app
- [2026-07-26] Design system / sidebar / seed / login fixes (see progress changelog)

## Next steps (concrete)

1. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
2. Apply migrations + deploy `manage-account` Edge Function to live Supabase; verify RLS
3. Optional: further shell polish (nav groups, breadcrumbs in top bar)

## Open questions

- Hosting target (Vercel vs Netlify)
