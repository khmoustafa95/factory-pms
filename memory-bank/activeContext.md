# Active context

## Current focus

**PM-centric proposal review** — Factory manager submits proposals with supporting files; assigned project manager discusses and approves/rejects.

## Recent changes

- [2026-07-27] Proposal approval actor moved from company director → assigned project manager
- [2026-07-27] Added `project_attachments` table + private `project-attachments` storage bucket
- [2026-07-27] Proposal detail view for draft/proposed/rejected (summary, files, comment discussion)
- [2026-07-27] Submit requires `assigned_pm_id`; DB check `projects_proposed_requires_pm`
- [2026-07-27] Changed default currency from SAR to USD; seed data from Saudi → Syrian (Damascus, Aleppo, Homs)
- [2026-07-27] Added `currencies` table with migration, RLS, full CRUD hooks
- [2026-07-27] Settings page: Account tab (all roles), General tab + Currencies tab (director only)

## Next steps (concrete)

1. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
2. Apply migrations + deploy `manage-account` Edge Function to live Supabase; verify RLS
3. Optional: further shell polish (nav groups, breadcrumbs in top bar)

## Open questions

- Hosting target (Vercel vs Netlify)
- Whether company director should retain a secondary approve override (currently view-only for proposals; RLS still allows director ALL)
