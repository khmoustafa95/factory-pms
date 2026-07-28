# Active context

## Current focus

**Codebase audit & migration consolidation** — security hardening, integration fixes, merged DB migrations.

## Recent changes

- [2026-07-28] Fixed migration compatibility for `get_project_activity`: dropped the old function signature before recreating the unified return shape; `supabase db push --local` now applies `20260728114500` and `20260728120000` successfully
- [2026-07-28] Comment write path moved to RPC: added `create_comment(entity_type, entity_id, body)` using `auth.uid()` and switched frontend comment mutations to `.rpc('create_comment')` (removed client-side `authorId`)
- [2026-07-28] Unified project activity stream: `get_project_activity` now returns comments + `project_status_transitions` in one chronological feed (`activity_kind` discriminator) and `ProjectActivityTab` renders a single timeline
- [2026-07-28] Audit trail implemented: added `project_status_transitions` table + RLS and extended `transition_project_status` to append immutable status-change records (from/to, actor, role, reason, timestamp)
- [2026-07-28] Project activity UX enhanced: `ProjectActivityTab` now shows status transition history alongside comments with localized status labels and actor metadata
- [2026-07-28] Execution permission UX parity: added locked execution-action hint in `ProjectDetailPage` with the same tooltip reason model used in `ProjectsPage`
- [2026-07-28] Execution permission UX: added locked execution-action hint in `ProjectsPage` (tooltip + reason) when project is in execution statuses but user cannot perform transitions
- [2026-07-28] Projects list quick actions: added Start/Pause/Resume/Complete controls in `ProjectsPage` with role-aware execution permissions (`canManageWbs`) and pause-reason dialog support
- [2026-07-28] Lifecycle UI actions expanded: added pause/resume/complete project actions on project detail and wired all to `transition_project_status`; pause uses a reason-required dialog with localized validation/messages
- [2026-07-28] RLS tightening phase: restricted PM direct `projects` updates to execution statuses only (`approved`, `in_progress`, `paused`) and aligned DB comment-insert policy with proposal discussion rule (director + factory manager only during proposal statuses)
- [2026-07-28] Lifecycle/RBAC review: audited project status flow across UI + Supabase RLS; identified transition-governance gaps (missing server-side state machine, over-permissive update rights for FM/PM, and UI/RLS mismatch for proposal discussion permissions)
- [2026-07-28] Project execution start action: added "Start execution" button on project detail when status is approved and user can manage WBS; wired status transition `approved -> in_progress` with localized success/error toasts
- [2026-07-28] Dashboard advanced project filters: added progress-range, blocked-state, and task-activity filters plus per-project task metrics (done, in-progress, todo, total, blocked)
- [2026-07-28] Dashboard projects details: added role-scoped detailed projects table with filters (search, status, and factory for directors), localized labels, and blocked tasks per project
- [2026-07-28] Dashboard UX upgrade: added richer KPIs (total projects/tasks, overdue, upcoming deadlines), responsive status distribution charts (projects/tasks), progress buckets, and top blocked projects panel using role-scoped Supabase data
- [2026-07-27] Staging deploy guide: `docs/staging-deployment.md` (free Supabase + Cloudflare/Vercel); `public/_redirects` for SPA routing; README link
- [2026-07-27] UX terminology update: renamed user-facing "Escalations" labels to "Critical alerts" / "التنبيهات الحرجة" across nav, dashboard, actions, dialog copy, and validation messages (no logic/schema changes)
- [2026-07-27] Consolidated 12 migrations → 8: merged `handle_new_user` patches, FM profile policy, `revoke_user_sessions` fix; moved `grant_api_privileges` last with explicit revokes on internal SECURITY DEFINER functions
- [2026-07-27] Security: removed SVG logo uploads (public bucket XSS risk); `is_auth_active()` on currencies/app_settings director policies
- [2026-07-27] Frontend: AuthContext `refreshProfile` + loading guard on auth state change; attachment/factory cache invalidation; WBS queries gated by status; activity `canComment` fixed; dead `HomePage` removed
- [2026-07-27] Proposal discussion restricted to company director + factory manager; approval UI restored to director

## Next steps (concrete)

1. Apply new migrations to local/live Supabase and verify end-to-end transitions with each role account
2. Validate unified activity read/write path (`get_project_activity` + `create_comment`) against real role accounts (director/FM/PM)
3. Decide whether transition to `in_progress` should also support an automatic rule (e.g., first in-progress task)
4. Add optional UX confirmation for completion when task readiness checks fail (show RPC error hints)
5. Gather stakeholder feedback on the new dashboard widgets/charts and tune thresholds if needed (e.g., deadline horizon)

## Open questions

- Hosting target (Vercel vs Netlify)
