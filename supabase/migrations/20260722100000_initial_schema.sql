-- Enterprise PMS — initial schema (from Notion PRD)
-- Apply via Supabase SQL editor or `supabase db push`

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum (
  'company_director',
  'factory_manager',
  'project_manager'
);

create type public.project_status as enum (
  'draft',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'paused'
);

create type public.phase_status as enum (
  'pending',
  'in_progress',
  'completed'
);

create type public.task_status as enum (
  'todo',
  'in_progress',
  'blocked',
  'done'
);

create type public.entity_type as enum (
  'project',
  'phase',
  'task'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null,
  factory_id uuid references public.factories (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_factory_required_for_factory_roles check (
    role = 'company_director'
    or factory_id is not null
  ),
  constraint profiles_director_no_factory check (
    role <> 'company_director'
    or factory_id is null
  )
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories (id) on delete restrict,
  title text not null,
  description text,
  status public.project_status not null default 'draft',
  budget numeric(14, 2),
  currency text not null default 'SAR',
  proposed_start_date date,
  proposed_end_date date,
  actual_start_date date,
  actual_end_date date,
  proposed_by uuid references public.profiles (id) on delete set null,
  assigned_pm_id uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  progress_percent numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_rejection_reason_when_rejected check (
    status <> 'rejected'
    or (rejection_reason is not null and length(trim(rejection_reason)) > 0)
  )
);

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  weight_percent numeric(5, 2) not null default 0,
  status public.phase_status not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phases_weight_range check (
    weight_percent >= 0
    and weight_percent <= 100
  )
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_id uuid not null references public.phases (id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  blocked_reason text,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_blocked_reason_required check (
    status <> 'blocked'
    or (blocked_reason is not null and length(trim(blocked_reason)) > 0)
  )
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_body_not_empty check (length(trim(body)) > 0)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index profiles_factory_id_idx on public.profiles (factory_id);
create index profiles_role_idx on public.profiles (role);
create index projects_factory_id_idx on public.projects (factory_id);
create index projects_status_idx on public.projects (status);
create index projects_assigned_pm_id_idx on public.projects (assigned_pm_id);
create index phases_project_id_idx on public.phases (project_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_phase_id_idx on public.tasks (phase_id);
create index tasks_status_idx on public.tasks (status);
create index comments_entity_idx on public.comments (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Helpers (RLS) — after tables they reference
-- ---------------------------------------------------------------------------

create or replace function public.get_auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_auth_factory_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select factory_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_company_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_auth_role() = 'company_director';
$$;

create or replace function public.is_assigned_pm(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.assigned_pm_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger factories_set_updated_at
  before update on public.factories
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger phases_set_updated_at
  before update on public.phases
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: auto-create profile row on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'project_manager'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.factories enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.phases enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;

-- Factories
create policy "Directors manage all factories"
  on public.factories for all
  using (public.is_company_director())
  with check (public.is_company_director());

create policy "Users read accessible factories"
  on public.factories for select
  using (
    public.is_company_director()
    or id = public.get_auth_factory_id()
  );

-- Profiles
create policy "Users read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Directors read all profiles"
  on public.profiles for select
  using (public.is_company_director());

create policy "Factory managers read factory profiles"
  on public.profiles for select
  using (
    public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

create policy "Users update own profile name"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and factory_id is not distinct from (select factory_id from public.profiles where id = auth.uid())
  );

create policy "Directors manage profiles"
  on public.profiles for all
  using (public.is_company_director())
  with check (public.is_company_director());

-- Projects
create policy "Directors access all projects"
  on public.projects for all
  using (public.is_company_director())
  with check (public.is_company_director());

create policy "Factory managers access own factory projects"
  on public.projects for all
  using (
    public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  )
  with check (
    public.get_auth_role() = 'factory_manager'
    and factory_id = public.get_auth_factory_id()
  );

create policy "PMs read assigned projects"
  on public.projects for select
  using (public.is_assigned_pm(id));

create policy "PMs update assigned in-progress projects"
  on public.projects for update
  using (
    public.is_assigned_pm(id)
    and status in ('approved', 'in_progress', 'paused')
  )
  with check (public.is_assigned_pm(id));

-- Phases
create policy "Directors manage all phases"
  on public.phases for all
  using (public.is_company_director())
  with check (public.is_company_director());

create policy "Factory managers manage factory phases"
  on public.phases for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

create policy "PMs manage assigned project phases"
  on public.phases for all
  using (public.is_assigned_pm(project_id))
  with check (public.is_assigned_pm(project_id));

-- Tasks
create policy "Directors manage all tasks"
  on public.tasks for all
  using (public.is_company_director())
  with check (public.is_company_director());

create policy "Factory managers manage factory tasks"
  on public.tasks for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.factory_id = public.get_auth_factory_id()
        and public.get_auth_role() = 'factory_manager'
    )
  );

create policy "PMs manage assigned project tasks"
  on public.tasks for all
  using (public.is_assigned_pm(project_id))
  with check (public.is_assigned_pm(project_id));

-- Comments
create policy "Directors manage all comments"
  on public.comments for all
  using (public.is_company_director())
  with check (public.is_company_director());

create policy "Authenticated users read comments on accessible entities"
  on public.comments for select
  using (
    (
      entity_type = 'project'
      and exists (
        select 1 from public.projects p
        where p.id = entity_id
          and (
            public.is_company_director()
            or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
            or public.is_assigned_pm(p.id)
          )
      )
    )
    or (
      entity_type = 'phase'
      and exists (
        select 1
        from public.phases ph
        join public.projects p on p.id = ph.project_id
        where ph.id = entity_id
          and (
            public.is_company_director()
            or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
            or public.is_assigned_pm(p.id)
          )
      )
    )
    or (
      entity_type = 'task'
      and exists (
        select 1
        from public.tasks t
        join public.projects p on p.id = t.project_id
        where t.id = entity_id
          and (
            public.is_company_director()
            or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
            or public.is_assigned_pm(p.id)
          )
      )
    )
  );

create policy "Authenticated users insert comments on accessible entities"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and (
      (
        entity_type = 'project'
        and exists (
          select 1 from public.projects p
          where p.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
            )
        )
      )
      or (
        entity_type = 'phase'
        and exists (
          select 1
          from public.phases ph
          join public.projects p on p.id = ph.project_id
          where ph.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
            )
        )
      )
      or (
        entity_type = 'task'
        and exists (
          select 1
          from public.tasks t
          join public.projects p on p.id = t.project_id
          where t.id = entity_id
            and (
              public.is_company_director()
              or (public.get_auth_role() = 'factory_manager' and p.factory_id = public.get_auth_factory_id())
              or public.is_assigned_pm(p.id)
            )
        )
      )
    )
  );

create policy "Authors update own comments"
  on public.comments for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Authors delete own comments"
  on public.comments for delete
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
