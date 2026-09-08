-- Proposal contract is duration (months). Calendar start/end are set after
-- approval while status is approved, then frozen once execution starts.

create or replace function public.enforce_project_contract_freeze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status not in ('approved', 'in_progress', 'paused', 'completed') then
    return new;
  end if;

  if (
    new.budget is distinct from old.budget
    or new.currency is distinct from old.currency
    or new.proposed_duration_value is distinct from old.proposed_duration_value
    or new.proposed_duration_unit is distinct from old.proposed_duration_unit
    or new.code is distinct from old.code
  ) and coalesce(current_setting('app.allow_project_contract_update', true), '') <> '1'
  then
    raise exception 'Approved project contract fields are frozen'
      using errcode = '42501';
  end if;

  if (
    new.proposed_start_date is distinct from old.proposed_start_date
    or new.proposed_end_date is distinct from old.proposed_end_date
  ) and old.status in ('in_progress', 'paused', 'completed')
    and coalesce(current_setting('app.allow_project_contract_update', true), '') <> '1'
  then
    raise exception 'Approved project contract fields are frozen'
      using errcode = '42501';
  end if;

  if new.assigned_pm_id is distinct from old.assigned_pm_id
    and coalesce(current_setting('app.allow_pm_reassign', true), '') <> '1'
  then
    raise exception 'Assigned PM must be changed through reassign_project_pm()'
      using errcode = '42501';
  end if;

  if (
    new.completion_requested_at is distinct from old.completion_requested_at
    or new.completion_requested_by is distinct from old.completion_requested_by
  ) and coalesce(current_setting('app.allow_completion_request', true), '') <> '1'
    and not (
      coalesce(current_setting('app.allow_project_status_transition', true), '') = '1'
      and new.status = 'completed'
      and new.completion_requested_at is null
    )
  then
    raise exception 'Completion requests must go through request_project_completion()'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.project_duration_days(p_project public.projects)
returns integer
language sql
stable
as $$
  select case
    when p_project.proposed_start_date is not null
      and p_project.proposed_end_date is not null
      then greatest((p_project.proposed_end_date - p_project.proposed_start_date) + 1, 1)
    when p_project.proposed_duration_value is not null
      and p_project.proposed_duration_unit is not null
      then public.duration_to_days(
        p_project.proposed_duration_value,
        p_project.proposed_duration_unit
      )
    when p_project.actual_start_date is not null
      and p_project.actual_end_date is not null
      then greatest((p_project.actual_end_date - p_project.actual_start_date) + 1, 1)
    else null
  end;
$$;

create or replace function public.validate_phase_dates()
returns trigger
language plpgsql
as $$
declare
  v_project public.projects%rowtype;
  v_project_start date;
  v_project_end date;
  v_project_days integer;
  v_phase_days integer;
begin
  if new.start_date is null or new.end_date is null then
    raise exception 'Phase start and end dates are required'
      using errcode = '23514';
  end if;

  select * into v_project from public.projects where id = new.project_id;

  v_project_start := public.project_schedule_start(v_project);
  v_project_end := public.project_schedule_end(v_project);
  v_project_days := public.project_duration_days(v_project);
  v_phase_days := (new.end_date - new.start_date) + 1;

  if v_project_start is null or v_project_end is null then
    raise exception 'Project schedule is required before adding phases'
      using errcode = '23514';
  end if;

  if v_project_days is not null and v_phase_days > v_project_days then
    raise exception 'Phase duration exceeds project duration'
      using errcode = '23514';
  end if;

  if new.start_date < v_project_start or new.end_date > v_project_end then
    raise exception 'Phase dates must fall within the project schedule'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

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

    if v_project.code is null or length(trim(v_project.code)) = 0 then
      raise exception 'Project code is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.budget is null or v_project.budget <= 0 then
      raise exception 'Project budget is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.proposed_duration_value is null
      or v_project.proposed_duration_unit is null
    then
      raise exception 'Project duration is required before submitting proposal' using errcode = '23514';
    end if;
    if coalesce(length(trim(v_project.description)), 0) < 3 then
      raise exception 'Project description is required before submitting proposal'
        using errcode = '23514';
    end if;

  elsif v_project.status = 'rejected' and p_target_status = 'proposed' then
    if v_role <> 'factory_manager' then
      raise exception 'Only factory manager can resubmit rejected proposal' using errcode = '42501';
    end if;

    if v_project.code is null or length(trim(v_project.code)) = 0 then
      raise exception 'Project code is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.budget is null or v_project.budget <= 0 then
      raise exception 'Project budget is required before submitting proposal' using errcode = '23514';
    end if;
    if v_project.proposed_duration_value is null
      or v_project.proposed_duration_unit is null
    then
      raise exception 'Project duration is required before submitting proposal' using errcode = '23514';
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

    if v_project.assigned_pm_id is null then
      raise exception 'Assigned PM is required before starting execution' using errcode = '23514';
    end if;

    if v_project.proposed_start_date is null or v_project.proposed_end_date is null then
      raise exception 'Project schedule is required before starting execution' using errcode = '23514';
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
    if not public.can_govern_project(v_project.id) then
      raise exception 'Only factory manager or company director can pause execution'
        using errcode = '42501';
    end if;
    if coalesce(length(trim(p_reason)), 0) < 3 then
      raise exception 'Pause reason must be at least 3 characters' using errcode = '23514';
    end if;

  elsif v_project.status = 'paused' and p_target_status = 'in_progress' then
    if not public.can_govern_project(v_project.id) then
      raise exception 'Only factory manager or company director can resume execution'
        using errcode = '42501';
    end if;

  elsif v_project.status in ('in_progress', 'paused') and p_target_status = 'completed' then
    if v_role <> 'company_director' then
      raise exception 'Only company director can complete project execution'
        using errcode = '42501';
    end if;
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
    end,
    completion_requested_at = case
      when p_target_status = 'completed' then null
      else completion_requested_at
    end,
    completion_requested_by = case
      when p_target_status = 'completed' then null
      else completion_requested_by
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

  v_link := coalesce(
    public.project_detail_path(v_project.id),
    '/projects/' || v_project.id::text
  );
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

create or replace function public.reassign_project_pm(
  p_project_id uuid,
  p_pm_id uuid,
  p_reason text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_project public.projects%rowtype;
  v_old_pm uuid;
  v_pm public.profiles%rowtype;
  v_payload jsonb;
  v_link text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active() then
    raise exception 'Inactive account' using errcode = '42501';
  end if;

  select * into v_project from public.projects where id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if public.get_auth_role() <> 'factory_manager'
    or v_project.factory_id is distinct from public.get_auth_factory_id()
  then
    raise exception 'Only the factory manager can reassign the project manager'
      using errcode = '42501';
  end if;

  if v_project.status not in ('approved', 'in_progress', 'paused') then
    raise exception 'Cannot assign PM unless the project is approved, in progress, or paused'
      using errcode = '23514';
  end if;

  select * into v_pm from public.profiles where id = p_pm_id;
  if not found
    or v_pm.role <> 'project_manager'
    or v_pm.factory_id is distinct from v_project.factory_id
    or not v_pm.is_active
  then
    raise exception 'Assigned PM must be an active project manager in this factory'
      using errcode = '23514';
  end if;

  v_old_pm := v_project.assigned_pm_id;
  if v_old_pm is not distinct from p_pm_id then
    return v_project;
  end if;

  if v_old_pm is not null and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Reassignment reason must be at least 3 characters'
      using errcode = '23514';
  end if;

  select full_name into v_user_name from public.profiles where id = v_user_id;

  perform set_config('app.allow_pm_reassign', '1', true);

  update public.projects
  set assigned_pm_id = p_pm_id
  where id = v_project.id
  returning * into v_project;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', trim(p_reason)
  );

  perform public.notify_company_directors(
    'pm_reassigned',
    v_payload,
    v_link,
    'project',
    v_project.id
  );
  if v_old_pm is not null then
    perform public.create_notification(
      v_old_pm,
      'pm_reassigned',
      v_payload,
      v_link,
      'project',
      v_project.id
    );
  end if;
  perform public.create_notification(
    p_pm_id,
    'pm_reassigned',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_project;
end;
$$;

revoke all on function public.transition_project_status(uuid, public.project_status, text) from public;
grant execute on function public.transition_project_status(uuid, public.project_status, text) to authenticated;
