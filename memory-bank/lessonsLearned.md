# Lessons learned

Append-only. Format: `YYYY-MM-DD — Lesson`

## Entries

- 2026-07-22 — Prefer focused `.cursor/rules/*.mdc` files over a large always-on `.cursorrules`; omit chat ceremony (status prefixes, per-tool confidence scores) that burns tokens without improving code quality.
- 2026-07-22 — Microsoft Edge Tools JSON schema for `tsconfig` is case-sensitive on `module` (`NodeNext` vs `nodenext`); TypeScript itself accepts both.
- 2026-07-22 — shadcn CLI needs `@/*` paths on the **root** `tsconfig.json` (not only `tsconfig.app.json`) or init fails with “Could not load the workspace config”.
- 2026-07-22 — Supabase seed must disable `on_auth_user_created` when inserting factory-scoped roles: the trigger omits `factory_id`, violating `profiles_factory_required_for_factory_roles`.
- 2026-07-23 — Do not `ALTER TABLE auth.users … TRIGGER` in seed: seed role is not table owner (`must be owner of table users`). Prefer `raw_app_meta_data` with `role` + `factory_id` so hardened `handle_new_user` creates profiles; set `is_active` via UPDATE after.
- 2026-07-23 — PostgreSQL `language sql` functions validate relations at create time — define RLS helpers after the tables they reference (`profiles`, `projects`).
- 2026-07-23 — On Windows, `bind: access … forbidden` on `54322` often means Hyper-V excluded port ranges, not a running container; `net stop/start winnat` (admin) can free the range.
- 2026-07-26 — `[auth.email] enable_signup = false` disables email/password _login_ (error: "Email logins are disabled"), not only signup. Keep `[auth] enable_signup = false` to block new accounts; leave `[auth.email] enable_signup = true` so seeded users can sign in.
- 2026-07-26 — Supabase/Postgres can leave API roles with only `Dxtm` on new tables (no `arwd`). Without explicit `GRANT SELECT, INSERT, UPDATE, DELETE` to `anon`/`authenticated`, Auth login succeeds but profile fetch returns 42501 and the SPA shows "Unable to sign in". RLS alone is not enough.
