# Active context

## Current focus

**All PRD features (FT-01 → FT-07)** implemented in code. Next: apply Supabase migration to a live project and end-to-end QA.

## Recent changes

- [2026-07-22] FT-05: Kanban board, timeline/Gantt-style view, progress overview, dashboard KPIs
- [2026-07-22] FT-06: Comments on project/phase/task + activity feed with realtime invalidation
- [2026-07-22] FT-07: Escalations page for blocked tasks with leadership notification via comments
- [2026-07-22] FT-04: Project WBS page — phases with 100% weight validation, tasks with statuses and blocked reason
- [2026-07-22] FT-03: Directors approve/reject `proposed` projects; rejection requires reason shown to factory managers
- [2026-07-22] FT-02: Projects page — factory managers create/edit drafts, submit proposals (`proposed`)

## Next steps (concrete)

1. Create Supabase project and fill `.env.local`
2. Run migration SQL in Supabase (or `supabase db push` when CLI linked)
3. Create users and assign roles; walk through full workflow end-to-end
4. Optional: regenerate `database.ts` via `supabase gen types`
5. Optional: Arabic UI copy pass

## Open questions

- Arabic-only vs bilingual UI for first release
- Hosting target (Vercel vs Netlify)
