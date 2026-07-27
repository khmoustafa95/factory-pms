-- Project proposal attachments + PM review/approve on proposed projects

-- ---------------------------------------------------------------------------
-- Attachments metadata
-- ---------------------------------------------------------------------------

create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint project_attachments_file_name_not_blank check (char_length(trim(file_name)) > 0),
  constraint project_attachments_storage_path_not_blank check (char_length(trim(storage_path)) > 0),
  constraint project_attachments_file_size_non_negative check (
    file_size_bytes is null or file_size_bytes >= 0
  )
);

create index project_attachments_project_id_idx
  on public.project_attachments (project_id);

create index project_attachments_uploaded_by_idx
  on public.project_attachments (uploaded_by);

comment on table public.project_attachments is
  'Supporting files for project proposals (budget sheets, workforce plans, etc.)';

-- Proposed projects must have an assigned PM so they can review/approve.
-- Backfill any existing proposed rows that lack a PM (assign first factory PM).
update public.projects p
set assigned_pm_id = (
  select pr.id
  from public.profiles pr
  where pr.factory_id = p.factory_id
    and pr.role = 'project_manager'
    and pr.is_active = true
  order by pr.created_at asc
  limit 1
)
where p.status = 'proposed'
  and p.assigned_pm_id is null;

alter table public.projects
  drop constraint if exists projects_proposed_requires_pm;

alter table public.projects
  add constraint projects_proposed_requires_pm check (
    status <> 'proposed'::public.project_status
    or assigned_pm_id is not null
  );

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_access_project(p_project_id uuid)
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
      or public.is_assigned_pm(p_project_id)
      or exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and public.get_auth_role() = 'factory_manager'
          and p.factory_id = public.get_auth_factory_id()
      )
    );
$$;

revoke all on function public.can_access_project(uuid) from public;
grant execute on function public.can_access_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- PM may update assigned proposed projects (approve / reject)
-- ---------------------------------------------------------------------------

drop policy if exists "PMs update assigned in-progress projects" on public.projects;
create policy "PMs update assigned projects"
  on public.projects for update
  using (
    public.is_auth_active()
    and public.is_assigned_pm(id)
    and status in ('proposed', 'approved', 'in_progress', 'paused')
  )
  with check (
    public.is_auth_active()
    and public.is_assigned_pm(id)
    and status in ('proposed', 'approved', 'rejected', 'in_progress', 'paused')
  );

-- ---------------------------------------------------------------------------
-- Attachments RLS
-- ---------------------------------------------------------------------------

alter table public.project_attachments enable row level security;

create policy "Users read accessible project attachments"
  on public.project_attachments for select
  using (public.can_access_project(project_id));

create policy "Factory managers insert factory project attachments"
  on public.project_attachments for insert
  with check (
    public.is_auth_active()
    and uploaded_by = auth.uid()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
        and p.status in ('draft', 'proposed', 'rejected', 'approved', 'in_progress', 'paused')
    )
  );

create policy "Directors insert project attachments"
  on public.project_attachments for insert
  with check (
    public.is_auth_active()
    and public.is_company_director()
    and uploaded_by = auth.uid()
  );

create policy "Factory managers delete factory project attachments"
  on public.project_attachments for delete
  using (
    public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
        and p.status in ('draft', 'proposed', 'rejected', 'approved', 'in_progress', 'paused')
    )
  );

create policy "Directors delete project attachments"
  on public.project_attachments for delete
  using (public.is_auth_active() and public.is_company_director());

create policy "Uploaders delete own attachments"
  on public.project_attachments for delete
  using (public.is_auth_active() and uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket (private) for proposal files
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-attachments',
  'project-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Path convention: {project_id}/{uuid}-{filename}

create policy "Users read accessible project attachment files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-attachments'
    and public.can_access_project((storage.foldername(name))[1]::uuid)
  );

create policy "Factory managers upload project attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = (storage.foldername(name))[1]::uuid
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    )
  );

create policy "Directors upload project attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and public.is_company_director()
  );

create policy "Factory managers delete project attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and exists (
      select 1
      from public.projects p
      where p.id = (storage.foldername(name))[1]::uuid
        and public.get_auth_role() = 'factory_manager'
        and p.factory_id = public.get_auth_factory_id()
    )
  );

create policy "Directors delete project attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-attachments'
    and public.is_auth_active()
    and public.is_company_director()
  );
