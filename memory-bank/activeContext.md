# Active context

## Current focus

**Director ↔ Factory Manager proposal discussion** — FM submits with files; director and FM discuss; director approves/rejects. Assigned PM is for post-approval execution.

## Recent changes

- [2026-07-27] Proposal discussion restricted to company director + factory manager; approval UI restored to director
- [2026-07-27] Proposal approval actor briefly moved to PM, then reverted to director with director–FM discussion
- [2026-07-27] Added `project_attachments` table + private `project-attachments` storage bucket
- [2026-07-27] Proposal detail view for draft/proposed/rejected (summary, files, comment discussion)
- [2026-07-27] Submit requires `assigned_pm_id`; DB check `projects_proposed_requires_pm`

## Next steps (concrete)

1. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
2. Apply migrations + deploy `manage-account` Edge Function to live Supabase; verify RLS
3. Optional: further shell polish (nav groups, breadcrumbs in top bar)

## Open questions

- Hosting target (Vercel vs Netlify)
