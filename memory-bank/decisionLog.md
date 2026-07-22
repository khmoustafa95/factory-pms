# Decision log

Append-only. Format: `YYYY-MM-DD — Summary — Rationale / implications`

## Entries

- 2026-07-22 — Memory Bank as `memory-bank/` + `.cursor/rules/*.mdc` instead of a monolithic `.cursorrules` — keeps always-on context small and splits concerns for token efficiency.
- 2026-07-22 — React SPA path for v1 (not Flutter Web) — matches existing `factory-pms` scaffold and PRD React option.
- 2026-07-22 — Rejected porting `typedSelect`, demo credentials, `cursor-tools`, and custom mode-collaboration YAML — not present here and would conflict with security / React Compiler guidance / Cursor built-in modes.
- 2026-07-22 — Adopted TanStack Query + shadcn/ui (radix-nova) + RHF/zod/date-fns as the app dependency baseline from the Notion PRD tech stack.
- 2026-07-22 — Hand-authored `database.ts` types from migration SQL (regenerate via `supabase gen types` once project is linked).
- 2026-07-22 — FT-01 account provisioning via Supabase Auth dashboard + director edits `profiles` (no service-role signup from SPA).
