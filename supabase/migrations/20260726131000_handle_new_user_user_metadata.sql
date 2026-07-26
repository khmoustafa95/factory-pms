-- Admin createUser reliably sets user_metadata; app_metadata custom keys are not
-- always visible to on_auth_user_created. Read role/factory from both.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_text text;
  v_role public.user_role;
  v_factory_id uuid;
begin
  v_role_text := coalesce(
    nullif(new.raw_app_meta_data ->> 'user_role', ''),
    nullif(new.raw_user_meta_data ->> 'user_role', ''),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    case
      when (new.raw_app_meta_data ->> 'role') in (
        'company_director',
        'factory_manager',
        'project_manager'
      ) then new.raw_app_meta_data ->> 'role'
      else null
    end,
    'project_manager'
  );

  v_role := v_role_text::public.user_role;

  v_factory_id := coalesce(
    nullif(new.raw_app_meta_data ->> 'factory_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'factory_id', '')::uuid
  );

  if v_role = 'company_director' then
    v_factory_id := null;
  elsif v_factory_id is null then
    raise exception 'User provisioning requires factory_id in metadata for role %', v_role
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
