# Active context

## Current focus

**Codebase audit & migration consolidation** — security hardening, integration fixes, merged DB migrations.

## Recent changes

- [2026-07-27] UX terminology update: renamed user-facing "Escalations" labels to "Critical alerts" / "التنبيهات الحرجة" across nav, dashboard, actions, dialog copy, and validation messages (no logic/schema changes)
- [2026-07-27] Consolidated 12 migrations → 8: merged `handle_new_user` patches, FM profile policy, `revoke_user_sessions` fix; moved `grant_api_privileges` last with explicit revokes on internal SECURITY DEFINER functions
- [2026-07-27] Security: removed SVG logo uploads (public bucket XSS risk); `is_auth_active()` on currencies/app_settings director policies
- [2026-07-27] Frontend: AuthContext `refreshProfile` + loading guard on auth state change; attachment/factory cache invalidation; WBS queries gated by status; activity `canComment` fixed; dead `HomePage` removed
- [2026-07-27] Proposal discussion restricted to company director + factory manager; approval UI restored to director

## Next steps (concrete)

1. Run `npm run supabase:reset` locally to apply consolidated migrations (requires Docker)
2. Fill `.env.staging.local` / `.env.production.local` with remote Supabase keys
3. Apply migrations + deploy `manage-account` Edge Function to live Supabase; verify RLS

## Open questions

- Hosting target (Vercel vs Netlify)
