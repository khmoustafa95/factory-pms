-- Currencies table for configurable project currencies
create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_ar text not null,
  symbol text not null default '',
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one default currency at a time
create unique index currencies_single_default on public.currencies (is_default) where is_default = true;

alter table public.currencies enable row level security;

-- Everyone can read currencies
create policy "currencies_select" on public.currencies
  for select to authenticated using (true);

-- Only directors can manage currencies
create policy "currencies_insert" on public.currencies
  for insert to authenticated
  with check (public.is_company_director());

create policy "currencies_update" on public.currencies
  for update to authenticated
  using (public.is_company_director())
  with check (public.is_company_director());

create policy "currencies_delete" on public.currencies
  for delete to authenticated
  using (public.is_company_director());

-- Grant API privileges
grant select on public.currencies to authenticated;
grant insert, update, delete on public.currencies to authenticated;
grant select on public.currencies to anon;

-- Change default currency from SAR to USD in projects table
alter table public.projects alter column currency set default 'USD';

-- Seed USD as the default currency
insert into public.currencies (code, name_en, name_ar, symbol, is_default, sort_order)
values ('USD', 'US Dollar', 'دولار أمريكي', '$', true, 0);
