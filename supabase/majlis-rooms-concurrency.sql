-- Keep room creation atomic if the same host clicks twice or uses two devices.
create unique index if not exists majlis_rooms_one_active_per_host_idx
  on public.majlis_rooms (host_user_id)
  where status in ('lobby', 'playing');

create or replace function public.create_majlis_room()
returns table (
  room_id uuid,
  room_code text,
  realtime_topic text,
  room_status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_room public.majlis_rooms%rowtype;
  v_attempt integer;
begin
  if (select auth.uid()) is null or not (select private.has_majlis_access()) then
    raise exception using errcode = 'P0001', message = 'HOST_NOT_AUTHORIZED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended((select auth.uid())::text, 0));

  update public.majlis_rooms
     set status = 'closed'
   where host_user_id = (select auth.uid())
     and status in ('lobby', 'playing');

  for v_attempt in 1..25 loop
    v_code := (100000 + floor(random() * 900000)::integer)::text;
    begin
      insert into public.majlis_rooms (
        room_code,
        host_user_id,
        realtime_topic
      ) values (
        v_code,
        (select auth.uid()),
        'majlis-room-' || encode(extensions.gen_random_bytes(20), 'hex')
      )
      returning * into v_room;
      exit;
    exception when unique_violation then
      v_room := null;
    end;
  end loop;

  if v_room.id is null then
    raise exception using errcode = 'P0001', message = 'ROOM_CODE_UNAVAILABLE';
  end if;

  return query
  select v_room.id, v_room.room_code, v_room.realtime_topic,
         v_room.status, v_room.expires_at;
end;
$$;

revoke all on function public.create_majlis_room() from public, anon, authenticated;
grant execute on function public.create_majlis_room() to authenticated;
