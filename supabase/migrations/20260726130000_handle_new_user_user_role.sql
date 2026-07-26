-- Avoid colliding with Auth JWT `role` claim: provision via app_metadata.user_role

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_factory_id uuid;
begin
  v_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'user_role', '')::public.user_role,
    nullif(new.raw_app_meta_data ->> 'role', '')::public.user_role,
    'project_manager'
  );

  -- Ignore Auth JWT role values if they leaked into app_metadata.role
  if v_role::text not in (
    'company_director',
    'factory_manager',
    'project_manager'
  ) then
    v_role := 'project_manager';
  end if;

  v_factory_id := nullif(new.raw_app_meta_data ->> 'factory_id', '')::uuid;

  if v_role = 'company_director' then
    v_factory_id := null;
  elsif v_factory_id is null then
    raise exception 'User provisioning requires factory_id in app_metadata for role %', v_role
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email, full_name, role, factory_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    v_role,
    v_factory_id
  );

  return new;
end;
$$;
