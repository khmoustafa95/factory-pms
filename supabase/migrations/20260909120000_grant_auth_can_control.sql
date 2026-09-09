-- RLS policies call auth_can_control(); authenticated must be able to execute it.
-- 20260909110000 originally revoked EXECUTE, which blocked director profile SELECT
-- at sign-in (permission denied for function auth_can_control).

revoke all on function public.auth_can_control() from public, anon;
grant execute on function public.auth_can_control() to authenticated, service_role;
