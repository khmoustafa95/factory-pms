-- Server-side dashboard insights + project rows (RLS via security invoker).
-- Replaces client-side aggregation over full projects/tasks/phases selects.

create or replace function public.get_dashboard_insights()
returns table (
  total_projects bigint,
  total_tasks bigint,
  overdue_task_count bigint,
  upcoming_due_task_count bigint,
  proposed_count bigint,
  overdue_phase_count bigint,
  schedule_deviation_phase_count bigint,
  financial_deviation_phase_count bigint,
  phase_issue_count bigint,
  project_status_counts jsonb,
  task_status_counts jsonb,
  progress_buckets jsonb,
  top_blocked_projects jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with project_rows as (
    select
      p.id,
      p.title,
      p.status,
      greatest(0, least(100, round(p.progress_percent)))::int as progress_bucket
    from public.projects p
  ),
  task_rows as (
    select
      t.id,
      t.project_id,
      t.status,
      t.due_date
    from public.tasks t
  ),
  phase_rows as (
    select
      ph.id,
      ph.project_id,
      ph.status,
      ph.end_date,
      ph.actual_end_date,
      ph.expected_budget,
      ph.actual_budget,
      ph.schedule_deviation_reason,
      ph.financial_deviation_reason,
      (
        ph.status <> 'completed'
        and ph.end_date is not null
        and ph.end_date < current_date
      ) as is_overdue,
      (
        ph.schedule_deviation_reason is not null
        or (
          ph.actual_end_date is not null
          and ph.end_date is not null
          and ph.actual_end_date > ph.end_date
        )
        or (
          ph.status <> 'completed'
          and ph.end_date is not null
          and ph.end_date < current_date
        )
      ) as has_schedule_deviation,
      (
        ph.financial_deviation_reason is not null
        or (
          ph.actual_budget is not null
          and ph.actual_budget > ph.expected_budget + 0.009
        )
      ) as has_financial_deviation
    from public.phases ph
  ),
  blocked_by_project as (
    select
      tr.project_id,
      coalesce(pr.title, '—') as project_title,
      count(*)::bigint as blocked_task_count
    from task_rows tr
    left join project_rows pr on pr.id = tr.project_id
    where tr.status = 'blocked'
      and tr.project_id is not null
    group by tr.project_id, pr.title
  )
  select
    (select count(*) from project_rows)::bigint as total_projects,
    (select count(*) from task_rows)::bigint as total_tasks,
    (
      select count(*)
      from task_rows tr
      where tr.due_date is not null
        and tr.due_date < current_date
        and tr.status <> 'done'
    )::bigint as overdue_task_count,
    (
      select count(*)
      from task_rows tr
      where tr.due_date is not null
        and tr.due_date >= current_date
        and tr.due_date <= (current_date + 7)
        and tr.status <> 'done'
    )::bigint as upcoming_due_task_count,
    (
      select count(*) from project_rows pr where pr.status = 'proposed'
    )::bigint as proposed_count,
    (
      select count(*) from phase_rows ph where ph.is_overdue
    )::bigint as overdue_phase_count,
    (
      select count(*) from phase_rows ph where ph.has_schedule_deviation
    )::bigint as schedule_deviation_phase_count,
    (
      select count(*) from phase_rows ph where ph.has_financial_deviation
    )::bigint as financial_deviation_phase_count,
    (
      select count(*)
      from phase_rows ph
      where ph.is_overdue
         or ph.has_schedule_deviation
         or ph.has_financial_deviation
    )::bigint as phase_issue_count,
    (
      select jsonb_build_object(
        'draft', count(*) filter (where status = 'draft'),
        'proposed', count(*) filter (where status = 'proposed'),
        'approved', count(*) filter (where status = 'approved'),
        'rejected', count(*) filter (where status = 'rejected'),
        'in_progress', count(*) filter (where status = 'in_progress'),
        'completed', count(*) filter (where status = 'completed'),
        'paused', count(*) filter (where status = 'paused')
      )
      from project_rows
    ) as project_status_counts,
    (
      select jsonb_build_object(
        'todo', count(*) filter (where status = 'todo'),
        'in_progress', count(*) filter (where status = 'in_progress'),
        'blocked', count(*) filter (where status = 'blocked'),
        'done', count(*) filter (where status = 'done')
      )
      from task_rows
    ) as task_status_counts,
    (
      select jsonb_build_array(
        jsonb_build_object(
          'label', '0-24',
          'min', 0,
          'max', 24,
          'count', count(*) filter (where progress_bucket between 0 and 24)
        ),
        jsonb_build_object(
          'label', '25-49',
          'min', 25,
          'max', 49,
          'count', count(*) filter (where progress_bucket between 25 and 49)
        ),
        jsonb_build_object(
          'label', '50-74',
          'min', 50,
          'max', 74,
          'count', count(*) filter (where progress_bucket between 50 and 74)
        ),
        jsonb_build_object(
          'label', '75-99',
          'min', 75,
          'max', 99,
          'count', count(*) filter (where progress_bucket between 75 and 99)
        ),
        jsonb_build_object(
          'label', '100',
          'min', 100,
          'max', 100,
          'count', count(*) filter (where progress_bucket = 100)
        )
      )
      from project_rows
    ) as progress_buckets,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'projectId', b.project_id,
            'projectTitle', b.project_title,
            'blockedTaskCount', b.blocked_task_count
          )
          order by b.blocked_task_count desc, b.project_title asc
        )
        from (
          select *
          from blocked_by_project
          order by blocked_task_count desc, project_title asc
          limit 5
        ) b
      ),
      '[]'::jsonb
    ) as top_blocked_projects;
$$;

create or replace function public.get_dashboard_projects()
returns table (
  id uuid,
  title text,
  status public.project_status,
  progress_percent numeric,
  budget numeric,
  currency text,
  proposed_start_date date,
  proposed_end_date date,
  proposed_duration_value integer,
  proposed_duration_unit public.duration_unit,
  actual_start_date date,
  actual_end_date date,
  factory_id uuid,
  factory_name text,
  factory_code text,
  total_task_count bigint,
  todo_task_count bigint,
  in_progress_task_count bigint,
  done_task_count bigint,
  blocked_task_count bigint,
  overdue_task_count bigint,
  overdue_phase_count bigint,
  has_phase_issue boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.title,
    p.status,
    p.progress_percent,
    p.budget,
    p.currency,
    p.proposed_start_date,
    p.proposed_end_date,
    p.proposed_duration_value,
    p.proposed_duration_unit,
    p.actual_start_date,
    p.actual_end_date,
    f.id as factory_id,
    f.name as factory_name,
    f.code as factory_code,
    coalesce(tc.total_task_count, 0) as total_task_count,
    coalesce(tc.todo_task_count, 0) as todo_task_count,
    coalesce(tc.in_progress_task_count, 0) as in_progress_task_count,
    coalesce(tc.done_task_count, 0) as done_task_count,
    coalesce(tc.blocked_task_count, 0) as blocked_task_count,
    coalesce(tc.overdue_task_count, 0) as overdue_task_count,
    coalesce(ps.overdue_phase_count, 0) as overdue_phase_count,
    coalesce(ps.has_phase_issue, false) as has_phase_issue
  from public.projects p
  left join public.factories f on f.id = p.factory_id
  left join lateral (
    select
      count(*)::bigint as total_task_count,
      count(*) filter (where t.status = 'todo')::bigint as todo_task_count,
      count(*) filter (where t.status = 'in_progress')::bigint as in_progress_task_count,
      count(*) filter (where t.status = 'done')::bigint as done_task_count,
      count(*) filter (where t.status = 'blocked')::bigint as blocked_task_count,
      count(*) filter (
        where t.due_date is not null
          and t.due_date < current_date
          and t.status <> 'done'
      )::bigint as overdue_task_count
    from public.tasks t
    where t.project_id = p.id
  ) tc on true
  left join lateral (
    select
      count(*) filter (
        where ph.status <> 'completed'
          and ph.end_date is not null
          and ph.end_date < current_date
      )::bigint as overdue_phase_count,
      bool_or(
        (
          ph.status <> 'completed'
          and ph.end_date is not null
          and ph.end_date < current_date
        )
        or ph.schedule_deviation_reason is not null
        or (
          ph.actual_end_date is not null
          and ph.end_date is not null
          and ph.actual_end_date > ph.end_date
        )
        or ph.financial_deviation_reason is not null
        or (
          ph.actual_budget is not null
          and ph.actual_budget > ph.expected_budget + 0.009
        )
      ) as has_phase_issue
    from public.phases ph
    where ph.project_id = p.id
  ) ps on true
  order by p.updated_at desc;
$$;

grant execute on function public.get_dashboard_insights() to authenticated;
grant execute on function public.get_dashboard_projects() to authenticated;

revoke all on function public.get_dashboard_insights() from public;
revoke all on function public.get_dashboard_projects() from public;
