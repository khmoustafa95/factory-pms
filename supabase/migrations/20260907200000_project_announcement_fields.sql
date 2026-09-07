-- Announcement / tender metadata on projects, plus director catalog import RLS.

create type public.project_priority as enum ('high', 'medium', 'low');

alter table public.projects
  add column if not exists announcement_date date,
  add column if not exists announcing_entity text,
  add column if not exists priority public.project_priority,
  add column if not exists research_opinion text,
  add column if not exists board_opinion text;

comment on column public.projects.announcement_date is
  'Tender / announcement date (تاريخ الطرح)';
comment on column public.projects.announcing_entity is
  'Entity that announced the tender (الجهة الطارحة)';
comment on column public.projects.priority is
  'Project priority: high, medium, or low';
comment on column public.projects.research_opinion is
  'Scientific research opinion (free text)';
comment on column public.projects.board_opinion is
  'Board of directors opinion (free text)';

drop policy if exists "Directors select non-draft projects" on public.projects;
drop policy if exists "Directors update non-draft projects" on public.projects;
drop policy if exists "Directors select all projects" on public.projects;
drop policy if exists "Directors insert projects" on public.projects;
drop policy if exists "Directors update all projects" on public.projects;

create policy "Directors select all projects"
  on public.projects for select
  using (
    public.is_company_director()
    and public.is_auth_active()
  );

create policy "Directors insert projects"
  on public.projects for insert
  with check (
    public.is_company_director()
    and public.is_auth_active()
  );

create policy "Directors update all projects"
  on public.projects for update
  using (
    public.is_company_director()
    and public.is_auth_active()
  )
  with check (
    public.is_company_director()
    and public.is_auth_active()
  );
