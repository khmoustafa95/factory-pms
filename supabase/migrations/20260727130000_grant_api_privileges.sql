-- PostgREST roles need table CRUD privileges; RLS still enforces row access.
-- Run last so selective revokes on SECURITY DEFINER internals are not undone.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant select on public.app_settings to anon;
grant select on public.currencies to anon;

grant usage, select on all sequences in schema public
  to authenticated, service_role;

grant execute on all functions in schema public
  to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables
  to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences
  to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions
  to authenticated, service_role;

-- Internal SECURITY DEFINER helpers must not be callable from the SPA.
revoke execute on function public.recalculate_project_progress(uuid)
  from anon, authenticated;
revoke execute on function public.tasks_recalculate_progress()
  from anon, authenticated;
revoke execute on function public.phases_recalculate_progress()
  from anon, authenticated;
revoke execute on function public.revoke_user_sessions(uuid)
  from anon, authenticated, public;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
