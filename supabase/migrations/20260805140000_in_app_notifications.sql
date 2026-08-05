-- In-app notifications (local/self-hosted friendly — no external push services).
-- Events are written from SECURITY DEFINER helpers / existing RPCs + triggers.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  link_path text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_not_blank check (char_length(trim(type)) > 0)
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index notifications_user_id_unread_idx
  on public.notifications (user_id)
  where is_read = false;

comment on table public.notifications is
  'Per-user in-app notification inbox; inserts only via server helpers.';

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() and public.is_auth_active());

create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid() and public.is_auth_active())
  with check (user_id = auth.uid() and public.is_auth_active());

-- No client insert/delete — helpers are SECURITY DEFINER.
revoke insert, delete on public.notifications from authenticated, anon;

alter table public.notifications replica identity full;
alter publication supabase_realtime add table public.notifications;

grant select, update on public.notifications to authenticated, service_role;
grant insert, delete on public.notifications to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_payload jsonb default '{}'::jsonb,
  p_link_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  -- Do not notify the actor who caused the event.
  if p_user_id = auth.uid() then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.is_active
  ) then
    return;
  end if;

  insert into public.notifications (
    user_id,
    type,
    payload,
    link_path,
    entity_type,
    entity_id
  )
  values (
    p_user_id,
    trim(p_type),
    coalesce(p_payload, '{}'::jsonb),
    p_link_path,
    p_entity_type,
    p_entity_id
  );
end;
$$;

-- Callable from other SECURITY DEFINER RPCs/triggers (owner). Not for direct SPA use.
revoke all on function public.create_notification(uuid, text, jsonb, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_notification(uuid, text, jsonb, text, text, uuid)
  to postgres, service_role;

create or replace function public.notify_company_directors(
  p_type text,
  p_payload jsonb default '{}'::jsonb,
  p_link_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_director record;
begin
  for v_director in
    select id
    from public.profiles
    where role = 'company_director'
      and is_active
  loop
    perform public.create_notification(
      v_director.id,
      p_type,
      p_payload,
      p_link_path,
      p_entity_type,
      p_entity_id
    );
  end loop;
end;
$$;

revoke all on function public.notify_company_directors(text, jsonb, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.notify_company_directors(text, jsonb, text, text, uuid)
  to postgres, service_role;

create or replace function public.notify_factory_managers(
  p_factory_id uuid,
  p_type text,
  p_payload jsonb default '{}'::jsonb,
  p_link_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manager record;
begin
  if p_factory_id is null then
    return;
  end if;

  for v_manager in
    select id
    from public.profiles
    where role = 'factory_manager'
      and factory_id = p_factory_id
      and is_active
  loop
    perform public.create_notification(
      v_manager.id,
      p_type,
      p_payload,
      p_link_path,
      p_entity_type,
      p_entity_id
    );
  end loop;
end;
$$;

revoke all on function public.notify_factory_managers(uuid, text, jsonb, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.notify_factory_managers(uuid, text, jsonb, text, text, uuid)
  to postgres, service_role;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.notifications
  set is_read = true
  where user_id = auth.uid()
    and is_read = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- Project status transitions → notifications
-- (redefines latest transition_project_status from 20260802120000)
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
  v_payload jsonb;
  v_link text;
  v_notif_type text;
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

  -- Notifications for noteworthy transitions
  v_link := '/projects/' || v_project.id::text;
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', case
      when p_reason is null then null
      when length(trim(p_reason)) = 0 then null
      else trim(p_reason)
    end
  );

  if v_from_status in ('draft', 'rejected') and v_project.status = 'proposed' then
    perform public.notify_company_directors(
      'project_proposed',
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      'project_proposed',
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'approved' then
    v_notif_type := 'project_approved';
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'rejected' then
    v_notif_type := 'project_rejected';
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_from_status = 'approved' and v_project.status = 'in_progress' then
    v_notif_type := 'project_started';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'paused' then
    v_notif_type := 'project_paused';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_from_status = 'paused' and v_project.status = 'in_progress' then
    v_notif_type := 'project_resumed';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );

  elsif v_project.status = 'completed' then
    v_notif_type := 'project_completed';
    perform public.notify_company_directors(
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.notify_factory_managers(
      v_project.factory_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
    perform public.create_notification(
      v_project.assigned_pm_id,
      v_notif_type,
      v_payload,
      v_link,
      'project',
      v_project.id
    );
  end if;

  return v_project;
end;
$$;

revoke all on function public.transition_project_status(uuid, public.project_status, text) from public;
grant execute on function public.transition_project_status(uuid, public.project_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Task blocked → notifications
-- ---------------------------------------------------------------------------

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

    v_link := '/projects/' || v_project.id::text;
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

drop trigger if exists tasks_notify_blocked on public.tasks;
create trigger tasks_notify_blocked
  after update of status, blocked_reason on public.tasks
  for each row
  execute function public.notify_on_task_blocked();

revoke all on function public.notify_on_task_blocked() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Comments → notifications (proposal discussion + task / escalation)
-- SECURITY DEFINER trigger so helpers stay non-callable from the SPA.
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_name text;
  v_author_role public.user_role;
  v_project public.projects%rowtype;
  v_task public.tasks%rowtype;
  v_payload jsonb;
  v_link text;
  v_notif_type text;
  v_preview text;
begin
  select full_name, role
  into v_author_name, v_author_role
  from public.profiles
  where id = new.author_id;

  v_preview := left(new.body, 120);

  if new.entity_type = 'project' then
    select * into v_project from public.projects where id = new.entity_id;
    if found then
      v_link := '/projects/' || v_project.id::text;
      v_payload := jsonb_build_object(
        'projectTitle', v_project.title,
        'projectCode', coalesce(v_project.code, ''),
        'actorName', coalesce(v_author_name, 'Unknown user'),
        'preview', v_preview
      );
      v_notif_type := 'comment_project';

      if v_author_role = 'company_director' then
        perform public.notify_factory_managers(
          v_project.factory_id,
          v_notif_type,
          v_payload,
          v_link,
          'project',
          v_project.id
        );
        perform public.create_notification(
          v_project.assigned_pm_id,
          v_notif_type,
          v_payload,
          v_link,
          'project',
          v_project.id
        );
      else
        perform public.notify_company_directors(
          v_notif_type,
          v_payload,
          v_link,
          'project',
          v_project.id
        );
      end if;
    end if;

  elsif new.entity_type = 'task' then
    select * into v_task from public.tasks where id = new.entity_id;
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
        v_notif_type := 'comment_task';

        perform public.notify_company_directors(
          v_notif_type,
          v_payload,
          v_link,
          'task',
          v_task.id
        );
        perform public.notify_factory_managers(
          v_project.factory_id,
          v_notif_type,
          v_payload,
          v_link,
          'task',
          v_task.id
        );
        perform public.create_notification(
          v_project.assigned_pm_id,
          v_notif_type,
          v_payload,
          v_link,
          'task',
          v_task.id
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_notify_insert on public.comments;
create trigger comments_notify_insert
  after insert on public.comments
  for each row
  execute function public.notify_on_comment_insert();

revoke all on function public.notify_on_comment_insert() from public, anon, authenticated;
