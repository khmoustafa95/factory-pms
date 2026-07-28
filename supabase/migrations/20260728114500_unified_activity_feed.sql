-- Unified project activity feed: comments + status transitions.

drop function if exists public.get_project_activity(uuid);

create function public.get_project_activity(p_project_id uuid)
returns table (
  id uuid,
  activity_kind text,
  entity_type public.entity_type,
  entity_id uuid,
  author_id uuid,
  body text,
  from_status public.project_status,
  to_status public.project_status,
  reason text,
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
  with scoped_comments as (
    select
      c.id,
      'comment'::text as activity_kind,
      c.entity_type,
      c.entity_id,
      c.author_id,
      c.body,
      null::public.project_status as from_status,
      null::public.project_status as to_status,
      null::text as reason,
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
  ),
  scoped_transitions as (
    select
      pst.id,
      'status_transition'::text as activity_kind,
      'project'::public.entity_type as entity_type,
      pst.project_id as entity_id,
      pst.changed_by as author_id,
      null::text as body,
      pst.from_status,
      pst.to_status,
      pst.reason,
      pst.created_at,
      pst.created_at as updated_at,
      pst.changed_by_name as author_full_name,
      pst.changed_by_role as author_role
    from public.project_status_transitions pst
    where pst.project_id = p_project_id
  )
  select *
  from (
    select * from scoped_comments
    union all
    select * from scoped_transitions
  ) feed
  order by created_at desc;
$$;

grant execute on function public.get_project_activity(uuid) to authenticated;

