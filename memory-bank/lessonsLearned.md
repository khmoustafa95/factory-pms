# Lessons learned

Append-only. Format: `YYYY-MM-DD — Lesson`

## Entries

- 2026-07-28 — If a mutation moves from direct table insert to RPC, update every caller payload immediately (e.g., remove legacy fields like `authorId`) or TypeScript catches stale contract usage in unrelated pages.
- 2026-07-28 — When evolving an existing RPC into a union feed, keep legacy comment fields and add a minimal discriminator (`activity_kind`) plus nullable transition fields; this minimizes frontend churn while enabling richer timeline items.
- 2026-07-28 — For audit feeds under strict RLS, avoid client-side secondary profile lookups for actor names; denormalize `changed_by_name` and `changed_by_role` at write time to keep reads reliable across roles.
- 2026-07-28 — Adding a new Supabase RPC requires updating `src/types/database.ts` immediately (or regenerating types) before switching frontend hooks to `.rpc(...)`; otherwise TypeScript infers the wrong RPC overloads and breaks downstream typing.
- 2026-07-27 — Adding a CHECK that proposed projects require `assigned_pm_id` fails if existing seed/data has proposed rows without a PM — backfill in the same migration before `ADD CONSTRAINT`.
- 2026-07-26 — Supabase Realtime: `supabase.channel(sameTopic)` reuses the channel; calling `.on()` after `.subscribe()` throws and can take down the React tree via Error Boundary. Always use a unique channel name per effect instance (e.g. UUID suffix), and avoid duplicate hooks on the same topic in parent+child.
- 2026-07-26 — Supabase Admin `createUser` often does not expose custom `app_metadata` keys to `on_auth_user_created`; put `user_role` + `factory_id` in `user_metadata` (and mirror into `app_metadata` after create). Do not use `auth.admin.signOut(userId)` — it expects a JWT; revoke via SQL on `auth.sessions` / `auth.refresh_tokens` (`refresh_tokens.user_id` is `varchar`).
- 2026-07-26 — shadcn `add` may prompt to overwrite shared UI (`button`, `input`, `separator`) even with `--yes`; extract new files via `--view` / dry-run instead of overwriting. Prefer `useSyncExternalStore` for `useIsMobile` — `setState` inside `useEffect` fails `react-hooks/set-state-in-effect`.
- 2026-07-22 — Prefer focused `.cursor/rules/*.mdc` files over a large always-on `.cursorrules`; omit chat ceremony (status prefixes, per-tool confidence scores) that burns tokens without improving code quality.
- 2026-07-22 — Microsoft Edge Tools JSON schema for `tsconfig` is case-sensitive on `module` (`NodeNext` vs `nodenext`); TypeScript itself accepts both.
- 2026-07-22 — shadcn CLI needs `@/*` paths on the **root** `tsconfig.json` (not only `tsconfig.app.json`) or init fails with “Could not load the workspace config”.
- 2026-07-22 — Supabase seed must disable `on_auth_user_created` when inserting factory-scoped roles: the trigger omits `factory_id`, violating `profiles_factory_required_for_factory_roles`.
- 2026-07-23 — Do not `ALTER TABLE auth.users … TRIGGER` in seed: seed role is not table owner (`must be owner of table users`). Prefer `raw_app_meta_data` with `role` + `factory_id` so hardened `handle_new_user` creates profiles; set `is_active` via UPDATE after.
- 2026-07-23 — PostgreSQL `language sql` functions validate relations at create time — define RLS helpers after the tables they reference (`profiles`, `projects`).
- 2026-07-23 — On Windows, `bind: access … forbidden` on `54322` often means Hyper-V excluded port ranges, not a running container; `net stop/start winnat` (admin) can free the range.
- 2026-07-26 — `[auth.email] enable_signup = false` disables email/password _login_ (error: "Email logins are disabled"), not only signup. Keep `[auth] enable_signup = false` to block new accounts; leave `[auth.email] enable_signup = true` so seeded users can sign in.
- 2026-07-26 — Supabase/Postgres can leave API roles with only `Dxtm` on new tables (no `arwd`). Without explicit `GRANT SELECT, INSERT, UPDATE, DELETE` to `anon`/`authenticated`, Auth login succeeds but profile fetch returns 42501 and the SPA shows "Unable to sign in". RLS alone is not enough.
