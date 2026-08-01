# Active context

## Current focus

**Field tracking for phases/tasks** — planned vs actual duration/cost, weighted task progress, schedule/financial deviations with justifications, problems/solutions (Excel parity).

## Recent changes

- [2026-08-01] Migration `20260801140000_phase_field_tracking.sql`: task `weight_percent` / `progress_percent` / duration / cost / `cost_category`; phase `expected_budget` / `actual_end_date` / deviation reasons / problem+solution; progress formula uses weighted task progress; phase completion sets `actual_end_date`
- [2026-08-01] Frontend: `phase-metrics.ts`, updated `progress.ts`, Phase/Task form dialogs, WBS metrics cards, field-health badge on progress overview; seed updated; i18n ar/en
- [2026-08-01] Task weight DB constraint: reject sum **> 100%** only (exact 100% enforced in UI like phase weights) so single-row edits remain possible

- [2026-07-28] Proposal duration UX: project form now uses numeric duration + unit (day/week/year) instead of manual start/end dates; execution start sets `actual_start_date`/`actual_end_date` from duration via `transition_project_status`
- [2026-07-28] Phase scheduling: added `start_date`/`end_date` on phases with DB + frontend validation against project window; phase status auto-syncs from task progress (removed manual status editing)
- [2026-07-28] Task due dates validated against phase schedule (frontend + DB trigger)
- [2026-07-28] Project timeline rebuilt as date-positioned Gantt bars with today marker
- [2026-07-28] Login page: `DemoAccountsDialog` shows trial credentials + copy actions (`demo123456`)
- [2026-07-28] Migration `20260728130000_duration_and_phase_dates.sql` + seed updates for duration/phase dates

## Next steps (concrete)

1. Apply migration locally: `npm run supabase:reset` (or `db push --local`) and verify seed WBS metrics + progress
2. Smoke-test: edit phase with cost overrun → financial reason required; add tasks with weights summing to 100%; confirm project progress rolls up
3. Optional later: `project_code`, deviation history table, Excel import

## Open questions

- Hosting target (Vercel vs Netlify)
