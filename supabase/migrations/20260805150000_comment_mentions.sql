-- Comment @mentions: store mention rows + notify mentioned users.
-- list_mentionable_profiles: project-scoped candidates (works for PMs who cannot read all profiles).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.comment_mentions (
  comment_id uuid not null references public.comments (id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index comment_mentions_mentioned_user_id_idx
  on public.comment_mentions (mentioned_user_id);

comment on table public.comment_mentions is
  'Users explicitly @mentioned in a comment; drives mention notifications.';

alter table public.comment_mentions enable row level security;

create policy "Users read mentions on accessible comments"
  on public.comment_mentions for select
  to authenticated
  using (
    public.is_auth_active()
    and (
      mentioned_user_id = auth.uid()
      or exists (
        select 1
        from public.comments c
        where c.id = comment_id
          and c.author_id = auth.uid()
      )
      or public.is_company_director()
    )
  );

-- Allow author insert when they own the comment row.
create policy "Authors insert mentions on own comments"
  on public.comment_mentions for insert
  to authenticated
  with check (
    public.is_auth_active()
    and exists (
      select 1
      from public.comments c
      where c.id = comment_id
        and c.author_id = auth.uid()
    )
  );

grant select, insert on public.comment_mentions to authenticated, service_role;
revoke update, delete on public.comment_mentions from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Mention notification trigger
-- ---------------------------------------------------------------------------

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
      v_link := '/projects/' || v_project.id::text;
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
        v_link := '/projects/' || v_project.id::text;
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
      v_link := '/projects/' || v_project.id::text;
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

drop trigger if exists comment_mentions_notify on public.comment_mentions;
create trigger comment_mentions_notify
  after insert on public.comment_mentions
  for each row
  execute function public.notify_on_comment_mention();

revoke all on function public.notify_on_comment_mention() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Resolve project id for an entity (helper)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_project_id_for_entity(
  p_entity_type public.entity_type,
  p_entity_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if p_entity_type = 'project' then
    return p_entity_id;
  elsif p_entity_type = 'phase' then
    select project_id into v_project_id from public.phases where id = p_entity_id;
    return v_project_id;
  elsif p_entity_type = 'task' then
    select project_id into v_project_id from public.tasks where id = p_entity_id;
    return v_project_id;
  end if;
  return null;
end;
$$;

revoke all on function public.resolve_project_id_for_entity(public.entity_type, uuid)
  from public, anon;
grant execute on function public.resolve_project_id_for_entity(public.entity_type, uuid)
  to authenticated, postgres, service_role;

-- ---------------------------------------------------------------------------
-- Mention candidates for a project
-- ---------------------------------------------------------------------------

create or replace function public.list_mentionable_profiles(
  p_project_id uuid
)
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_allowed boolean;
begin
  if auth.uid() is null or not public.is_auth_active() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_project from public.projects where projects.id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  v_allowed := (
    public.is_company_director()
    or (
      public.get_auth_role() = 'factory_manager'
      and v_project.factory_id = public.get_auth_factory_id()
    )
    or (
      public.get_auth_role() = 'project_manager'
      and v_project.assigned_pm_id = auth.uid()
    )
  );

  if not v_allowed then
    raise exception 'You are not allowed to list mentions for this project'
      using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name, p.email, p.role
  from public.profiles p
  where p.is_active
    and p.id is distinct from auth.uid()
    and (
      p.role = 'company_director'
      or (
        p.role = 'factory_manager'
        and p.factory_id = v_project.factory_id
      )
      or p.id = v_project.assigned_pm_id
      or p.id = v_project.proposed_by
    )
  order by p.full_name;
end;
$$;

grant execute on function public.list_mentionable_profiles(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_comment: accept mentioned user ids
-- ---------------------------------------------------------------------------

drop function if exists public.create_comment(public.entity_type, uuid, text);

create or replace function public.create_comment(
  p_entity_type public.entity_type,
  p_entity_id uuid,
  p_body text,
  p_mentioned_user_ids uuid[] default '{}'::uuid[]
)
returns public.comments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_author_id uuid;
  v_body text;
  v_comment public.comments;
  v_project_id uuid;
  v_mentioned uuid;
  v_allowed_ids uuid[];
begin
  v_author_id := auth.uid();

  if v_author_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_body := trim(coalesce(p_body, ''));

  if length(v_body) = 0 then
    raise exception 'Comment body is required' using errcode = '23514';
  end if;

  insert into public.comments (entity_type, entity_id, author_id, body)
  values (p_entity_type, p_entity_id, v_author_id, v_body)
  returning * into v_comment;

  if p_mentioned_user_ids is not null
    and cardinality(p_mentioned_user_ids) > 0
  then
    v_project_id := public.resolve_project_id_for_entity(p_entity_type, p_entity_id);

    if v_project_id is null then
      raise exception 'Unable to resolve project for mentions' using errcode = 'P0002';
    end if;

    select coalesce(array_agg(m.id), '{}'::uuid[])
    into v_allowed_ids
    from public.list_mentionable_profiles(v_project_id) m;

    foreach v_mentioned in array p_mentioned_user_ids
    loop
      if v_mentioned = v_author_id then
        continue;
      end if;

      if v_mentioned = any (v_allowed_ids) then
        insert into public.comment_mentions (comment_id, mentioned_user_id)
        values (v_comment.id, v_mentioned)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_comment;
end;
$$;

grant execute on function public.create_comment(public.entity_type, uuid, text, uuid[])
  to authenticated;
