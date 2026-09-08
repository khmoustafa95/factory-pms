-- PM is assigned after approval; proposed/consultation must not require assigned_pm_id.
alter table public.projects
  drop constraint if exists projects_proposed_requires_pm;
