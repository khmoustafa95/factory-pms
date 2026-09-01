-- Human-readable project URLs: expose project code in dashboard RPC + notification links.

create or replace function public.project_detail_path(p_project_id uuid)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select '/projects/' || f.code || '/' || p.code
  from public.projects p
  join public.factories f on f.id = p.factory_id
  where p.id = p_project_id;
$$;

grant execute on function public.project_detail_path(uuid) to authenticated;
revoke all on function public.project_detail_path(uuid) from public;

create or replace function public.get_dashboard_projects()
returns table (
  id uuid,
  code text,
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
  has_phase_issue boolean,
  funding_received numeric,
  budget_used_pct numeric,
  has_funding_gap boolean,
  open_procurement_count bigint,
  overdue_procurement_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.code,
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
    coalesce(ps.has_phase_issue, false) as has_phase_issue,
    coalesce(fin.funding_received, 0) as funding_received,
    fin.budget_used_pct,
    coalesce(fin.has_funding_gap, false) as has_funding_gap,
    coalesce(fin.open_procurement_count, 0) as open_procurement_count,
    coalesce(fin.overdue_procurement_count, 0) as overdue_procurement_count
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
        ph.status <> 'completed'
          and ph.end_date is not null
          and ph.end_date < current_date
      )
      or bool_or(ph.schedule_deviation_reason is not null)
      or bool_or(ph.financial_deviation_reason is not null)
      or bool_or(
        ph.actual_end_date is not null
          and ph.end_date is not null
          and ph.actual_end_date > ph.end_date
      )
      or bool_or(
        ph.actual_budget is not null
          and ph.actual_budget > ph.expected_budget + 0.009
      ) as has_phase_issue
    from public.phases ph
    where ph.project_id = p.id
  ) ps on true
  left join lateral (
    select *
    from public.get_project_financial_snapshot(p.id)
  ) fin on true
  order by p.updated_at desc, p.title asc;
$$;

grant execute on function public.get_dashboard_projects() to authenticated;
revoke all on function public.get_dashboard_projects() from public;

-- Notification links: use factory/project codes instead of UUIDs.
create or replace function public.notify_on_task_blocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_actor_name text;
  v_payload jsonb;
  v_link text;
begin
  if tg_op = 'UPDATE'
    and new.status = 'blocked'
    and old.status is distinct from 'blocked'
  then
    select * into v_project from public.projects where id = new.project_id;
    if not found then
      return new;
    end if;

    select full_name into v_actor_name
    from public.profiles
    where id = auth.uid();

    v_link := public.project_detail_path(v_project.id);
    v_payload := jsonb_build_object(
      'projectTitle', v_project.title,
      'projectCode', coalesce(v_project.code, ''),
      'taskTitle', new.title,
      'actorName', coalesce(v_actor_name, 'Unknown user'),
      'reason', new.blocked_reason
    );

    perform public.notify_company_directors(
      'task_blocked',
      v_payload,
      v_link,
      'task',
      new.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      'task_blocked',
      v_payload,
      v_link,
      'task',
      new.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      'task_blocked',
      v_payload,
      v_link,
      'task',
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_on_comment_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.comments%rowtype;
  v_author_name text;
  v_project public.projects%rowtype;
  v_task public.tasks%rowtype;
  v_payload jsonb;
  v_link text;
  v_preview text;
begin
  select * into v_comment from public.comments where id = new.comment_id;
  if not found then
    return new;
  end if;

  select full_name into v_author_name
  from public.profiles
  where id = v_comment.author_id;

  v_preview := left(v_comment.body, 120);

  if v_comment.entity_type = 'project' then
    select * into v_project from public.projects where id = v_comment.entity_id;
    if found then
      v_link := public.project_detail_path(v_project.id);
      v_payload := jsonb_build_object(
        'projectTitle', v_project.title,
        'projectCode', coalesce(v_project.code, ''),
        'actorName', coalesce(v_author_name, 'Unknown user'),
        'preview', v_preview
      );
    end if;

  elsif v_comment.entity_type = 'task' then
    select * into v_task from public.tasks where id = v_comment.entity_id;
    if found then
      select * into v_project from public.projects where id = v_task.project_id;
      if found then
        v_link := public.project_detail_path(v_project.id);
        v_payload := jsonb_build_object(
          'projectTitle', v_project.title,
          'projectCode', coalesce(v_project.code, ''),
          'taskTitle', v_task.title,
          'actorName', coalesce(v_author_name, 'Unknown user'),
          'preview', v_preview
        );
      end if;
    end if;

  elsif v_comment.entity_type = 'phase' then
    select p.*
    into v_project
    from public.phases ph
    join public.projects p on p.id = ph.project_id
    where ph.id = v_comment.entity_id;
    if found then
      v_link := public.project_detail_path(v_project.id);
      v_payload := jsonb_build_object(
        'projectTitle', v_project.title,
        'projectCode', coalesce(v_project.code, ''),
        'actorName', coalesce(v_author_name, 'Unknown user'),
        'preview', v_preview
      );
    end if;
  end if;

  if v_link is null then
    v_link := '/';
    v_payload := jsonb_build_object(
      'actorName', coalesce(v_author_name, 'Unknown user'),
      'preview', v_preview,
      'projectTitle', '',
      'projectCode', ''
    );
  end if;

  perform public.create_notification(
    new.mentioned_user_id,
    'comment_mention',
    v_payload,
    v_link,
    v_comment.entity_type::text,
    v_comment.entity_id
  );

  return new;
end;
$$;
