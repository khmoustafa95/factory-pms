-- Security hardening: prevent signup role escalation, enforce active accounts in RLS

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_auth_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Role comes from app_metadata (admin/service-role only), never user_metadata.
-- Factory-scoped roles require factory_id in app_metadata at provision time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_factory_id uuid;
begin
  v_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'role', '')::public.user_role,
    'project_manager'
  );

  v_factory_id := nullif(new.raw_app_meta_data ->> 'factory_id', '')::uuid;

  if v_role = 'company_director' then
    v_factory_id := null;
  elsif v_factory_id is null then
    raise exception 'User provisioning requires factory_id in app_metadata for role %', v_role
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email, full_name, role, factory_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    v_role,
    v_factory_id
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: inactive accounts cannot access app data (own profile read remains allowed)
-- ---------------------------------------------------------------------------

drop policy if exists "Directors manage all factories" on public.factories;
create policy "Directors manage all factories"
  on public.factories for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

drop policy if exists "Users read accessible factories" on public.factories;
create policy "Users read accessible factories"
  on public.factories for select
  using (
    public.is_auth_active()
    and (
      public.is_company_director()
      or id = public.get_auth_factory_id()
    )
  );

drop policy if exists "Directors read all profiles" on public.profiles;
create policy "Directors read all profiles"
  on public.profiles for select
  using (public.is_company_director() and public.is_auth_active());

drop policy if exists "Factory managers read factory profiles" on public.profiles;
create policy "Factory managers read factory profiles"
  on public.profiles for select
  using (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

drop policy if exists "Users update own profile name" on public.profiles;
create policy "Users update own profile name"
  on public.profiles for update
  using (id = auth.uid() and public.is_auth_active())
  with check (
    id = auth.uid()
    and public.is_auth_active()
    and role = (select role from public.profiles where id = auth.uid())
    and factory_id is not distinct from (select factory_id from public.profiles where id = auth.uid())
  );

drop policy if exists "Directors manage profiles" on public.profiles;
create policy "Directors manage profiles"
  on public.profiles for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

drop policy if exists "Directors access all projects" on public.projects;
create policy "Directors access all projects"
  on public.projects for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

drop policy if exists "Factory managers access own factory projects" on public.projects;
create policy "Factory managers access own factory projects"
  on public.projects for all
  using (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  )
  with check (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

drop policy if exists "PMs read assigned projects" on public.projects;
create policy "PMs read assigned projects"
  on public.projects for select
  using (public.is_auth_active() and public.is_assigned_pm(id));

drop policy if exists "PMs update assigned in-progress projects" on public.projects;
create policy "PMs update assigned in-progress projects"
  on public.projects for update
  using (
    public.is_auth_active()
    and public.is_assigned_pm(id)
    and status in ('approved', 'in_progress', 'paused')
  )
  with check (public.is_auth_active() and public.is_assigned_pm(id));

drop policy if exists "Directors manage all phases" on public.phases;
create policy "Directors manage all phases"
  on public.phases for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

drop policy if exists "Factory managers manage factory phases" on public.phases;
create policy "Factory managers manage factory phases"
  on public.phases for all
  using (
    public.is_auth_active()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

drop policy if exists "PMs manage assigned project phases" on public.phases;
create policy "PMs manage assigned project phases"
  on public.phases for all
  using (public.is_auth_active() and public.is_assigned_pm(project_id))
  with check (public.is_auth_active() and public.is_assigned_pm(project_id));

drop policy if exists "Directors manage all tasks" on public.tasks;
create policy "Directors manage all tasks"
  on public.tasks for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

drop policy if exists "Factory managers manage factory tasks" on public.tasks;
create policy "Factory managers manage factory tasks"
  on public.tasks for all
  using (
    public.is_auth_active()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

drop policy if exists "PMs manage assigned project tasks" on public.tasks;
create policy "PMs manage assigned project tasks"
  on public.tasks for all
  using (public.is_auth_active() and public.is_assigned_pm(project_id))
  with check (public.is_auth_active() and public.is_assigned_pm(project_id));

drop policy if exists "Directors manage all comments" on public.comments;
create policy "Directors manage all comments"
  on public.comments for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

drop policy if exists "Authenticated users read comments on accessible entities" on public.comments;
create policy "Authenticated users read comments on accessible entities"
  on public.comments for select
  using (
    public.is_auth_active()
    and (
      (
        entity_type = 'project'
        and exists (
          select 1 from public.projects p
          where p.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
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
          select 1 from public.projects p
          where p.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
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

drop policy if exists "Authors update own comments" on public.comments;
create policy "Authors update own comments"
  on public.comments for update
  using (public.is_auth_active() and author_id = auth.uid())
  with check (public.is_auth_active() and author_id = auth.uid());

drop policy if exists "Authors delete own comments" on public.comments;
create policy "Authors delete own comments"
  on public.comments for delete
  using (public.is_auth_active() and author_id = auth.uid());
