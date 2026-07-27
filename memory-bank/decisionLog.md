# Decision log

Append-only. Format: `YYYY-MM-DD — Summary — Rationale / implications`

## Entries

- 2026-07-27 — Proposal approval is owned by the **assigned project manager** (not company director). Supporting files live in private Storage bucket `project-attachments` + `project_attachments` rows; signed URLs for download. Proposed status requires `assigned_pm_id` (DB check). Director retains ALL RLS for oversight but UI review actions are PM-only.
- 2026-07-26 — Account provisioning via `manage-account` Edge Function (service role) + SPA Accounts UI — directors create FM/PM; factory managers create PM for their factory; password reset calls `revoke_user_sessions`. Auth Admin `app_metadata` custom keys are unreliable on insert — `handle_new_user` also reads `user_metadata.user_role` / `factory_id`.
- 2026-07-26 — App chrome follows Linear/Notion patterns: soft sidebar active state, user block + sign-out as menu rows (not outline CTA), single `PageHeader` + `app-panel` surface for list chrome, utilities in top bar end.
- 2026-07-26 — App chrome uses shadcn `Sidebar` (`collapsible="icon"`) instead of a top nav bar — more space for content, persists collapse via cookie, RTL `side="right"`, mobile Sheet; brand stays in `SidebarHeader`.
- 2026-07-26 — Local auth: keep `[auth] enable_signup = false` (no public registration) and `[auth.email] enable_signup = true` so email/password login works for provisioned/seeded users. GoTrue treats the email flag as “email provider enabled,” not signup-only.
- 2026-07-26 — Always `GRANT` table CRUD to `anon`/`authenticated`/`service_role` in migrations (plus default privileges). RLS policies assume those role grants exist; missing grants break login after Auth succeeds.

- 2026-07-22 — Memory Bank as `memory-bank/` + `.cursor/rules/*.mdc` instead of a monolithic `.cursorrules` — keeps always-on context small and splits concerns for token efficiency.
- 2026-07-22 — React SPA path for v1 (not Flutter Web) — matches existing `factory-pms` scaffold and PRD React option.
- 2026-07-22 — Rejected porting `typedSelect`, demo credentials, `cursor-tools`, and custom mode-collaboration YAML — not present here and would conflict with security / React Compiler guidance / Cursor built-in modes.
- 2026-07-22 — Adopted TanStack Query + shadcn/ui (radix-nova) + RHF/zod/date-fns as the app dependency baseline from the Notion PRD tech stack.
- 2026-07-22 — App branding in `app_settings` + Supabase Storage (`app-assets`) — directors edit via `/settings`; all users read for header/login; defaults in `DEFAULT_APP_SETTINGS` when DB unavailable.
- 2026-07-22 — FT-01 account provisioning via Supabase Auth dashboard + director edits `profiles` (no service-role signup from SPA).
- 2026-07-22 — Lightweight custom i18n (`LocaleContext` + locale JSON) instead of react-i18next — small bundle, full control over RTL and typed keys; validation messages remain English until schema factories are added.
- 2026-07-22 — Server-side progress via PostgreSQL trigger + RPCs for dashboard/activity — atomic progress updates, fewer client round-trips, RLS-scoped reads via `security invoker` on RPCs.
- 2026-07-22 — Shared list/mutation helpers (`list-filters`, `toastMutationError`, `formatFactoryLabel`) over a generic `PaginatedListPage` — incremental DRY without a high-risk layout abstraction; i18n labels live in locale files only.
- 2026-07-22 — `types/joins.ts` as canonical join-type layer with `fetchPaginatedList` + `joinMappers` — typed selects documented in one place until `supabase gen types` supports nested relations; hooks import from joins instead of inline casts.
- 2026-07-23 — Local seed provisions Auth users with `app_metadata` and lets `on_auth_user_created` create profiles — avoids ownership errors on `auth.users` and matches production provisioning path.
