-- Project duration (value + unit), phase schedule dates, validation, and execution date calculation.

-- ---------------------------------------------------------------------------
-- Duration unit enum + project columns
-- ---------------------------------------------------------------------------

create type public.duration_unit as enum ('day', 'week', 'month');

alter table public.projects
  add column if not exists proposed_duration_value integer,
  add column if not exists proposed_duration_unit public.duration_unit;

alter table public.projects
  add constraint projects_proposed_duration_positive check (
    proposed_duration_value is null
    or proposed_duration_value > 0
  );

-- Backfill duration from legacy proposed date range
update public.projects p
set
  proposed_duration_value = greatest(
    (p.proposed_end_date - p.proposed_start_date) + 1,
    1
  ),
  proposed_duration_unit = 'day'
where p.proposed_duration_value is null
  and p.proposed_start_date is not null
  and p.proposed_end_date is not null;

-- ---------------------------------------------------------------------------
-- Phase schedule dates
-- ---------------------------------------------------------------------------

alter table public.phases
  add column if not exists start_date date,
  add column if not exists end_date date;

alter table public.phases
  add constraint phases_end_after_start check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  );

-- Backfill demo phase dates for in-progress / completed / paused projects
update public.phases ph
set
  start_date = case ph.sort_order
    when 1 then coalesce(pr.actual_start_date, pr.proposed_start_date)
    when 2 then coalesce(pr.actual_start_date, pr.proposed_start_date) + 46
    when 3 then coalesce(pr.actual_start_date, pr.proposed_start_date) + 92
    else coalesce(pr.actual_start_date, pr.proposed_start_date) + 138
  end,
  end_date = case ph.sort_order
    when 1 then coalesce(pr.actual_start_date, pr.proposed_start_date) + 45
    when 2 then coalesce(pr.actual_start_date, pr.proposed_start_date) + 91
    when 3 then coalesce(pr.actual_start_date, pr.proposed_start_date) + 137
    else coalesce(pr.actual_end_date, pr.proposed_end_date)
  end
from public.projects pr
where ph.project_id = pr.id
  and ph.start_date is null
  and pr.status in ('in_progress', 'paused', 'completed')
  and coalesce(pr.actual_start_date, pr.proposed_start_date) is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.duration_to_days(
  p_value integer,
  p_unit public.duration_unit
)
returns integer
language sql
immutable
as $$
  select case p_unit
    when 'day' then p_value
    when 'week' then p_value * 7
    when 'month' then p_value * 30
  end;
$$;

create or replace function public.project_duration_days(p_project public.projects)
returns integer
language sql
stable
as $$
  select case
    when p_project.proposed_duration_value is not null
      and p_project.proposed_duration_unit is not null
      then public.duration_to_days(
        p_project.proposed_duration_value,
        p_project.proposed_duration_unit
      )
    when p_project.proposed_start_date is not null
      and p_project.proposed_end_date is not null
      then greatest((p_project.proposed_end_date - p_project.proposed_start_date) + 1, 1)
    when p_project.actual_start_date is not null
      and p_project.actual_end_date is not null
      then greatest((p_project.actual_end_date - p_project.actual_start_date) + 1, 1)
    else null
  end;
$$;

create or replace function public.project_schedule_start(p_project public.projects)
returns date
language sql
stable
as $$
  select coalesce(p_project.actual_start_date, p_project.proposed_start_date);
$$;

create or replace function public.project_schedule_end(p_project public.projects)
returns date
language sql
stable
as $$
  select coalesce(
    p_project.actual_end_date,
    p_project.proposed_end_date,
    case
      when public.project_schedule_start(p_project) is not null
        and public.project_duration_days(p_project) is not null
        then public.project_schedule_start(p_project)
          + (public.project_duration_days(p_project) - 1)
      else null
    end
  );
$$;

-- ---------------------------------------------------------------------------
-- Phase date validation
-- ---------------------------------------------------------------------------

create or replace function public.validate_phase_dates()
returns trigger
language plpgsql
as $$
declare
  v_project public.projects%rowtype;
  v_project_start date;
  v_project_end date;
  v_project_days integer;
  v_phase_days integer;
begin
  if new.start_date is null or new.end_date is null then
    raise exception 'Phase start and end dates are required'
      using errcode = '23514';
  end if;

  select * into v_project from public.projects where id = new.project_id;

  v_project_start := public.project_schedule_start(v_project);
  v_project_end := public.project_schedule_end(v_project);
  v_project_days := public.project_duration_days(v_project);
  v_phase_days := (new.end_date - new.start_date) + 1;

  if v_project_days is not null and v_phase_days > v_project_days then
    raise exception 'Phase duration exceeds project duration'
      using errcode = '23514';
  end if;

  if v_project_start is not null and v_project_end is not null then
    if new.start_date < v_project_start or new.end_date > v_project_end then
      raise exception 'Phase dates must fall within the project schedule'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists phases_validate_dates on public.phases;
create trigger phases_validate_dates
  before insert or update on public.phases
  for each row execute function public.validate_phase_dates();

-- ---------------------------------------------------------------------------
-- Task due date validation against phase
-- ---------------------------------------------------------------------------

create or replace function public.validate_task_due_date()
returns trigger
language plpgsql
as $$
declare
  v_phase public.phases%rowtype;
begin
  if new.due_date is null then
    return new;
  end if;

  select * into v_phase from public.phases where id = new.phase_id;

  if v_phase.start_date is not null and new.due_date < v_phase.start_date then
    raise exception 'Task due date must be on or after the phase start date'
      using errcode = '23514';
  end if;

  if v_phase.end_date is not null and new.due_date > v_phase.end_date then
    raise exception 'Task due date must be on or before the phase end date'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_validate_due_date on public.tasks;
create trigger tasks_validate_due_date
  before insert or update on public.tasks
  for each row execute function public.validate_task_due_date();

-- ---------------------------------------------------------------------------
-- Auto-sync phase status from task completion
-- ---------------------------------------------------------------------------

create or replace function public.sync_phase_status_from_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase_id uuid;
  v_total integer;
  v_done integer;
  v_active integer;
  v_new_status public.phase_status;
begin
  v_phase_id := coalesce(new.phase_id, old.phase_id);

  select
    count(*)::integer,
    count(*) filter (where status = 'done')::integer,
    count(*) filter (where status in ('in_progress', 'blocked'))::integer
  into v_total, v_done, v_active
  from public.tasks
  where phase_id = v_phase_id;

  if v_total = 0 then
    v_new_status := 'pending';
  elsif v_done = v_total then
    v_new_status := 'completed';
  elsif v_done > 0 or v_active > 0 then
    v_new_status := 'in_progress';
  else
    v_new_status := 'pending';
  end if;

  update public.phases
  set status = v_new_status
  where id = v_phase_id
    and status is distinct from v_new_status;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tasks_sync_phase_status on public.tasks;
create trigger tasks_sync_phase_status
  after insert or update or delete on public.tasks
  for each row execute function public.sync_phase_status_from_tasks();

revoke all on function public.sync_phase_status_from_tasks() from public;

-- ---------------------------------------------------------------------------
-- transition_project_status: set actual dates on execution start / completion
-- ---------------------------------------------------------------------------

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active() then
    raise exception 'Inactive account' using errcode = '42501';
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
    or (v_role = 'project_manager' and v_project.assigned_pm_id = v_user_id)
  );

  if not v_project_role_ok then
    raise exception 'You are not allowed to transition this project' using errcode = '42501';
  end if;

  if v_project.status = p_target_status then
    return v_project;
  end if;

  if v_project.status = 'draft' and p_target_status = 'proposed' then
    if v_role <> 'factory_manager' then
      raise exception 'Only factory manager can submit draft proposal' using errcode = '42501';
    end if;
    if v_project.assigned_pm_id is null then
      raise exception 'Assigned PM is required before submitting proposal' using errcode = '23514';
    end if;

  elsif v_project.status = 'rejected' and p_target_status = 'proposed' then
    if v_role <> 'factory_manager' then
      raise exception 'Only factory manager can resubmit rejected proposal' using errcode = '42501';
    end if;
    if v_project.assigned_pm_id is null then
      raise exception 'Assigned PM is required before resubmitting proposal' using errcode = '23514';
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
    v_duration_days := public.project_duration_days(v_project);
    if v_duration_days is null then
      raise exception 'Project duration is required before starting execution' using errcode = '23514';
    end if;

  elsif v_project.status = 'in_progress' and p_target_status = 'paused' then
    if coalesce(length(trim(p_reason)), 0) < 3 then
      raise exception 'Pause reason must be at least 3 characters' using errcode = '23514';
    end if;

  elsif v_project.status = 'paused' and p_target_status = 'in_progress' then
    null;

  elsif v_project.status in ('in_progress', 'paused') and p_target_status = 'completed' then
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
      when p_target_status = 'proposed' then v_user_id
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
      when p_target_status in ('proposed', 'approved', 'in_progress', 'completed') then null
      else rejection_reason
    end,
    actual_start_date = case
      when p_target_status = 'in_progress'
        and v_from_status = 'approved'
        and actual_start_date is null
        then current_date
      else actual_start_date
    end,
    actual_end_date = case
      when p_target_status = 'in_progress'
        and v_from_status = 'approved'
        and v_duration_days is not null
        then current_date + (v_duration_days - 1)
      when p_target_status = 'completed'
        then coalesce(actual_end_date, current_date)
      else actual_end_date
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

  return v_project;
end;
$$;

revoke all on function public.duration_to_days(integer, public.duration_unit) from public;
revoke all on function public.project_duration_days(public.projects) from public;
revoke all on function public.project_schedule_start(public.projects) from public;
revoke all on function public.project_schedule_end(public.projects) from public;
revoke all on function public.validate_phase_dates() from public;
revoke all on function public.validate_task_due_date() from public;
