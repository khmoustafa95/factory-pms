-- Add consultation to project_status (must commit before use in later migration).

do $$
begin
  alter type public.project_status add value 'consultation';
exception
  when duplicate_object then null;
end $$;
