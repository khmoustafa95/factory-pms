-- Task completion tracking: actual end date + overrun justifications

alter table public.tasks
  add column if not exists actual_end_date date,
  add column if not exists schedule_deviation_reason text,
  add column if not exists financial_deviation_reason text;

alter table public.tasks
  drop constraint if exists tasks_schedule_deviation_reason_not_blank,
  drop constraint if exists tasks_financial_deviation_reason_not_blank;

alter table public.tasks
  add constraint tasks_schedule_deviation_reason_not_blank check (
    schedule_deviation_reason is null
    or length(trim(schedule_deviation_reason)) > 0
  ),
  add constraint tasks_financial_deviation_reason_not_blank check (
    financial_deviation_reason is null
    or length(trim(financial_deviation_reason)) > 0
  );

create or replace function public.sync_task_progress_from_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    new.progress_percent := 100;
    new.actual_end_date := coalesce(new.actual_end_date, current_date);
    new.actual_duration_days := greatest(coalesce(new.actual_duration_days, 1), 1);
  elsif new.status = 'todo' then
    new.progress_percent := 0;
  end if;

  return new;
end;
$$;
