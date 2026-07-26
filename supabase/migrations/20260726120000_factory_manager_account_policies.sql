-- Allow factory managers to update project-manager profiles in their factory.
-- Account creation / password reset go through the manage-account Edge Function
-- (service role); this policy covers name / is_active edits from the SPA.

drop policy if exists "Factory managers manage factory project managers"
  on public.profiles;

create policy "Factory managers manage factory project managers"
  on public.profiles for update
  using (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and role = 'project_manager'
    and factory_id = public.get_auth_factory_id()
  )
  with check (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and role = 'project_manager'
    and factory_id = public.get_auth_factory_id()
  );
