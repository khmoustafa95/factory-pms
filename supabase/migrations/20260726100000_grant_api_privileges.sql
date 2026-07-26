-- PostgREST roles need table CRUD privileges; RLS still enforces row access.
-- Without these grants, authenticated clients get 42501 (permission denied)
-- even when RLS policies would allow the row (e.g. login profile fetch).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions
  to anon, authenticated, service_role;
