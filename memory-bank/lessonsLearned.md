# Lessons learned

Append-only. Format: `YYYY-MM-DD — Lesson`

## Entries

- 2026-07-22 — Prefer focused `.cursor/rules/*.mdc` files over a large always-on `.cursorrules`; omit chat ceremony (status prefixes, per-tool confidence scores) that burns tokens without improving code quality.
- 2026-07-22 — Microsoft Edge Tools JSON schema for `tsconfig` is case-sensitive on `module` (`NodeNext` vs `nodenext`); TypeScript itself accepts both.
- 2026-07-22 — shadcn CLI needs `@/*` paths on the **root** `tsconfig.json` (not only `tsconfig.app.json`) or init fails with “Could not load the workspace config”.
- 2026-07-22 — Supabase seed must disable `on_auth_user_created` when inserting factory-scoped roles: the trigger omits `factory_id`, violating `profiles_factory_required_for_factory_roles`.
