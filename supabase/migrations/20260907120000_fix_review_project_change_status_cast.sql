-- CASE branches of unknown string literals resolve to text, which cannot be
-- assigned to change_request_status without an explicit cast.

create or replace function public.review_project_change(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.project_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_row public.project_change_requests%rowtype;
  v_project public.projects%rowtype;
  v_duration_days integer;
  v_payload jsonb;
  v_link text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_auth_active() or not public.is_company_director() then
    raise exception 'Only company director can review change requests'
      using errcode = '42501';
  end if;

  select * into v_row from public.project_change_requests where id = p_request_id;
  if not found then
    raise exception 'Change request not found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Change request is not pending' using errcode = '23514';
  end if;

  if not p_approve and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Rejection reason must be at least 3 characters'
      using errcode = '23514';
  end if;

  select * into v_project from public.projects where id = v_row.project_id;
  select full_name into v_user_name from public.profiles where id = v_user_id;

  if p_approve then
    perform set_config('app.allow_project_contract_update', '1', true);

    if v_row.change_kind = 'budget' then
      update public.projects
      set budget = v_row.requested_budget
      where id = v_project.id;
    else
      v_duration_days := (v_row.requested_end_date - v_row.requested_start_date) + 1;
      update public.projects
      set
        proposed_start_date = v_row.requested_start_date,
        proposed_end_date = v_row.requested_end_date,
        proposed_duration_value = v_duration_days,
        proposed_duration_unit = 'day'
      where id = v_project.id;
    end if;
  end if;

  update public.project_change_requests
  set
    status = (case
      when p_approve then 'approved'
      else 'rejected'
    end)::public.change_request_status,
    reviewed_by = v_user_id,
    reviewed_at = now(),
    review_reason = case
      when p_reason is null or length(trim(p_reason)) = 0 then null
      else trim(p_reason)
    end
  where id = v_row.id
  returning * into v_row;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', v_row.review_reason
  );

  perform public.notify_factory_managers(
    v_project.factory_id,
    'change_reviewed',
    v_payload,
    v_link,
    'project',
    v_project.id
  );
  perform public.create_notification(
    v_project.assigned_pm_id,
    'change_reviewed',
    v_payload,
    v_link,
    'project',
    v_project.id
  );
  perform public.create_notification(
    v_row.requested_by,
    'change_reviewed',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_row;
end;
$$;
