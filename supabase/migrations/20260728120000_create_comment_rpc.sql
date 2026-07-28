-- Create comments through RPC to keep write-path server-driven.

create or replace function public.create_comment(
  p_entity_type public.entity_type,
  p_entity_id uuid,
  p_body text
)
returns public.comments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_author_id uuid;
  v_body text;
  v_comment public.comments;
begin
  v_author_id := auth.uid();

  if v_author_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_body := trim(coalesce(p_body, ''));

  if length(v_body) = 0 then
    raise exception 'Comment body is required' using errcode = '23514';
  end if;

  insert into public.comments (entity_type, entity_id, author_id, body)
  values (p_entity_type, p_entity_id, v_author_id, v_body)
  returning * into v_comment;

  return v_comment;
end;
$$;

grant execute on function public.create_comment(public.entity_type, uuid, text) to authenticated;

