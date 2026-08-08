-- Supabase default function privileges can explicitly include `anon`.
-- Host mutations must never be callable through the public guest role.
revoke execute on function public.create_majlis_room() from anon;
revoke execute on function public.update_majlis_room(uuid, text, jsonb) from anon;
revoke execute on function public.close_majlis_room(uuid) from anon;

grant execute on function public.create_majlis_room() to authenticated;
grant execute on function public.update_majlis_room(uuid, text, jsonb) to authenticated;
grant execute on function public.close_majlis_room(uuid) to authenticated;
