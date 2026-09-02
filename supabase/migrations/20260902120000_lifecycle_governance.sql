-- Lifecycle governance: freeze approved contract, tighten WBS/finance RLS,
-- role-gated pause/complete, completion requests, change requests, escalations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.change_request_kind as enum ('budget', 'schedule');
create type public.change_request_status as enum (
  'pending',
  'approved',
  'rejected'
);
create type public.escalation_status as enum (
  'open',
  'acknowledged',
  'resolved'
);

-- ---------------------------------------------------------------------------
-- Project completion request columns
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists completion_requested_at timestamptz;

alter table public.projects
  add column if not exists completion_requested_by uuid
    references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Task escalation columns
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists escalation_status public.escalation_status;

alter table public.tasks
  add column if not exists escalation_acknowledged_at timestamptz;

alter table public.tasks
  add column if not exists escalation_acknowledged_by uuid
    references public.profiles (id) on delete set null;

update public.tasks
set escalation_status = 'open'::public.escalation_status
where status = 'blocked'
  and escalation_status is null;

-- ---------------------------------------------------------------------------
-- Change requests
-- ---------------------------------------------------------------------------

create table public.project_change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  change_kind public.change_request_kind not null,
  status public.change_request_status not null default 'pending',
  reason text not null,
  requested_budget numeric(14, 2),
  requested_start_date date,
  requested_end_date date,
  current_budget numeric(14, 2),
  current_start_date date,
  current_end_date date,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_change_requests_reason_not_blank check (
    char_length(trim(reason)) >= 3
  ),
  constraint project_change_requests_budget_shape check (
    change_kind <> 'budget'
    or requested_budget is not null
  ),
  constraint project_change_requests_schedule_shape check (
    change_kind <> 'schedule'
    or (
      requested_start_date is not null
      and requested_end_date is not null
      and requested_end_date >= requested_start_date
    )
  )
);

create index project_change_requests_project_id_idx
  on public.project_change_requests (project_id, created_at desc);

create unique index project_change_requests_pending_kind_uidx
  on public.project_change_requests (project_id, change_kind)
  where status = 'pending';

comment on table public.project_change_requests is
  'Director-reviewed budget/schedule changes after the approved contract is frozen';

create trigger project_change_requests_set_updated_at
  before update on public.project_change_requests
  for each row execute function public.set_updated_at();

alter table public.project_change_requests enable row level security;

create policy "Users read accessible project change requests"
  on public.project_change_requests for select
  using (public.can_access_project(project_id));

grant select on public.project_change_requests to authenticated, service_role;
grant insert, update, delete on public.project_change_requests to service_role;
revoke insert, update, delete on public.project_change_requests
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Capability helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_govern_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and (
      public.is_company_director()
      or exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and public.get_auth_role() = 'factory_manager'
          and p.factory_id = public.get_auth_factory_id()
      )
    );
$$;

create or replace function public.can_manage_project_phases(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and public.is_assigned_pm(p_project_id)
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status in ('approved', 'in_progress', 'paused')
    );
$$;

create or replace function public.can_manage_project_tasks(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and public.is_assigned_pm(p_project_id)
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status in ('in_progress', 'paused')
    );
$$;

create or replace function public.can_write_project_funding(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status <> 'completed'
        and (
          public.is_company_director()
          or (
            public.get_auth_role() = 'factory_manager'
            and p.factory_id = public.get_auth_factory_id()
          )
        )
    );
$$;

create or replace function public.can_write_project_operations(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.status <> 'completed'
        and (
          (
            public.get_auth_role() = 'factory_manager'
            and p.factory_id = public.get_auth_factory_id()
          )
          or (
            public.is_assigned_pm(p_project_id)
            and p.status in ('approved', 'in_progress', 'paused')
          )
        )
    );
$$;

revoke all on function public.can_govern_project(uuid) from public;
revoke all on function public.can_manage_project_phases(uuid) from public;
revoke all on function public.can_manage_project_tasks(uuid) from public;
revoke all on function public.can_write_project_funding(uuid) from public;
revoke all on function public.can_write_project_operations(uuid) from public;

grant execute on function public.can_govern_project(uuid) to authenticated;
grant execute on function public.can_manage_project_phases(uuid) to authenticated;
grant execute on function public.can_manage_project_tasks(uuid) to authenticated;
grant execute on function public.can_write_project_funding(uuid) to authenticated;
grant execute on function public.can_write_project_operations(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Freeze approved contract (budget / dates / code / PM)
-- ---------------------------------------------------------------------------

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
    or new.proposed_start_date is distinct from old.proposed_start_date
    or new.proposed_end_date is distinct from old.proposed_end_date
    or new.proposed_duration_value is distinct from old.proposed_duration_value
    or new.proposed_duration_unit is distinct from old.proposed_duration_unit
    or new.code is distinct from old.code
  ) and coalesce(current_setting('app.allow_project_contract_update', true), '') <> '1'
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

drop trigger if exists projects_enforce_contract_freeze on public.projects;
create trigger projects_enforce_contract_freeze
  before update on public.projects
  for each row execute function public.enforce_project_contract_freeze();

revoke all on function public.enforce_project_contract_freeze() from public;

-- ---------------------------------------------------------------------------
-- Projects RLS: split ALL into select/insert/update/delete
-- ---------------------------------------------------------------------------

drop policy if exists "Directors access non-draft projects" on public.projects;
drop policy if exists "Directors access all projects" on public.projects;
drop policy if exists "Factory managers access own factory projects" on public.projects;

create policy "Directors select non-draft projects"
  on public.projects for select
  using (
    public.is_company_director()
    and public.is_auth_active()
    and status <> 'draft'
  );

create policy "Directors update non-draft projects"
  on public.projects for update
  using (
    public.is_company_director()
    and public.is_auth_active()
    and status <> 'draft'
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
    and status <> 'draft'
  );

create policy "Directors delete rejected projects"
  on public.projects for delete
  using (
    public.is_company_director()
    and public.is_auth_active()
    and status = 'rejected'
  );

create policy "Factory managers select own factory projects"
  on public.projects for select
  using (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

create policy "Factory managers insert own factory projects"
  on public.projects for insert
  with check (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

create policy "Factory managers update own factory projects"
  on public.projects for update
  using (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  )
  with check (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

create policy "Factory managers delete draft or rejected projects"
  on public.projects for delete
  using (
    public.is_auth_active()
    and public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
    and status in ('draft', 'rejected')
  );

-- ---------------------------------------------------------------------------
-- Phases / tasks RLS: PM writes, everyone with access reads
-- ---------------------------------------------------------------------------

drop policy if exists "Directors manage all phases" on public.phases;
drop policy if exists "Factory managers manage factory phases" on public.phases;
drop policy if exists "PMs manage assigned project phases" on public.phases;

create policy "Users read accessible phases"
  on public.phases for select
  using (public.can_access_project(project_id));

create policy "PMs insert assigned project phases"
  on public.phases for insert
  with check (public.can_manage_project_phases(project_id));

create policy "PMs update assigned project phases"
  on public.phases for update
  using (public.can_manage_project_phases(project_id))
  with check (public.can_manage_project_phases(project_id));

create policy "PMs delete assigned project phases"
  on public.phases for delete
  using (public.can_manage_project_phases(project_id));

drop policy if exists "Directors manage all tasks" on public.tasks;
drop policy if exists "Factory managers manage factory tasks" on public.tasks;
drop policy if exists "PMs manage assigned project tasks" on public.tasks;

create policy "Users read accessible tasks"
  on public.tasks for select
  using (public.can_access_project(project_id));

create policy "PMs insert assigned project tasks"
  on public.tasks for insert
  with check (public.can_manage_project_tasks(project_id));

create policy "PMs update assigned project tasks"
  on public.tasks for update
  using (public.can_manage_project_tasks(project_id))
  with check (public.can_manage_project_tasks(project_id));

create policy "PMs delete assigned project tasks"
  on public.tasks for delete
  using (public.can_manage_project_tasks(project_id));

-- ---------------------------------------------------------------------------
-- Comments: proposal stays director <-> FM; execution includes completed
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users insert comments on accessible entities"
  on public.comments;

create policy "Authenticated users insert comments on accessible entities"
  on public.comments for insert
  with check (
    public.is_auth_active()
    and author_id = auth.uid()
    and (
      (
        entity_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = entity_id
            and (
              (
                p.status in ('draft', 'proposed', 'rejected')
                and (
                  public.is_company_director()
                  or (
                    public.get_auth_role() = 'factory_manager'
                    and p.factory_id = public.get_auth_factory_id()
                  )
                )
              )
              or (
                p.status not in ('draft', 'proposed', 'rejected')
                and public.can_access_project(p.id)
              )
            )
        )
      )
      or (
        entity_type = 'phase'
        and exists (
          select 1
          from public.phases ph
          where ph.id = entity_id
            and public.can_access_project(ph.project_id)
        )
      )
      or (
        entity_type = 'task'
        and exists (
          select 1
          from public.tasks t
          where t.id = entity_id
            and public.can_access_project(t.project_id)
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Finance write policies
-- ---------------------------------------------------------------------------

drop policy if exists "Directors manage all project funding entries"
  on public.project_funding_entries;
drop policy if exists "Factory managers manage factory project funding entries"
  on public.project_funding_entries;
drop policy if exists "PMs manage assigned project funding entries"
  on public.project_funding_entries;

create policy "Governors write project funding entries"
  on public.project_funding_entries for all
  using (public.can_write_project_funding(project_id))
  with check (public.can_write_project_funding(project_id));

drop policy if exists "Directors manage all project procurement items"
  on public.project_procurement_items;
drop policy if exists "Factory managers manage factory project procurement items"
  on public.project_procurement_items;
drop policy if exists "PMs manage assigned project procurement items"
  on public.project_procurement_items;

create policy "Operators write project procurement items"
  on public.project_procurement_items for all
  using (public.can_write_project_operations(project_id))
  with check (public.can_write_project_operations(project_id));

drop policy if exists "Directors manage all project staff"
  on public.project_staff;
drop policy if exists "Factory managers manage factory project staff"
  on public.project_staff;
drop policy if exists "PMs manage assigned project staff"
  on public.project_staff;

create policy "Operators write project staff"
  on public.project_staff for all
  using (public.can_write_project_operations(project_id))
  with check (public.can_write_project_operations(project_id));

drop policy if exists "Directors manage all project expense lines"
  on public.project_expense_lines;
drop policy if exists "Factory managers manage factory project expense lines"
  on public.project_expense_lines;
drop policy if exists "PMs manage assigned project expense lines"
  on public.project_expense_lines;

create policy "Operators write project expense lines"
  on public.project_expense_lines for all
  using (public.can_write_project_operations(project_id))
  with check (public.can_write_project_operations(project_id));

-- ---------------------------------------------------------------------------
-- Escalation status sync
-- ---------------------------------------------------------------------------

create or replace function public.sync_task_escalation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'blocked' then
      new.escalation_status := 'open';
    end if;
    return new;
  end if;

  if new.status = 'blocked' and old.status is distinct from 'blocked' then
    new.escalation_status := 'open';
    new.escalation_acknowledged_at := null;
    new.escalation_acknowledged_by := null;
  elsif old.status = 'blocked' and new.status is distinct from 'blocked' then
    new.escalation_status := 'resolved';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_sync_escalation_status on public.tasks;
create trigger tasks_sync_escalation_status
  before insert or update of status on public.tasks
  for each row execute function public.sync_task_escalation_status();

revoke all on function public.sync_task_escalation_status() from public;

-- ---------------------------------------------------------------------------
-- Completion request
-- ---------------------------------------------------------------------------

create or replace function public.request_project_completion(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_role public.user_role;
  v_project public.projects%rowtype;
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

  select role, full_name into v_role, v_user_name from public.profiles where id = v_user_id;

  if v_role <> 'factory_manager'
    or v_project.factory_id is distinct from public.get_auth_factory_id()
  then
    raise exception 'Only the factory manager can request project completion'
      using errcode = '42501';
  end if;

  if v_project.status not in ('in_progress', 'paused') then
    raise exception 'Project must be in progress or paused to request completion'
      using errcode = '23514';
  end if;

  if exists (
    select 1 from public.tasks t
    where t.project_id = v_project.id
      and t.status <> 'done'
  ) then
    raise exception 'All tasks must be done before marking project completed'
      using errcode = '23514';
  end if;

  if v_project.completion_requested_at is not null then
    return v_project;
  end if;

  perform set_config('app.allow_completion_request', '1', true);

  update public.projects
  set
    completion_requested_at = now(),
    completion_requested_by = v_user_id
  where id = v_project.id
  returning * into v_project;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user')
  );

  perform public.notify_company_directors(
    'completion_requested',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_project;
end;
$$;

revoke all on function public.request_project_completion(uuid) from public;
grant execute on function public.request_project_completion(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Change requests
-- ---------------------------------------------------------------------------

create or replace function public.request_project_change(
  p_project_id uuid,
  p_change_kind public.change_request_kind,
  p_reason text,
  p_requested_budget numeric default null,
  p_requested_start_date date default null,
  p_requested_end_date date default null
)
returns public.project_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_role public.user_role;
  v_project public.projects%rowtype;
  v_row public.project_change_requests%rowtype;
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

  if v_project.status not in ('approved', 'in_progress', 'paused') then
    raise exception 'Change requests are only allowed after approval'
      using errcode = '23514';
  end if;

  select role, full_name into v_role, v_user_name from public.profiles where id = v_user_id;

  if not (
    public.is_assigned_pm(v_project.id)
    or (
      v_role = 'factory_manager'
      and v_project.factory_id = public.get_auth_factory_id()
    )
  ) then
    raise exception 'You are not allowed to request a project change'
      using errcode = '42501';
  end if;

  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Change request reason must be at least 3 characters'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.project_change_requests r
    where r.project_id = v_project.id
      and r.change_kind = p_change_kind
      and r.status = 'pending'
  ) then
    raise exception 'A pending change request of this kind already exists'
      using errcode = '23505';
  end if;

  insert into public.project_change_requests (
    project_id,
    change_kind,
    reason,
    requested_budget,
    requested_start_date,
    requested_end_date,
    current_budget,
    current_start_date,
    current_end_date,
    requested_by
  )
  values (
    v_project.id,
    p_change_kind,
    trim(p_reason),
    p_requested_budget,
    p_requested_start_date,
    p_requested_end_date,
    v_project.budget,
    v_project.proposed_start_date,
    v_project.proposed_end_date,
    v_user_id
  )
  returning * into v_row;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'actorName', coalesce(v_user_name, 'Unknown user'),
    'reason', trim(p_reason)
  );

  perform public.notify_company_directors(
    'change_requested',
    v_payload,
    v_link,
    'project',
    v_project.id
  );

  return v_row;
end;
$$;

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
    status = case when p_approve then 'approved' else 'rejected' end,
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

revoke all on function public.request_project_change(uuid, public.change_request_kind, text, numeric, date, date) from public;
grant execute on function public.request_project_change(uuid, public.change_request_kind, text, numeric, date, date) to authenticated;
revoke all on function public.review_project_change(uuid, boolean, text) from public;
grant execute on function public.review_project_change(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reassign PM
-- ---------------------------------------------------------------------------

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

  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Reassignment reason must be at least 3 characters'
      using errcode = '23514';
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

  if v_project.status = 'completed' then
    raise exception 'Cannot reassign PM on a completed project'
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
  perform public.create_notification(
    v_old_pm,
    'pm_reassigned',
    v_payload,
    v_link,
    'project',
    v_project.id
  );
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

revoke all on function public.reassign_project_pm(uuid, uuid, text) from public;
grant execute on function public.reassign_project_pm(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Acknowledge escalation
-- ---------------------------------------------------------------------------

create or replace function public.acknowledge_task_escalation(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_task public.tasks%rowtype;
  v_project public.projects%rowtype;
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

  select * into v_task from public.tasks where id = p_task_id;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if not public.can_govern_project(v_task.project_id) then
    raise exception 'You are not allowed to acknowledge this escalation'
      using errcode = '42501';
  end if;

  if v_task.status <> 'blocked' then
    raise exception 'Only blocked tasks can be acknowledged'
      using errcode = '23514';
  end if;

  if v_task.escalation_status = 'acknowledged' then
    return v_task;
  end if;

  update public.tasks
  set
    escalation_status = 'acknowledged',
    escalation_acknowledged_at = now(),
    escalation_acknowledged_by = v_user_id
  where id = v_task.id
  returning * into v_task;

  select * into v_project from public.projects where id = v_task.project_id;
  select full_name into v_user_name from public.profiles where id = v_user_id;

  v_link := coalesce(public.project_detail_path(v_project.id), '/projects/' || v_project.id::text);
  v_payload := jsonb_build_object(
    'projectTitle', v_project.title,
    'projectCode', coalesce(v_project.code, ''),
    'taskTitle', v_task.title,
    'actorName', coalesce(v_user_name, 'Unknown user')
  );

  perform public.create_notification(
    v_project.assigned_pm_id,
    'escalation_acknowledged',
    v_payload,
    v_link,
    'task',
    v_task.id
  );

  return v_task;
end;
$$;

revoke all on function public.acknowledge_task_escalation(uuid) from public;
grant execute on function public.acknowledge_task_escalation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- transition_project_status (single redefine)
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

revoke all on function public.transition_project_status(uuid, public.project_status, text) from public;
grant execute on function public.transition_project_status(uuid, public.project_status, text) to authenticated;
