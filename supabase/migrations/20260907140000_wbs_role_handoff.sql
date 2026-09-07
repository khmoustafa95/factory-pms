-- Factory manager designs phases after approval; assigned PM prepares tasks
-- (including while approved). Task status stays todo until execution starts.

create or replace function public.can_manage_project_phases(p_project_id uuid)
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
  select
    public.is_auth_active()
    and public.is_assigned_pm(p_project_id)
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status in ('approved', 'in_progress', 'paused')
    );
$$;

drop policy if exists "PMs insert assigned project phases" on public.phases;
drop policy if exists "PMs update assigned project phases" on public.phases;
drop policy if exists "PMs delete assigned project phases" on public.phases;
drop policy if exists "Factory managers insert project phases" on public.phases;
drop policy if exists "Factory managers update project phases" on public.phases;
drop policy if exists "Factory managers delete project phases" on public.phases;

create policy "Factory managers insert project phases"
  on public.phases for insert
  with check (public.can_manage_project_phases(project_id));

create policy "Factory managers update project phases"
  on public.phases for update
  using (public.can_manage_project_phases(project_id))
  with check (public.can_manage_project_phases(project_id));

create policy "Factory managers delete project phases"
  on public.phases for delete
  using (public.can_manage_project_phases(project_id));

-- ---------------------------------------------------------------------------
-- Tasks stay in planning (todo) while the project is approved
-- ---------------------------------------------------------------------------

create or replace function public.enforce_task_planning_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status public.project_status;
begin
  select status
  into v_status
  from public.projects
  where id = new.project_id;

  if found
    and v_status = 'approved'
    and new.status is distinct from 'todo'
  then
    raise exception 'Tasks stay in planning until execution starts'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_task_planning_status on public.tasks;
create trigger trg_enforce_task_planning_status
  before insert or update of status on public.tasks
  for each row
  execute function public.enforce_task_planning_status();

revoke all on function public.enforce_task_planning_status() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notify assigned PM the first time phases become execution-ready
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_phases_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_project public.projects%rowtype;
  v_actor_name text;
  v_payload jsonb;
  v_link text;
begin
  v_project_id := coalesce(new.project_id, old.project_id);

  select *
  into v_project
  from public.projects
  where id = v_project_id;

  if not found or v_project.status is distinct from 'approved' then
    return coalesce(new, old);
  end if;

  if not public.project_execution_ready(v_project) then
    return coalesce(new, old);
  end if;

  if exists (
    select 1
    from public.notifications n
    where n.type = 'phases_ready'
      and n.entity_id = v_project.id
  ) then
    return coalesce(new, old);
  end if;

  select full_name
  into v_actor_name
  from public.profiles
  where id = auth.uid();

  v_link := coalesce(
    public.project_detail_path(v_project.id),
    '/projects/' || v_project.id::text
  );
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_actor_name, 'Unknown user')
  );

  perform public.create_notification(
    v_project.assigned_pm_id,
    'phases_ready',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_notify_on_phases_ready on public.phases;
create trigger trg_notify_on_phases_ready
  after insert or update or delete on public.phases
  for each row
  execute function public.notify_on_phases_ready();

revoke all on function public.notify_on_phases_ready() from public, anon, authenticated;
