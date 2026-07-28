-- Tighten RLS to align with transition RPC governance.

-- ---------------------------------------------------------------------------
-- Projects: PM direct updates should not include proposal review states
-- ---------------------------------------------------------------------------

drop policy if exists "PMs update assigned projects" on public.projects;
drop policy if exists "PMs update assigned in-progress projects" on public.projects;

create policy "PMs update assigned execution projects"
  on public.projects for update
  using (
    public.is_auth_active()
    and public.is_assigned_pm(id)
    and status in ('approved', 'in_progress', 'paused')
  )
  with check (
    public.is_auth_active()
    and public.is_assigned_pm(id)
    and status in ('approved', 'in_progress', 'paused')
  );

-- ---------------------------------------------------------------------------
-- Comments: proposal discussion is director <-> factory manager only
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users insert comments on accessible entities" on public.comments;

create policy "Authenticated users insert comments on accessible entities"
  on public.comments for insert
  with check (
    public.is_auth_active()
    and author_id = auth.uid()
    and (
      (
        entity_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = entity_id
            and (
              (
                p.status in ('draft', 'proposed', 'rejected')
                and (
                  public.is_company_director()
                  or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
                )
              )
              or (
                p.status not in ('draft', 'proposed', 'rejected')
                and (
                  public.is_company_director()
                  or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
                  or public.is_assigned_pm(p.id)
                )
              )
            )
        )
      )
      or (
        entity_type = 'phase'
        and exists (
          select 1
          from public.phases ph
          join public.projects p on p.id = ph.project_id
          where ph.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
            )
        )
      )
      or (
        entity_type = 'task'
        and exists (
          select 1
          from public.tasks t
          join public.projects p on p.id = t.project_id
          where t.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
            )
        )
      )
    )
  );

