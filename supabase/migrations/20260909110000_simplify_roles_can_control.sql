-- Drop project-manager write paths. Factory managers own tasks.
-- Add profiles.can_control so company/factory viewers stay read-only.

-- ---------------------------------------------------------------------------
-- Column + helper
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists can_control boolean not null default true;

comment on column public.profiles.can_control is
  'When false, the user may only view statistics in their role scope.';

update public.profiles
set
  role = 'factory_manager',
  can_control = true
where role = 'project_manager';

create or replace function public.auth_can_control()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.can_control
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active
    ),
    false
  );
$$;

revoke all on function public.auth_can_control() from public, anon;
grant execute on function public.auth_can_control() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Provisioning: default factory_manager; persist can_control from metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_text text;
  v_role public.user_role;
  v_factory_id uuid;
  v_can_control boolean;
begin
  v_role_text := coalesce(
    nullif(new.raw_app_meta_data ->> 'user_role', ''),
    nullif(new.raw_user_meta_data ->> 'user_role', ''),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    case
      when (new.raw_app_meta_data ->> 'role') in (
        'company_director',
        'factory_manager',
        'project_manager'
      ) then new.raw_app_meta_data ->> 'role'
      else null
    end,
    'factory_manager'
  );

  if v_role_text = 'project_manager' then
    v_role := 'factory_manager';
  elsif v_role_text not in ('company_director', 'factory_manager') then
    v_role := 'factory_manager';
  else
    v_role := v_role_text::public.user_role;
  end if;

  v_factory_id := coalesce(
    nullif(new.raw_app_meta_data ->> 'factory_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'factory_id', '')::uuid
  );

  v_can_control := coalesce(
    (new.raw_app_meta_data ->> 'can_control')::boolean,
    (new.raw_user_meta_data ->> 'can_control')::boolean,
    true
  );

  if v_role = 'company_director' then
    v_factory_id := null;
  elsif v_factory_id is null then
    raise exception 'User provisioning requires factory_id in metadata for role %', v_role
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email, full_name, role, factory_id, can_control)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    v_role,
    v_factory_id,
    v_can_control
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Write helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and (
      public.is_company_director()
      or exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and public.get_auth_role() = 'factory_manager'
          and p.factory_id = public.get_auth_factory_id()
      )
    );
$$;

create or replace function public.can_govern_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and public.auth_can_control()
    and (
      public.is_company_director()
      or exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and public.get_auth_role() = 'factory_manager'
          and p.factory_id = public.get_auth_factory_id()
      )
    );
$$;

create or replace function public.can_manage_project_phases(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and public.auth_can_control()
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status in ('approved', 'in_progress', 'paused')
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    );
$$;

create or replace function public.can_manage_project_tasks(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_project_phases(p_project_id);
$$;

create or replace function public.can_write_project_funding(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and public.auth_can_control()
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

create or replace function public.can_write_project_operations(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and public.auth_can_control()
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status in ('approved', 'in_progress', 'paused')
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    );
$$;

-- ---------------------------------------------------------------------------
-- Write policies: viewers keep SELECT via existing read policies
-- ---------------------------------------------------------------------------

drop policy if exists "Directors manage all factories" on public.factories;
create policy "Directors manage all factories"
  on public.factories for all
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Directors manage profiles" on public.profiles;
create policy "Directors manage profiles"
  on public.profiles for all
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Factory managers manage factory project managers"
  on public.profiles;

drop policy if exists "Users update own profile name" on public.profiles;
create policy "Users update own profile name"
  on public.profiles for update
  using (id = auth.uid() and public.is_auth_active())
  with check (
    id = auth.uid()
    and public.is_auth_active()
    and role = (select role from public.profiles where id = auth.uid())
    and factory_id is not distinct from (
      select factory_id from public.profiles where id = auth.uid()
    )
    and can_control is not distinct from (
      select can_control from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "Directors insert projects" on public.projects;
create policy "Directors insert projects"
  on public.projects for insert
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Directors update all projects" on public.projects;
create policy "Directors update all projects"
  on public.projects for update
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Directors delete rejected projects" on public.projects;
create policy "Directors delete rejected projects"
  on public.projects for delete
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
    and status = 'rejected'
  );

drop policy if exists "Factory managers insert own factory projects" on public.projects;
create policy "Factory managers insert own factory projects"
  on public.projects for insert
  with check (
    public.is_auth_active()
    and public.auth_can_control()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

drop policy if exists "Factory managers update own factory projects" on public.projects;
create policy "Factory managers update own factory projects"
  on public.projects for update
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  )
  with check (
    public.is_auth_active()
    and public.auth_can_control()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

drop policy if exists "Factory managers delete draft or rejected projects"
  on public.projects;
create policy "Factory managers delete draft or rejected projects"
  on public.projects for delete
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
    and status in ('draft', 'rejected')
  );

drop policy if exists "PMs update assigned projects" on public.projects;
drop policy if exists "PMs read assigned projects" on public.projects;
drop policy if exists "PMs update assigned execution projects" on public.projects;

drop policy if exists "currencies_insert" on public.currencies;
create policy "currencies_insert" on public.currencies
  for insert to authenticated
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "currencies_update" on public.currencies;
create policy "currencies_update" on public.currencies
  for update to authenticated
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "currencies_delete" on public.currencies;
create policy "currencies_delete" on public.currencies
  for delete to authenticated
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Company directors can update app settings" on public.app_settings;
create policy "Company directors can update app settings"
  on public.app_settings for update
  using (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Authenticated users insert comments on accessible entities"
  on public.comments;
create policy "Authenticated users insert comments on accessible entities"
  on public.comments for insert
  with check (
    public.is_auth_active()
    and public.auth_can_control()
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
                p.status in ('draft', 'consultation', 'proposed', 'rejected')
                and (
                  public.is_company_director()
                  or (
                    public.get_auth_role() = 'factory_manager'
                    and p.factory_id = public.get_auth_factory_id()
                  )
                )
              )
              or (
                p.status not in ('draft', 'consultation', 'proposed', 'rejected')
                and public.can_access_project(p.id)
              )
            )
        )
      )
      or (
        entity_type = 'phase'
        and exists (
          select 1
          from public.phases ph
          where ph.id = entity_id
            and public.can_access_project(ph.project_id)
        )
      )
      or (
        entity_type = 'task'
        and exists (
          select 1
          from public.tasks t
          where t.id = entity_id
            and public.can_access_project(t.project_id)
        )
      )
    )
  );

drop policy if exists "Authors update own comments" on public.comments;
create policy "Authors update own comments"
  on public.comments for update
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and author_id = auth.uid()
  );

drop policy if exists "Authors delete own comments" on public.comments;
create policy "Authors delete own comments"
  on public.comments for delete
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and author_id = auth.uid()
  );

drop policy if exists "Factory managers insert factory project attachments"
  on public.project_attachments;
create policy "Factory managers insert factory project attachments"
  on public.project_attachments for insert
  with check (
    public.is_auth_active()
    and public.auth_can_control()
    and uploaded_by = auth.uid()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
        and p.status in (
          'draft',
          'consultation',
          'proposed',
          'rejected',
          'approved',
          'in_progress',
          'paused'
        )
    )
  );

drop policy if exists "Directors insert project attachments" on public.project_attachments;
create policy "Directors insert project attachments"
  on public.project_attachments for insert
  with check (
    public.is_auth_active()
    and public.auth_can_control()
    and public.is_company_director()
    and uploaded_by = auth.uid()
  );

drop policy if exists "Factory managers delete factory project attachments"
  on public.project_attachments;
create policy "Factory managers delete factory project attachments"
  on public.project_attachments for delete
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    )
  );

drop policy if exists "Directors delete project attachments" on public.project_attachments;
create policy "Directors delete project attachments"
  on public.project_attachments for delete
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and public.is_company_director()
  );

drop policy if exists "Uploaders delete own attachments" on public.project_attachments;
create policy "Uploaders delete own attachments"
  on public.project_attachments for delete
  using (
    public.is_auth_active()
    and public.auth_can_control()
    and uploaded_by = auth.uid()
  );

drop policy if exists "Factory managers upload project attachment files"
  on storage.objects;
create policy "Factory managers upload project attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and public.auth_can_control()
    and exists (
      select 1
      from public.projects p
      where p.id = (storage.foldername(name))[1]::uuid
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    )
  );

drop policy if exists "Directors upload project attachment files" on storage.objects;
create policy "Directors upload project attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and public.auth_can_control()
    and public.is_company_director()
  );

drop policy if exists "Factory managers delete project attachment files"
  on storage.objects;
create policy "Factory managers delete project attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and public.auth_can_control()
    and exists (
      select 1
      from public.projects p
      where p.id = (storage.foldername(name))[1]::uuid
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    )
  );

drop policy if exists "Directors delete project attachment files" on storage.objects;
create policy "Directors delete project attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and public.auth_can_control()
    and public.is_company_director()
  );

drop policy if exists "Company directors can upload app assets" on storage.objects;
create policy "Company directors can upload app assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'app-assets'
    and public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Company directors can update app assets" on storage.objects;
create policy "Company directors can update app assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'app-assets'
    and public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  )
  with check (
    bucket_id = 'app-assets'
    and public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

drop policy if exists "Company directors can delete app assets" on storage.objects;
create policy "Company directors can delete app assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'app-assets'
    and public.is_company_director()
    and public.is_auth_active()
    and public.auth_can_control()
  );

-- ---------------------------------------------------------------------------
-- No PM to notify when phases become ready
-- ---------------------------------------------------------------------------

drop trigger if exists trg_notify_on_phases_ready on public.phases;
drop function if exists public.notify_on_phases_ready();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

drop function if exists public.reassign_project_pm(uuid, uuid, text);

create or replace function public.transition_project_status(
  p_project_id uuid,
  p_target_status public.project_status,
  p_reason text default null
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_user_id uuid;
  v_user_name text;
  v_project public.projects%rowtype;
  v_project_role_ok boolean;
  v_from_status public.project_status;
  v_duration_days integer;
  v_payload jsonb;
  v_link text;
  v_notif_type text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active() then
    raise exception 'Inactive account' using errcode = '42501';
  end if;

  if not public.auth_can_control() then
    raise exception 'View-only account cannot change project status'
      using errcode = '42501';
  end if;

  select p.*
  into v_project
  from public.projects p
  where p.id = p_project_id;

  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  select role, full_name into v_role, v_user_name from public.profiles where id = v_user_id;

  v_project_role_ok := (
    public.is_company_director()
    or (v_role = 'factory_manager' and v_project.factory_id = public.get_auth_factory_id())
  );

  if not v_project_role_ok then
    raise exception 'You are not allowed to transition this project' using errcode = '42501';
  end if;

  if v_project.status = p_target_status then
    return v_project;
  end if;

  if v_project.status = 'draft' and p_target_status = 'consultation' then
    if v_role <> 'factory_manager' then
      raise exception 'Only factory manager can submit draft proposal' using errcode = '42501';
    end if;

    if v_project.code is null or length(trim(v_project.code)) = 0 then
      raise exception 'Project code is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.budget is null or v_project.budget <= 0 then
      raise exception 'Project budget is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.proposed_duration_value is null
      or v_project.proposed_duration_unit is null
    then
      raise exception 'Project duration is required before submitting proposal' using errcode = '23514';
    end if;
    if coalesce(length(trim(v_project.description)), 0) < 3 then
      raise exception 'Project description is required before submitting proposal'
        using errcode = '23514';
    end if;

  elsif v_project.status = 'rejected' and p_target_status = 'consultation' then
    if v_role <> 'factory_manager' then
      raise exception 'Only factory manager can resubmit rejected proposal' using errcode = '42501';
    end if;

    if v_project.code is null or length(trim(v_project.code)) = 0 then
      raise exception 'Project code is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.budget is null or v_project.budget <= 0 then
      raise exception 'Project budget is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.proposed_duration_value is null
      or v_project.proposed_duration_unit is null
    then
      raise exception 'Project duration is required before submitting proposal' using errcode = '23514';
    end if;
    if coalesce(length(trim(v_project.description)), 0) < 3 then
      raise exception 'Project description is required before submitting proposal'
        using errcode = '23514';
    end if;

  elsif v_project.status = 'consultation' and p_target_status = 'proposed' then
    if v_role <> 'company_director' then
      raise exception 'Only company director can complete consultation' using errcode = '42501';
    end if;
    if coalesce(length(trim(v_project.research_opinion)), 0) < 3 then
      raise exception 'Research opinion is required before completing consultation'
        using errcode = '23514';
    end if;
    if coalesce(length(trim(v_project.board_opinion)), 0) < 3 then
      raise exception 'Board opinion is required before completing consultation'
        using errcode = '23514';
    end if;

  elsif v_project.status = 'proposed' and p_target_status = 'approved' then
    if v_role <> 'company_director' then
      raise exception 'Only company director can approve proposal' using errcode = '42501';
    end if;

  elsif v_project.status = 'proposed' and p_target_status = 'rejected' then
    if v_role <> 'company_director' then
      raise exception 'Only company director can reject proposal' using errcode = '42501';
    end if;
    if coalesce(length(trim(p_reason)), 0) < 3 then
      raise exception 'Rejection reason must be at least 3 characters' using errcode = '23514';
    end if;

  elsif v_project.status = 'approved' and p_target_status = 'in_progress' then
    if v_role <> 'factory_manager'
      or v_project.factory_id is distinct from public.get_auth_factory_id()
    then
      raise exception 'Only the factory manager can start project execution'
        using errcode = '42501';
    end if;

    if v_project.proposed_start_date is null or v_project.proposed_end_date is null then
      raise exception 'Project schedule is required before starting execution' using errcode = '23514';
    end if;

    v_duration_days := public.project_duration_days(v_project);
    if v_duration_days is null then
      raise exception 'Project duration is required before starting execution' using errcode = '23514';
    end if;

    if not public.project_execution_ready(v_project) then
      raise exception 'Project WBS is not ready: phases must total 100%% weight and 100%% budget with valid dates'
        using errcode = '23514';
    end if;

  elsif v_project.status = 'in_progress' and p_target_status = 'paused' then
    if not public.can_govern_project(v_project.id) then
      raise exception 'Only factory manager or company director can pause execution'
        using errcode = '42501';
    end if;
    if coalesce(length(trim(p_reason)), 0) < 3 then
      raise exception 'Pause reason must be at least 3 characters' using errcode = '23514';
    end if;

  elsif v_project.status = 'paused' and p_target_status = 'in_progress' then
    if not public.can_govern_project(v_project.id) then
      raise exception 'Only factory manager or company director can resume execution'
        using errcode = '42501';
    end if;

  elsif v_project.status in ('in_progress', 'paused') and p_target_status = 'completed' then
    if v_role <> 'company_director' then
      raise exception 'Only company director can complete project execution'
        using errcode = '42501';
    end if;
    if exists (
      select 1
      from public.tasks t
      where t.project_id = v_project.id
        and t.status <> 'done'
    ) then
      raise exception 'All tasks must be done before marking project completed' using errcode = '23514';
    end if;

  else
    raise exception 'Invalid status transition: % -> %', v_project.status, p_target_status
      using errcode = '23514';
  end if;

  v_from_status := v_project.status;
  v_duration_days := public.project_duration_days(v_project);

  perform set_config('app.allow_project_status_transition', '1', true);

  update public.projects
  set
    status = p_target_status,
    proposed_by = case
      when p_target_status = 'consultation' then v_user_id
      else proposed_by
    end,
    approved_by = case
      when p_target_status = 'approved' then v_user_id
      when p_target_status = 'rejected' then null
      else approved_by
    end,
    approved_at = case
      when p_target_status = 'approved' then now()
      when p_target_status = 'rejected' then null
      else approved_at
    end,
    rejection_reason = case
      when p_target_status = 'rejected' then trim(p_reason)
      when p_target_status in ('consultation', 'proposed', 'approved', 'in_progress', 'completed') then null
      else rejection_reason
    end,
    actual_start_date = case
      when p_target_status = 'in_progress'
        and v_from_status = 'approved'
        and actual_start_date is null
        then coalesce(proposed_start_date, current_date)
      else actual_start_date
    end,
    actual_end_date = case
      when p_target_status = 'in_progress'
        and v_from_status = 'approved'
        then coalesce(
          proposed_end_date,
          case
            when v_duration_days is not null
              then coalesce(proposed_start_date, current_date) + (v_duration_days - 1)
            else null
          end
        )
      when p_target_status = 'completed'
        then coalesce(actual_end_date, current_date)
      else actual_end_date
    end,
    completion_requested_at = case
      when p_target_status = 'completed' then null
      else completion_requested_at
    end,
    completion_requested_by = case
      when p_target_status = 'completed' then null
      else completion_requested_by
    end
  where id = v_project.id
  returning * into v_project;

  insert into public.project_status_transitions (
    project_id,
    from_status,
    to_status,
    changed_by,
    changed_by_name,
    changed_by_role,
    reason
  )
  values (
    v_project.id,
    v_from_status,
    v_project.status,
    v_user_id,
    coalesce(v_user_name, 'Unknown user'),
    v_role,
    case
      when p_reason is null then null
      when length(trim(p_reason)) = 0 then null
      else trim(p_reason)
    end
  );

  v_link := coalesce(
    public.project_detail_path(v_project.id),
    '/projects/' || v_project.id::text
  );
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', case
      when p_reason is null then null
      when length(trim(p_reason)) = 0 then null
      else trim(p_reason)
    end
  );

  if v_from_status in ('draft', 'rejected') and v_project.status = 'consultation' then
    perform public.notify_company_directors(
      'project_consultation',
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_from_status = 'consultation' and v_project.status = 'proposed' then
    perform public.notify_factory_managers(
      v_project.factory_id,
      'project_proposed',
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'approved' then
    v_notif_type := 'project_approved';
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'rejected' then
    v_notif_type := 'project_rejected';
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_from_status = 'approved' and v_project.status = 'in_progress' then
    v_notif_type := 'project_started';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'paused' then
    v_notif_type := 'project_paused';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_from_status = 'paused' and v_project.status = 'in_progress' then
    v_notif_type := 'project_resumed';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'completed' then
    v_notif_type := 'project_completed';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
  end if;

  return v_project;
end;
$$;

create or replace function public.request_project_completion(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_role public.user_role;
  v_project public.projects%rowtype;
  v_payload jsonb;
  v_link text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active() then
    raise exception 'Inactive account' using errcode = '42501';
  end if;

  if not public.auth_can_control() then
    raise exception 'View-only account cannot request completion'
      using errcode = '42501';
  end if;

  select * into v_project from public.projects where id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  select role, full_name into v_role, v_user_name from public.profiles where id = v_user_id;

  if v_role <> 'factory_manager'
    or v_project.factory_id is distinct from public.get_auth_factory_id()
  then
    raise exception 'Only the factory manager can request project completion'
      using errcode = '42501';
  end if;

  if v_project.status not in ('in_progress', 'paused') then
    raise exception 'Project must be in progress or paused to request completion'
      using errcode = '23514';
  end if;

  if exists (
    select 1 from public.tasks t
    where t.project_id = v_project.id
      and t.status <> 'done'
  ) then
    raise exception 'All tasks must be done before marking project completed'
      using errcode = '23514';
  end if;

  if v_project.completion_requested_at is not null then
    return v_project;
  end if;

  perform set_config('app.allow_completion_request', '1', true);

  update public.projects
  set
    completion_requested_at = now(),
    completion_requested_by = v_user_id
  where id = v_project.id
  returning * into v_project;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user')
  );

  perform public.notify_company_directors(
    'completion_requested',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_project;
end;
$$;

create or replace function public.request_project_change(
  p_project_id uuid,
  p_change_kind public.change_request_kind,
  p_reason text,
  p_requested_budget numeric default null,
  p_requested_start_date date default null,
  p_requested_end_date date default null
)
returns public.project_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_role public.user_role;
  v_project public.projects%rowtype;
  v_row public.project_change_requests%rowtype;
  v_payload jsonb;
  v_link text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active() then
    raise exception 'Inactive account' using errcode = '42501';
  end if;

  if not public.auth_can_control() then
    raise exception 'View-only account cannot request a project change'
      using errcode = '42501';
  end if;

  select * into v_project from public.projects where id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if v_project.status not in ('approved', 'in_progress', 'paused') then
    raise exception 'Change requests are only allowed after approval'
      using errcode = '23514';
  end if;

  select role, full_name into v_role, v_user_name from public.profiles where id = v_user_id;

  if not (
    v_role = 'factory_manager'
    and v_project.factory_id = public.get_auth_factory_id()
  ) then
    raise exception 'You are not allowed to request a project change'
      using errcode = '42501';
  end if;

  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Change request reason must be at least 3 characters'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.project_change_requests r
    where r.project_id = v_project.id
      and r.change_kind = p_change_kind
      and r.status = 'pending'
  ) then
    raise exception 'A pending change request of this kind already exists'
      using errcode = '23505';
  end if;

  insert into public.project_change_requests (
    project_id,
    change_kind,
    reason,
    requested_budget,
    requested_start_date,
    requested_end_date,
    current_budget,
    current_start_date,
    current_end_date,
    requested_by
  )
  values (
    v_project.id,
    p_change_kind,
    trim(p_reason),
    p_requested_budget,
    p_requested_start_date,
    p_requested_end_date,
    v_project.budget,
    v_project.proposed_start_date,
    v_project.proposed_end_date,
    v_user_id
  )
  returning * into v_row;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', trim(p_reason)
  );

  perform public.notify_company_directors(
    'change_requested',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_row;
end;
$$;

create or replace function public.review_project_change(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.project_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_row public.project_change_requests%rowtype;
  v_project public.projects%rowtype;
  v_duration_days integer;
  v_payload jsonb;
  v_link text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active()
    or not public.is_company_director()
    or not public.auth_can_control()
  then
    raise exception 'Only company director can review change requests'
      using errcode = '42501';
  end if;

  select * into v_row from public.project_change_requests where id = p_request_id;
  if not found then
    raise exception 'Change request not found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Change request is not pending' using errcode = '23514';
  end if;

  if not p_approve and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Rejection reason must be at least 3 characters'
      using errcode = '23514';
  end if;

  select * into v_project from public.projects where id = v_row.project_id;
  select full_name into v_user_name from public.profiles where id = v_user_id;

  if p_approve then
    perform set_config('app.allow_project_contract_update', '1', true);

    if v_row.change_kind = 'budget' then
      update public.projects
      set budget = v_row.requested_budget
      where id = v_project.id;
    else
      v_duration_days := (v_row.requested_end_date - v_row.requested_start_date) + 1;
      update public.projects
      set
        proposed_start_date = v_row.requested_start_date,
        proposed_end_date = v_row.requested_end_date,
        proposed_duration_value = v_duration_days,
        proposed_duration_unit = 'day'
      where id = v_project.id;
    end if;
  end if;

  update public.project_change_requests
  set
    status = (case
      when p_approve then 'approved'
      else 'rejected'
    end)::public.change_request_status,
    reviewed_by = v_user_id,
    reviewed_at = now(),
    review_reason = case
      when p_reason is null or length(trim(p_reason)) = 0 then null
      else trim(p_reason)
    end
  where id = v_row.id
  returning * into v_row;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', v_row.review_reason
  );

  perform public.notify_factory_managers(
    v_project.factory_id,
    'change_reviewed',
    v_payload,
    v_link,
    'project',
    v_project.id
  );
  perform public.create_notification(
    v_row.requested_by,
    'change_reviewed',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_row;
end;
$$;

create or replace function public.list_mentionable_profiles(
  p_project_id uuid
)
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_allowed boolean;
begin
  if auth.uid() is null or not public.is_auth_active() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.auth_can_control() then
    raise exception 'View-only account cannot list mentions' using errcode = '42501';
  end if;

  select * into v_project from public.projects where projects.id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  v_allowed := (
    public.is_company_director()
    or (
      public.get_auth_role() = 'factory_manager'
      and v_project.factory_id = public.get_auth_factory_id()
    )
  );

  if not v_allowed then
    raise exception 'You are not allowed to list mentions for this project'
      using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name, p.email, p.role
  from public.profiles p
  where p.is_active
    and p.id is distinct from auth.uid()
    and (
      p.role = 'company_director'
      or (
        p.role = 'factory_manager'
        and p.factory_id = v_project.factory_id
      )
      or p.id = v_project.proposed_by
    )
  order by p.full_name;
end;
$$;

revoke all on function public.transition_project_status(uuid, public.project_status, text) from public;
grant execute on function public.transition_project_status(uuid, public.project_status, text) to authenticated;

revoke all on function public.request_project_completion(uuid) from public;
grant execute on function public.request_project_completion(uuid) to authenticated;

revoke all on function public.request_project_change(uuid, public.change_request_kind, text, numeric, date, date) from public;
grant execute on function public.request_project_change(uuid, public.change_request_kind, text, numeric, date, date) to authenticated;

revoke all on function public.review_project_change(uuid, boolean, text) from public;
grant execute on function public.review_project_change(uuid, boolean, text) to authenticated;

grant execute on function public.list_mentionable_profiles(uuid) to authenticated;
