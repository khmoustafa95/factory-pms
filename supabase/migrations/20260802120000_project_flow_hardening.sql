-- Project flow hardening: code, draft RLS, actual_budget, start-execution guards, task gate

-- ---------------------------------------------------------------------------
-- projects.code
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists code text;

update public.projects
set code = 'PRJ-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where code is null or length(trim(code)) = 0;

alter table public.projects
  alter column code set not null;

alter table public.projects
  drop constraint if exists projects_code_format;

alter table public.projects
  add constraint projects_code_format check (code ~ '^[A-Z0-9_-]+$');

create unique index if not exists projects_factory_code_uidx
  on public.projects (factory_id, code);

-- ---------------------------------------------------------------------------
-- phases.actual_budget
-- ---------------------------------------------------------------------------

alter table public.phases
  add column if not exists actual_budget numeric(14, 2);

alter table public.phases
  drop constraint if exists phases_actual_budget_check;

alter table public.phases
  add constraint phases_actual_budget_check check (
    actual_budget is null or actual_budget >= 0
  );

-- ---------------------------------------------------------------------------
-- Draft visibility: directors and PMs cannot see drafts
-- ---------------------------------------------------------------------------

drop policy if exists "Directors access all projects" on public.projects;
drop policy if exists "Directors access non-draft projects" on public.projects;

create policy "Directors access non-draft projects"
  on public.projects for all
  using (
    public.is_company_director()
    and public.is_auth_active()
    and status <> 'draft'
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and status <> 'draft'
  );

drop policy if exists "PMs read assigned projects" on public.projects;
create policy "PMs read assigned projects"
  on public.projects for select
  using (
    public.is_auth_active()
    and public.is_assigned_pm(id)
    and status <> 'draft'
  );

-- ---------------------------------------------------------------------------
-- Execution readiness helper
-- ---------------------------------------------------------------------------

create or replace function public.project_execution_ready(p_project public.projects)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_phase_count integer;
  v_weight_sum numeric;
  v_budget_sum numeric;
  v_project_budget numeric;
  v_start date;
  v_end date;
  v_bad_dates boolean;
  v_bad_budget boolean;
begin
  if p_project.budget is null or p_project.budget <= 0 then
    return false;
  end if;

  v_project_budget := p_project.budget;
  v_start := public.project_schedule_start(p_project);
  v_end := public.project_schedule_end(p_project);

  select
    count(*)::integer,
    coalesce(sum(weight_percent), 0),
    coalesce(sum(expected_budget), 0),
    bool_or(
      start_date is null
      or end_date is null
      or (
        v_start is not null
        and v_end is not null
        and (start_date < v_start or end_date > v_end)
      )
    ),
    bool_or(expected_budget > v_project_budget)
  into
    v_phase_count,
    v_weight_sum,
    v_budget_sum,
    v_bad_dates,
    v_bad_budget
  from public.phases
  where project_id = p_project.id;

  if v_phase_count < 1 then
    return false;
  end if;

  if abs(v_weight_sum - 100) > 0.01 then
    return false;
  end if;

  if abs(v_budget_sum - v_project_budget) > 0.01 then
    return false;
  end if;

  if coalesce(v_bad_dates, true) then
    return false;
  end if;

  if coalesce(v_bad_budget, true) then
    return false;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- transition_project_status: FM-only start + WBS readiness
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
    if v_project.code is null or length(trim(v_project.code)) = 0 then
      raise exception 'Project code is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.budget is null or v_project.budget <= 0 then
      raise exception 'Project budget is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.proposed_start_date is null or v_project.proposed_end_date is null then
      raise exception 'Proposed start and end dates are required before submitting proposal'
        using errcode = '23514';
    end if;
    if coalesce(length(trim(v_project.description)), 0) < 3 then
      raise exception 'Project description is required before submitting proposal'
        using errcode = '23514';
    end if;

  elsif v_project.status = 'rejected' and p_target_status = 'proposed' then
    if v_role <> 'factory_manager' then
      raise exception 'Only factory manager can resubmit rejected proposal' using errcode = '42501';
    end if;
    if v_project.assigned_pm_id is null then
      raise exception 'Assigned PM is required before resubmitting proposal' using errcode = '23514';
    end if;
    if v_project.code is null or length(trim(v_project.code)) = 0 then
      raise exception 'Project code is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.budget is null or v_project.budget <= 0 then
      raise exception 'Project budget is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.proposed_start_date is null or v_project.proposed_end_date is null then
      raise exception 'Proposed start and end dates are required before submitting proposal'
        using errcode = '23514';
    end if;
    if coalesce(length(trim(v_project.description)), 0) < 3 then
      raise exception 'Project description is required before submitting proposal'
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

    v_duration_days := public.project_duration_days(v_project);
    if v_duration_days is null then
      raise exception 'Project duration is required before starting execution' using errcode = '23514';
    end if;

    if not public.project_execution_ready(v_project) then
      raise exception 'Project WBS is not ready: phases must total 100%% weight and 100%% budget with valid dates'
        using errcode = '23514';
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

revoke all on function public.transition_project_status(uuid, public.project_status, text) from public;
grant execute on function public.transition_project_status(uuid, public.project_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Task gate: only during execution (in_progress / paused)
-- ---------------------------------------------------------------------------

create or replace function public.validate_task_project_status()
returns trigger
language plpgsql
as $$
declare
  v_status public.project_status;
begin
  select status into v_status
  from public.projects
  where id = new.project_id;

  if v_status is null then
    raise exception 'Project not found for task' using errcode = 'P0002';
  end if;

  if v_status not in ('in_progress', 'paused', 'completed') then
    raise exception 'Tasks can only be created or updated after execution has started'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_validate_project_status on public.tasks;
create trigger tasks_validate_project_status
  before insert or update on public.tasks
  for each row execute function public.validate_task_project_status();

-- ---------------------------------------------------------------------------
-- Phase status sync: clear actuals when leaving completed
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
  v_old_status public.phase_status;
begin
  v_phase_id := coalesce(new.phase_id, old.phase_id);

  select status into v_old_status from public.phases where id = v_phase_id;

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
  set
    status = v_new_status,
    actual_end_date = case
      when v_new_status = 'completed' then coalesce(actual_end_date, current_date)
      when v_old_status = 'completed' and v_new_status <> 'completed' then null
      else actual_end_date
    end,
    actual_budget = case
      when v_old_status = 'completed' and v_new_status <> 'completed' then null
      else actual_budget
    end
  where id = v_phase_id
    and (
      status is distinct from v_new_status
      or (
        v_new_status = 'completed'
        and actual_end_date is null
      )
      or (
        v_old_status = 'completed'
        and v_new_status <> 'completed'
        and (actual_end_date is not null or actual_budget is not null)
      )
    );

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard stats: FM-oriented counters
-- ---------------------------------------------------------------------------

drop function if exists public.get_dashboard_stats();

create or replace function public.get_dashboard_stats()
returns table (
  factory_count bigint,
  active_project_count bigint,
  average_progress numeric,
  blocked_task_count bigint,
  draft_count bigint,
  proposed_count bigint,
  in_progress_count bigint,
  overdue_task_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (
      select count(*)
      from public.factories f
      where f.is_active = true
    ) as factory_count,
    (
      select count(*)
      from public.projects p
      where p.status in ('approved', 'in_progress', 'paused')
    ) as active_project_count,
    (
      select coalesce(avg(p.progress_percent), 0)
      from public.projects p
      where p.status in ('approved', 'in_progress', 'paused')
    ) as average_progress,
    (
      select count(*)
      from public.tasks t
      where t.status = 'blocked'
    ) as blocked_task_count,
    (
      select count(*)
      from public.projects p
      where p.status = 'draft'
    ) as draft_count,
    (
      select count(*)
      from public.projects p
      where p.status = 'proposed'
    ) as proposed_count,
    (
      select count(*)
      from public.projects p
      where p.status = 'in_progress'
    ) as in_progress_count,
    (
      select count(*)
      from public.tasks t
      where t.due_date is not null
        and t.due_date < current_date
        and t.status <> 'done'
    ) as overdue_task_count;
$$;

grant execute on function public.get_dashboard_stats() to authenticated;

revoke all on function public.project_execution_ready(public.projects) from public;
revoke all on function public.validate_task_project_status() from public;
revoke all on function public.sync_phase_status_from_tasks() from public;
