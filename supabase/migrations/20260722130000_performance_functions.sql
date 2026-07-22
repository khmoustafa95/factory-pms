-- Performance: server-side progress recalculation, dashboard stats, project activity

-- ---------------------------------------------------------------------------
-- Project progress (weighted phase completion)
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
          select
            (count(*) filter (where t.status = 'done'))::numeric
            / nullif(count(*), 0)
            * 100
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

create or replace function public.tasks_recalculate_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_project_progress(old.project_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.project_id is distinct from new.project_id then
      perform public.recalculate_project_progress(old.project_id);
    end if;
    perform public.recalculate_project_progress(new.project_id);
    return new;
  end if;

  perform public.recalculate_project_progress(new.project_id);
  return new;
end;
$$;

create or replace function public.phases_recalculate_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_project_progress(old.project_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.project_id is distinct from new.project_id then
      perform public.recalculate_project_progress(old.project_id);
    end if;
    perform public.recalculate_project_progress(new.project_id);
    return new;
  end if;

  perform public.recalculate_project_progress(new.project_id);
  return new;
end;
$$;

drop trigger if exists tasks_recalculate_progress on public.tasks;
create trigger tasks_recalculate_progress
  after insert or update or delete on public.tasks
  for each row execute function public.tasks_recalculate_progress();

drop trigger if exists phases_recalculate_progress on public.phases;
create trigger phases_recalculate_progress
  after insert or update or delete on public.phases
  for each row execute function public.phases_recalculate_progress();

-- Backfill progress for existing projects
do $$
declare
  project_record record;
begin
  for project_record in select id from public.projects loop
    perform public.recalculate_project_progress(project_record.id);
  end loop;
end;
$$;

revoke all on function public.recalculate_project_progress(uuid) from public;
revoke all on function public.tasks_recalculate_progress() from public;
revoke all on function public.phases_recalculate_progress() from public;

-- ---------------------------------------------------------------------------
-- Dashboard KPIs (RLS-scoped via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_dashboard_stats()
returns table (
  factory_count bigint,
  active_project_count bigint,
  average_progress numeric,
  blocked_task_count bigint
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
    ) as blocked_task_count;
$$;

grant execute on function public.get_dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Project activity feed (RLS-scoped via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_project_activity(p_project_id uuid)
returns table (
  id uuid,
  entity_type public.entity_type,
  entity_id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  author_full_name text,
  author_role public.user_role
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.entity_type,
    c.entity_id,
    c.author_id,
    c.body,
    c.created_at,
    c.updated_at,
    p.full_name as author_full_name,
    p.role as author_role
  from public.comments c
  inner join public.profiles p on p.id = c.author_id
  where
    (
      c.entity_type = 'project'
      and c.entity_id = p_project_id
    )
    or (
      c.entity_type = 'phase'
      and c.entity_id in (
        select ph.id
        from public.phases ph
        where ph.project_id = p_project_id
      )
    )
    or (
      c.entity_type = 'task'
      and c.entity_id in (
        select t.id
        from public.tasks t
        where t.project_id = p_project_id
      )
    )
  order by c.created_at desc;
$$;

grant execute on function public.get_project_activity(uuid) to authenticated;
