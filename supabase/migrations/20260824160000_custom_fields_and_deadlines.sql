-- Custom project fields (company-wide definitions + per-project values)
-- and a calendar RPC for task/phase/project deadlines.

create type public.project_field_type as enum (
  'text',
  'number',
  'date',
  'boolean',
  'select'
);

create table public.project_field_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_en text not null,
  label_ar text not null,
  field_type public.project_field_type not null,
  options text[] not null default '{}',
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_field_definitions_key_format
    check (key ~ '^[a-z][a-z0-9_]{1,31}$'),
  constraint project_field_definitions_select_options
    check (field_type <> 'select' or cardinality(options) > 0)
);

create table public.project_field_values (
  project_id uuid not null references public.projects (id) on delete cascade,
  field_id uuid not null references public.project_field_definitions (id) on delete cascade,
  value text,
  updated_at timestamptz not null default now(),
  primary key (project_id, field_id)
);

create index project_field_values_field_id_idx
  on public.project_field_values (field_id);

alter table public.project_field_definitions enable row level security;
alter table public.project_field_values enable row level security;

create policy "project_field_definitions_select"
  on public.project_field_definitions
  for select to authenticated
  using (public.is_auth_active());

create policy "project_field_definitions_insert"
  on public.project_field_definitions
  for insert to authenticated
  with check (public.is_company_director() and public.is_auth_active());

create policy "project_field_definitions_update"
  on public.project_field_definitions
  for update to authenticated
  using (public.is_company_director() and public.is_auth_active())
  with check (public.is_company_director() and public.is_auth_active());

create policy "project_field_definitions_delete"
  on public.project_field_definitions
  for delete to authenticated
  using (public.is_company_director() and public.is_auth_active());

create policy "project_field_values_select"
  on public.project_field_values
  for select to authenticated
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (
          (
            public.get_auth_role() = 'factory_manager'
            and p.factory_id = public.get_auth_factory_id()
          )
          or public.is_assigned_pm(p.id)
          or (public.is_company_director() and p.status <> 'draft')
        )
    )
  );

create policy "project_field_values_write"
  on public.project_field_values
  for all to authenticated
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (
          (
            public.get_auth_role() = 'factory_manager'
            and p.factory_id = public.get_auth_factory_id()
          )
          or public.is_assigned_pm(p.id)
          or (public.is_company_director() and p.status <> 'draft')
        )
    )
  )
  with check (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (
          (
            public.get_auth_role() = 'factory_manager'
            and p.factory_id = public.get_auth_factory_id()
          )
          or public.is_assigned_pm(p.id)
          or (public.is_company_director() and p.status <> 'draft')
        )
    )
  );

create or replace function public.get_calendar_deadlines(p_from date, p_to date)
returns table (
  kind text,
  id uuid,
  title text,
  due_on date,
  project_id uuid,
  project_title text,
  project_code text,
  status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    'task'::text as kind,
    t.id,
    t.title,
    t.due_date as due_on,
    p.id as project_id,
    p.title as project_title,
    p.code as project_code,
    t.status::text as status
  from public.tasks t
  join public.projects p on p.id = t.project_id
  where t.due_date is not null
    and t.due_date between p_from and p_to
    and (
      p.status <> 'draft'
      or (
        public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
      )
    )

  union all

  select
    'phase'::text,
    ph.id,
    ph.name,
    ph.end_date,
    p.id,
    p.title,
    p.code,
    ph.status::text
  from public.phases ph
  join public.projects p on p.id = ph.project_id
  where ph.end_date is not null
    and ph.end_date between p_from and p_to
    and (
      p.status <> 'draft'
      or (
        public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
      )
    )

  union all

  select
    'project'::text,
    p.id,
    p.title,
    coalesce(p.actual_end_date, p.proposed_end_date),
    p.id,
    p.title,
    p.code,
    p.status::text
  from public.projects p
  where coalesce(p.actual_end_date, p.proposed_end_date) is not null
    and coalesce(p.actual_end_date, p.proposed_end_date) between p_from and p_to
    and (
      p.status <> 'draft'
      or (
        public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
      )
    )

  order by 4, 3;
$$;

revoke all on function public.get_calendar_deadlines(date, date) from public;
grant execute on function public.get_calendar_deadlines(date, date) to authenticated;

grant select, insert, update, delete on public.project_field_definitions
  to authenticated, service_role;
grant select, insert, update, delete on public.project_field_values
  to authenticated, service_role;
