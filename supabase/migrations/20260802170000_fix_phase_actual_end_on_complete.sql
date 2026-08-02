-- Fix phase auto-complete: actual_end_date must not precede phase start_date

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
  v_phase_start date;
  v_task_actual_end date;
  v_resolved_actual_end date;
begin
  v_phase_id := coalesce(new.phase_id, old.phase_id);

  select status, start_date
  into v_old_status, v_phase_start
  from public.phases
  where id = v_phase_id;

  select
    count(*)::integer,
    count(*) filter (where status = 'done')::integer,
    count(*) filter (where status in ('in_progress', 'blocked'))::integer,
    max(actual_end_date)
  into v_total, v_done, v_active, v_task_actual_end
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

  if v_new_status = 'completed' then
    v_resolved_actual_end := coalesce(v_task_actual_end, current_date);
    if v_phase_start is not null and v_resolved_actual_end < v_phase_start then
      v_resolved_actual_end := v_phase_start;
    end if;
  end if;

  update public.phases
  set
    status = v_new_status,
    actual_end_date = case
      when v_new_status = 'completed' then coalesce(actual_end_date, v_resolved_actual_end)
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
