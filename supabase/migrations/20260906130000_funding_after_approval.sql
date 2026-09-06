-- Incoming funding is recorded after approval, not during the proposal.

create or replace function public.can_write_project_funding(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status in ('approved', 'in_progress', 'paused')
        and (
          public.is_company_director()
          or (
            public.get_auth_role() = 'factory_manager'
            and p.factory_id = public.get_auth_factory_id()
          )
        )
    );
$$;
