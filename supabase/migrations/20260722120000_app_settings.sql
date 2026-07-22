-- App-wide branding and general settings (singleton row)

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  app_name_en text not null default 'Projects System Management',
  app_name_ar text not null default 'نظام إدارة المشاريع',
  app_short_name_en text not null default 'PMS',
  app_short_name_ar text not null default 'نظام المشاريع',
  logo_url text,
  sign_in_description_en text not null default 'Projects System Management — factory leadership portal',
  sign_in_description_ar text not null default 'نظام إدارة المشاريع — بوابة قيادة المصانع',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.app_settings (id) values (1);

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_app_settings_updated_at();

alter table public.app_settings enable row level security;

create policy "Anyone can read app settings"
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

create policy "Company directors can update app settings"
  on public.app_settings
  for update
  to authenticated
  using (public.is_company_director())
  with check (public.is_company_director());

-- Public bucket for app logo and other branding assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-assets',
  'app-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "Public read access for app assets"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'app-assets');

create policy "Company directors can upload app assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'app-assets'
    and public.is_company_director()
  );

create policy "Company directors can update app assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'app-assets'
    and public.is_company_director()
  )
  with check (
    bucket_id = 'app-assets'
    and public.is_company_director()
  );

create policy "Company directors can delete app assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'app-assets'
    and public.is_company_director()
  );
