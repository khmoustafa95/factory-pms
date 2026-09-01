-- Project financial & operations layer: funding, procurement, staff, expense lines

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.funding_source_type as enum (
  'internal',
  'loan',
  'grant',
  'partner',
  'other'
);

create type public.funding_entry_status as enum (
  'planned',
  'received',
  'cancelled'
);

create type public.procurement_status as enum (
  'planned',
  'ordered',
  'delivered',
  'cancelled'
);

create type public.expense_category as enum (
  'materials',
  'labor',
  'equipment',
  'overhead',
  'other'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.project_funding_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_type public.funding_source_type not null,
  source_name text,
  amount numeric(14, 2) not null,
  expected_date date,
  received_date date,
  status public.funding_entry_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_funding_entries_amount_positive check (amount > 0),
  constraint project_funding_entries_received_date_when_received check (
    status <> 'received'
    or received_date is not null
  )
);

create table public.project_procurement_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_id uuid references public.phases (id) on delete set null,
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'unit',
  estimated_cost numeric(14, 2) not null default 0,
  needed_by_date date,
  supplier text,
  status public.procurement_status not null default 'planned',
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_procurement_items_description_not_blank check (
    char_length(trim(description)) > 0
  ),
  constraint project_procurement_items_quantity_positive check (quantity > 0),
  constraint project_procurement_items_estimated_cost_non_negative check (
    estimated_cost >= 0
  )
);

create table public.project_staff (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_id uuid references public.phases (id) on delete set null,
  full_name text not null,
  role_title text not null,
  qualifications text,
  headcount integer not null default 1,
  is_contractor boolean not null default false,
  start_date date,
  end_date date,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_staff_full_name_not_blank check (
    char_length(trim(full_name)) > 0
  ),
  constraint project_staff_role_title_not_blank check (
    char_length(trim(role_title)) > 0
  ),
  constraint project_staff_headcount_positive check (headcount >= 1),
  constraint project_staff_end_after_start check (
    end_date is null
    or start_date is null
    or end_date >= start_date
  )
);

create table public.project_expense_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_id uuid references public.phases (id) on delete set null,
  category public.expense_category not null,
  description text not null,
  planned_amount numeric(14, 2) not null,
  actual_amount numeric(14, 2),
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_expense_lines_description_not_blank check (
    char_length(trim(description)) > 0
  ),
  constraint project_expense_lines_planned_amount_positive check (
    planned_amount > 0
  ),
  constraint project_expense_lines_actual_amount_non_negative check (
    actual_amount is null
    or actual_amount >= 0
  )
);

create index project_funding_entries_project_id_idx
  on public.project_funding_entries (project_id);

create index project_procurement_items_project_id_idx
  on public.project_procurement_items (project_id);

create index project_procurement_items_phase_id_idx
  on public.project_procurement_items (phase_id);

create index project_staff_project_id_idx on public.project_staff (project_id);

create index project_staff_phase_id_idx on public.project_staff (phase_id);

create index project_expense_lines_project_id_idx
  on public.project_expense_lines (project_id);

create index project_expense_lines_phase_id_idx
  on public.project_expense_lines (phase_id);

comment on table public.project_funding_entries is
  'Incoming project funding by source, amount, and receipt date';

comment on table public.project_procurement_items is
  'Project procurement plan items with delivery tracking';

comment on table public.project_staff is
  'Operational project staff roster (not system login accounts)';

comment on table public.project_expense_lines is
  'Non-WBS overhead expense plan lines; WBS costs live on tasks/phases';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger project_funding_entries_set_updated_at
  before update on public.project_funding_entries
  for each row execute function public.set_updated_at();

create trigger project_procurement_items_set_updated_at
  before update on public.project_procurement_items
  for each row execute function public.set_updated_at();

create trigger project_staff_set_updated_at
  before update on public.project_staff
  for each row execute function public.set_updated_at();

create trigger project_expense_lines_set_updated_at
  before update on public.project_expense_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.project_funding_entries enable row level security;
alter table public.project_procurement_items enable row level security;
alter table public.project_staff enable row level security;
alter table public.project_expense_lines enable row level security;

-- Read: anyone who can access the project
create policy "Users read accessible project funding entries"
  on public.project_funding_entries for select
  using (public.can_access_project(project_id));

create policy "Users read accessible project procurement items"
  on public.project_procurement_items for select
  using (public.can_access_project(project_id));

create policy "Users read accessible project staff"
  on public.project_staff for select
  using (public.can_access_project(project_id));

create policy "Users read accessible project expense lines"
  on public.project_expense_lines for select
  using (public.can_access_project(project_id));

-- Write: Pattern A (director / factory manager / assigned PM)
create policy "Directors manage all project funding entries"
  on public.project_funding_entries for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

create policy "Factory managers manage factory project funding entries"
  on public.project_funding_entries for all
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

create policy "PMs manage assigned project funding entries"
  on public.project_funding_entries for all
  using (public.is_auth_active() and public.is_assigned_pm(project_id))
  with check (public.is_auth_active() and public.is_assigned_pm(project_id));

create policy "Directors manage all project procurement items"
  on public.project_procurement_items for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

create policy "Factory managers manage factory project procurement items"
  on public.project_procurement_items for all
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

create policy "PMs manage assigned project procurement items"
  on public.project_procurement_items for all
  using (public.is_auth_active() and public.is_assigned_pm(project_id))
  with check (public.is_auth_active() and public.is_assigned_pm(project_id));

create policy "Directors manage all project staff"
  on public.project_staff for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

create policy "Factory managers manage factory project staff"
  on public.project_staff for all
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

create policy "PMs manage assigned project staff"
  on public.project_staff for all
  using (public.is_auth_active() and public.is_assigned_pm(project_id))
  with check (public.is_auth_active() and public.is_assigned_pm(project_id));

create policy "Directors manage all project expense lines"
  on public.project_expense_lines for all
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

create policy "Factory managers manage factory project expense lines"
  on public.project_expense_lines for all
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

create policy "PMs manage assigned project expense lines"
  on public.project_expense_lines for all
  using (public.is_auth_active() and public.is_assigned_pm(project_id))
  with check (public.is_auth_active() and public.is_assigned_pm(project_id));

-- ---------------------------------------------------------------------------
-- Financial snapshot RPC
-- ---------------------------------------------------------------------------

create or replace function public.get_project_financial_snapshot(p_project_id uuid)
returns table (
  approved_budget numeric,
  funding_planned numeric,
  funding_received numeric,
  expense_plan_wbs numeric,
  expense_plan_overhead numeric,
  expense_plan_total numeric,
  spent_wbs numeric,
  spent_overhead numeric,
  spent_total numeric,
  funding_gap numeric,
  budget_remaining numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with project_row as (
    select p.budget
    from public.projects p
    where p.id = p_project_id
  ),
  funding as (
    select
      coalesce(
        sum(fe.amount) filter (where fe.status <> 'cancelled'),
        0
      ) as planned,
      coalesce(
        sum(fe.amount) filter (where fe.status = 'received'),
        0
      ) as received
    from public.project_funding_entries fe
    where fe.project_id = p_project_id
  ),
  wbs as (
    select
      coalesce(sum(ph.expected_budget), 0) as plan,
      coalesce(sum(t.actual_cost), 0) as spent
    from public.phases ph
    left join public.tasks t on t.phase_id = ph.id
    where ph.project_id = p_project_id
  ),
  overhead as (
    select
      coalesce(sum(el.planned_amount), 0) as plan,
      coalesce(
        sum(coalesce(el.actual_amount, el.planned_amount)),
        0
      ) as spent
    from public.project_expense_lines el
    where el.project_id = p_project_id
  )
  select
    pr.budget as approved_budget,
    f.planned as funding_planned,
    f.received as funding_received,
    w.plan as expense_plan_wbs,
    o.plan as expense_plan_overhead,
    w.plan + o.plan as expense_plan_total,
    w.spent as spent_wbs,
    o.spent as spent_overhead,
    w.spent + o.spent as spent_total,
    case
      when pr.budget is null then null
      else pr.budget - f.received
    end as funding_gap,
    case
      when pr.budget is null then null
      else pr.budget - (w.spent + o.spent)
    end as budget_remaining
  from project_row pr
  cross join funding f
  cross join wbs w
  cross join overhead o;
$$;

grant execute on function public.get_project_financial_snapshot(uuid) to authenticated;
revoke all on function public.get_project_financial_snapshot(uuid) from public;

-- ---------------------------------------------------------------------------
-- Projects list financial summary
-- ---------------------------------------------------------------------------

create or replace function public.get_projects_financial_summary()
returns table (
  project_id uuid,
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
    p.id as project_id,
    coalesce(f.received, 0) as funding_received,
    case
      when p.budget is null or p.budget <= 0 then null
      else round(
        (coalesce(w.spent, 0) + coalesce(o.spent, 0)) / p.budget * 100,
        2
      )
    end as budget_used_pct,
    (
      p.budget is not null
      and coalesce(f.received, 0) < p.budget - 0.009
    ) as has_funding_gap,
    coalesce(proc.open_count, 0) as open_procurement_count,
    coalesce(proc.overdue_count, 0) as overdue_procurement_count
  from public.projects p
  left join lateral (
    select coalesce(
      sum(fe.amount) filter (where fe.status = 'received'),
      0
    ) as received
    from public.project_funding_entries fe
    where fe.project_id = p.id
  ) f on true
  left join lateral (
    select coalesce(sum(t.actual_cost), 0) as spent
    from public.tasks t
    where t.project_id = p.id
  ) w on true
  left join lateral (
    select coalesce(
      sum(coalesce(el.actual_amount, el.planned_amount)),
      0
    ) as spent
    from public.project_expense_lines el
    where el.project_id = p.id
  ) o on true
  left join lateral (
    select
      count(*) filter (
        where pi.status not in ('delivered', 'cancelled')
      )::bigint as open_count,
      count(*) filter (
        where pi.needed_by_date is not null
          and pi.needed_by_date < current_date
          and pi.status not in ('delivered', 'cancelled')
      )::bigint as overdue_count
    from public.project_procurement_items pi
    where pi.project_id = p.id
  ) proc on true;
$$;

grant execute on function public.get_projects_financial_summary() to authenticated;
revoke all on function public.get_projects_financial_summary() from public;

-- ---------------------------------------------------------------------------
-- Dashboard RPC extensions (drop required when OUT columns change)
-- ---------------------------------------------------------------------------

drop function if exists public.get_dashboard_insights();
drop function if exists public.get_dashboard_projects();

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
  underfunded_project_count bigint,
  overdue_procurement_count bigint,
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
      p.budget,
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
  funding_by_project as (
    select
      fe.project_id,
      coalesce(
        sum(fe.amount) filter (where fe.status = 'received'),
        0
      ) as received
    from public.project_funding_entries fe
    group by fe.project_id
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
      select count(*)
      from project_rows pr
      left join funding_by_project fb on fb.project_id = pr.id
      where pr.budget is not null
        and coalesce(fb.received, 0) < pr.budget - 0.009
    )::bigint as underfunded_project_count,
    (
      select count(*)
      from public.project_procurement_items pi
      where pi.needed_by_date is not null
        and pi.needed_by_date < current_date
        and pi.status not in ('delivered', 'cancelled')
    )::bigint as overdue_procurement_count,
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
  left join lateral (
    select *
    from public.get_projects_financial_summary() gfs
    where gfs.project_id = p.id
  ) fin on true
  order by p.updated_at desc;
$$;

grant execute on function public.get_dashboard_insights() to authenticated;
grant execute on function public.get_dashboard_projects() to authenticated;

revoke all on function public.get_dashboard_insights() from public;
revoke all on function public.get_dashboard_projects() from public;
