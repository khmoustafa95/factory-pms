-- Field tracking: task weight/duration/cost/progress + phase budget/deviation/problems

-- ---------------------------------------------------------------------------
-- Enum + task columns
-- ---------------------------------------------------------------------------

create type public.cost_category as enum ('raw_material', 'non_raw_material');

alter table public.tasks
  add column if not exists weight_percent numeric(5, 2) not null default 0,
  add column if not exists progress_percent numeric(5, 2) not null default 0,
  add column if not exists expected_duration_days integer not null default 1,
  add column if not exists actual_duration_days integer not null default 0,
  add column if not exists expected_cost numeric(14, 2) not null default 0,
  add column if not exists actual_cost numeric(14, 2) not null default 0,
  add column if not exists cost_category public.cost_category not null default 'non_raw_material';

alter table public.tasks
  drop constraint if exists tasks_weight_percent_check,
  drop constraint if exists tasks_progress_percent_check,
  drop constraint if exists tasks_expected_duration_days_check,
  drop constraint if exists tasks_actual_duration_days_check,
  drop constraint if exists tasks_expected_cost_check,
  drop constraint if exists tasks_actual_cost_check;

alter table public.tasks
  add constraint tasks_weight_percent_check check (
    weight_percent >= 0 and weight_percent <= 100
  ),
  add constraint tasks_progress_percent_check check (
    progress_percent >= 0 and progress_percent <= 100
  ),
  add constraint tasks_expected_duration_days_check check (
    expected_duration_days >= 0
  ),
  add constraint tasks_actual_duration_days_check check (
    actual_duration_days >= 0
  ),
  add constraint tasks_expected_cost_check check (expected_cost >= 0),
  add constraint tasks_actual_cost_check check (actual_cost >= 0);

-- ---------------------------------------------------------------------------
-- Phase columns
-- ---------------------------------------------------------------------------

alter table public.phases
  add column if not exists expected_budget numeric(14, 2) not null default 0,
  add column if not exists actual_end_date date,
  add column if not exists schedule_deviation_reason text,
  add column if not exists financial_deviation_reason text,
  add column if not exists problem_description text,
  add column if not exists solution_in_progress text;

alter table public.phases
  drop constraint if exists phases_expected_budget_check,
  drop constraint if exists phases_actual_end_after_start;

alter table public.phases
  add constraint phases_expected_budget_check check (expected_budget >= 0),
  add constraint phases_actual_end_after_start check (
    actual_end_date is null
    or start_date is null
    or actual_end_date >= start_date
  );

-- ---------------------------------------------------------------------------
-- Backfill task weights (equal split per phase) + progress from status
-- ---------------------------------------------------------------------------

with phase_counts as (
  select phase_id, count(*)::integer as task_count
  from public.tasks
  group by phase_id
),
ranked as (
  select
    t.id,
    t.phase_id,
    pc.task_count,
    row_number() over (
      partition by t.phase_id
      order by t.sort_order, t.created_at, t.id
    ) as rn
  from public.tasks t
  inner join phase_counts pc on pc.phase_id = t.phase_id
)
update public.tasks t
set
  weight_percent = case
    when r.task_count = 1 then 100
    when r.rn = 1 then
      round(100 - (round((100.0 / r.task_count)::numeric, 2) * (r.task_count - 1)), 2)
    else round((100.0 / r.task_count)::numeric, 2)
  end,
  progress_percent = case t.status
    when 'done' then 100
    when 'todo' then 0
    else 50
  end,
  expected_duration_days = greatest(coalesce(t.expected_duration_days, 1), 1),
  actual_duration_days = case
    when t.status = 'done' then greatest(coalesce(t.actual_duration_days, 1), 1)
    else coalesce(t.actual_duration_days, 0)
  end
from ranked r
where t.id = r.id;

-- ---------------------------------------------------------------------------
-- Sync progress_percent from status (done/todo only)
-- ---------------------------------------------------------------------------

create or replace function public.sync_task_progress_from_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    new.progress_percent := 100;
  elsif new.status = 'todo' then
    new.progress_percent := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_sync_progress_from_status on public.tasks;
create trigger tasks_sync_progress_from_status
  before insert or update of status, progress_percent on public.tasks
  for each row execute function public.sync_task_progress_from_status();

-- ---------------------------------------------------------------------------
-- Task weight sum must not exceed 100% (exact 100% enforced in UI, like phases)
-- ---------------------------------------------------------------------------

create or replace function public.validate_task_weight_sum()
returns trigger
language plpgsql
as $$
declare
  v_phase_ids uuid[];
  v_phase_id uuid;
  v_count integer;
  v_sum numeric;
begin
  if tg_op = 'DELETE' then
    v_phase_ids := array[old.phase_id];
  elsif tg_op = 'UPDATE' and old.phase_id is distinct from new.phase_id then
    v_phase_ids := array[old.phase_id, new.phase_id];
  else
    v_phase_ids := array[new.phase_id];
  end if;

  foreach v_phase_id in array v_phase_ids loop
    select count(*)::integer, coalesce(sum(weight_percent), 0)
    into v_count, v_sum
    from public.tasks
    where phase_id = v_phase_id;

    if v_count > 0 and v_sum > 100.01 then
      raise exception 'Task weights in a phase cannot exceed 100%% (phase %, sum %)',
        v_phase_id, v_sum
        using errcode = '23514';
    end if;
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tasks_validate_weight_sum on public.tasks;
create constraint trigger tasks_validate_weight_sum
  after insert or update of weight_percent, phase_id on public.tasks
  deferrable initially immediate
  for each row execute function public.validate_task_weight_sum();

-- On delete: redistribute freed weight to a sibling so the remaining sum stays 100%
create or replace function public.rebalance_task_weights_after_delete()
returns trigger
language plpgsql
as $$
declare
  v_sibling_id uuid;
  v_sum numeric;
  v_count integer;
begin
  select count(*)::integer, coalesce(sum(weight_percent), 0)
  into v_count, v_sum
  from public.tasks
  where phase_id = old.phase_id;

  if v_count = 0 then
    return old;
  end if;

  if abs(v_sum - 100) <= 0.01 then
    return old;
  end if;

  select id
  into v_sibling_id
  from public.tasks
  where phase_id = old.phase_id
  order by sort_order, created_at, id
  limit 1;

  if v_sibling_id is null then
    return old;
  end if;

  update public.tasks
  set weight_percent = weight_percent + (100 - v_sum)
  where id = v_sibling_id;

  return old;
end;
$$;

drop trigger if exists tasks_after_delete_rebalance on public.tasks;
create trigger tasks_after_delete_rebalance
  after delete on public.tasks
  for each row execute function public.rebalance_task_weights_after_delete();

-- ---------------------------------------------------------------------------
-- Progress recalculation: weighted task progress_percent
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_project_progress(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress numeric(5, 2);
begin
  select coalesce(
    sum(
      (ph.weight_percent / 100.0) * coalesce(
        (
          select sum(
            (t.weight_percent / 100.0) * t.progress_percent
          )
          from public.tasks t
          where t.phase_id = ph.id
        ),
        0
      )
    ),
    0
  )
  into v_progress
  from public.phases ph
  where ph.project_id = p_project_id;

  update public.projects
  set progress_percent = round(v_progress, 2)
  where id = p_project_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Phase status sync: set actual_end_date when completed
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
  set
    status = v_new_status,
    actual_end_date = case
      when v_new_status = 'completed' then coalesce(actual_end_date, current_date)
      else actual_end_date
    end
  where id = v_phase_id
    and (
      status is distinct from v_new_status
      or (
        v_new_status = 'completed'
        and actual_end_date is null
      )
    );

  return coalesce(new, old);
end;
$$;

-- Backfill project progress with new formula
do $$
declare
  project_record record;
begin
  for project_record in select id from public.projects loop
    perform public.recalculate_project_progress(project_record.id);
  end loop;
end;
$$;

revoke all on function public.sync_task_progress_from_status() from public;
revoke all on function public.validate_task_weight_sum() from public;
revoke all on function public.rebalance_task_weights_after_delete() from public;
revoke all on function public.recalculate_project_progress(uuid) from public;
revoke all on function public.sync_phase_status_from_tasks() from public;
