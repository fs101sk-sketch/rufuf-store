-- Majlis live rooms: host-owned rooms with passwordless guest identities.
-- Apply through Supabase migrations. Tables are deliberately inaccessible
-- directly; all access is limited to the SECURITY DEFINER RPCs below.

create table if not exists public.majlis_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[0-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  realtime_topic text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'playing', 'finished', 'closed')),
  max_players smallint not null default 50 check (max_players between 2 and 100),
  public_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 hours')
);

create index if not exists majlis_rooms_host_status_idx
  on public.majlis_rooms (host_user_id, status, created_at desc);

create unique index if not exists majlis_rooms_one_active_per_host_idx
  on public.majlis_rooms (host_user_id)
  where status in ('lobby', 'playing');

create index if not exists majlis_rooms_active_code_idx
  on public.majlis_rooms (room_code, expires_at)
  where status in ('lobby', 'playing');

create table if not exists public.majlis_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.majlis_rooms(id) on delete cascade,
  guest_token_hash text not null check (char_length(guest_token_hash) = 64),
  display_name text not null check (char_length(display_name) between 1 and 20),
  avatar text not null,
  team text check (team in ('a', 'b')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (room_id, guest_token_hash)
);

create unique index if not exists majlis_room_players_name_unique_idx
  on public.majlis_room_players (room_id, lower(display_name))
  where active;

create index if not exists majlis_room_players_room_idx
  on public.majlis_room_players (room_id, joined_at)
  where active;

alter table public.majlis_rooms enable row level security;
alter table public.majlis_room_players enable row level security;

revoke all on table public.majlis_rooms from anon, authenticated;
revoke all on table public.majlis_room_players from anon, authenticated;

create or replace function private.set_majlis_room_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists majlis_rooms_set_updated_at on public.majlis_rooms;
create trigger majlis_rooms_set_updated_at
before update on public.majlis_rooms
for each row execute function private.set_majlis_room_updated_at();

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

create or replace function public.check_majlis_room(p_room_code text)
returns table (
  room_id uuid,
  room_code text,
  room_status text,
  player_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         r.room_code,
         r.status,
         count(p.id) filter (where p.active)
    from public.majlis_rooms as r
    left join public.majlis_room_players as p on p.room_id = r.id
   where r.room_code = trim(p_room_code)
     and r.status in ('lobby', 'playing')
     and r.expires_at > now()
   group by r.id, r.room_code, r.status;
$$;

create or replace function public.join_majlis_room(
  p_room_code text,
  p_display_name text,
  p_avatar text,
  p_guest_token text
)
returns table (
  room_id uuid,
  room_code text,
  room_status text,
  realtime_topic text,
  player_id uuid,
  display_name text,
  avatar text,
  public_state jsonb,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.majlis_rooms%rowtype;
  v_player public.majlis_room_players%rowtype;
  v_name text := trim(coalesce(p_display_name, ''));
  v_token_hash text;
begin
  if trim(coalesce(p_room_code, '')) !~ '^[0-9]{6}$' then
    raise exception using errcode = 'P0001', message = 'ROOM_NOT_FOUND';
  end if;

  if coalesce(p_guest_token, '') !~ '^[A-Za-z0-9_-]{40,128}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_GUEST_TOKEN';
  end if;

  if char_length(v_name) not between 1 and 20 or v_name ~ '[[:cntrl:]<>]' then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAYER_NAME';
  end if;

  if not (p_avatar = any (array[
    '🦊','🐯','🦁','🐼','🐨','🐸',
    '🐵','🐧','🦄','🐺','🐰','🐙'
  ]::text[])) then
    raise exception using errcode = 'P0001', message = 'INVALID_AVATAR';
  end if;

  select r.* into v_room
    from public.majlis_rooms as r
   where r.room_code = trim(p_room_code)
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ROOM_NOT_FOUND';
  end if;

  if v_room.status not in ('lobby', 'playing') or v_room.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'ROOM_CLOSED';
  end if;

  v_token_hash := encode(extensions.digest(p_guest_token, 'sha256'), 'hex');

  if exists (
    select 1
      from public.majlis_room_players as p
     where p.room_id = v_room.id
       and p.active
       and lower(p.display_name) = lower(v_name)
       and p.guest_token_hash <> v_token_hash
  ) then
    raise exception using errcode = 'P0001', message = 'PLAYER_NAME_TAKEN';
  end if;

  if not exists (
    select 1
      from public.majlis_room_players as p
     where p.room_id = v_room.id
       and p.guest_token_hash = v_token_hash
  ) and (
    select count(*)
      from public.majlis_room_players as p
     where p.room_id = v_room.id
       and p.active
  ) >= v_room.max_players then
    raise exception using errcode = 'P0001', message = 'ROOM_FULL';
  end if;

  insert into public.majlis_room_players as p (
    room_id,
    guest_token_hash,
    display_name,
    avatar,
    active,
    last_seen
  ) values (
    v_room.id,
    v_token_hash,
    v_name,
    p_avatar,
    true,
    now()
  )
  on conflict on constraint majlis_room_players_room_id_guest_token_hash_key do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar,
        active = true,
        last_seen = now()
  returning p.* into v_player;

  return query
  select v_room.id, v_room.room_code, v_room.status,
         v_room.realtime_topic, v_player.id, v_player.display_name,
         v_player.avatar, v_room.public_state, v_room.expires_at;
end;
$$;

create or replace function public.list_majlis_room_players(
  p_room_id uuid,
  p_guest_token text
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  team text,
  joined_at timestamptz,
  last_seen timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_allowed boolean := false;
  v_token_hash text;
begin
  select exists (
    select 1 from public.majlis_rooms as r
     where r.id = p_room_id
       and r.host_user_id = (select auth.uid())
  ) into v_allowed;

  if not v_allowed and coalesce(p_guest_token, '') ~ '^[A-Za-z0-9_-]{40,128}$' then
    v_token_hash := encode(extensions.digest(p_guest_token, 'sha256'), 'hex');
    select exists (
      select 1 from public.majlis_room_players as p
       where p.room_id = p_room_id
         and p.guest_token_hash = v_token_hash
         and p.active
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'ROOM_ACCESS_DENIED';
  end if;

  return query
  select p.id, p.display_name, p.avatar, p.team, p.joined_at, p.last_seen
    from public.majlis_room_players as p
   where p.room_id = p_room_id and p.active
   order by p.joined_at;
end;
$$;

create or replace function public.get_majlis_room_snapshot(
  p_room_id uuid,
  p_guest_token text
)
returns table (
  room_id uuid,
  room_code text,
  room_status text,
  realtime_topic text,
  public_state jsonb,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room public.majlis_rooms%rowtype;
  v_allowed boolean := false;
  v_token_hash text;
begin
  select r.* into v_room from public.majlis_rooms as r where r.id = p_room_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ROOM_NOT_FOUND';
  end if;

  v_allowed := v_room.host_user_id = (select auth.uid());
  if not v_allowed and coalesce(p_guest_token, '') ~ '^[A-Za-z0-9_-]{40,128}$' then
    v_token_hash := encode(extensions.digest(p_guest_token, 'sha256'), 'hex');
    select exists (
      select 1 from public.majlis_room_players as p
       where p.room_id = v_room.id
         and p.guest_token_hash = v_token_hash
         and p.active
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'ROOM_ACCESS_DENIED';
  end if;

  return query
  select v_room.id, v_room.room_code, v_room.status,
         v_room.realtime_topic, v_room.public_state, v_room.expires_at;
end;
$$;

create or replace function public.update_majlis_room(
  p_room_id uuid,
  p_room_status text,
  p_public_state jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_room_status not in ('lobby', 'playing', 'finished') then
    raise exception using errcode = 'P0001', message = 'INVALID_ROOM_STATUS';
  end if;

  update public.majlis_rooms
     set status = p_room_status,
         public_state = coalesce(p_public_state, '{}'::jsonb),
         expires_at = greatest(expires_at, now() + interval '2 hours')
   where id = p_room_id
     and host_user_id = (select auth.uid())
     and (select private.has_majlis_access());

  if not found then
    raise exception using errcode = 'P0001', message = 'HOST_NOT_AUTHORIZED';
  end if;
end;
$$;

create or replace function public.close_majlis_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.majlis_rooms
     set status = 'closed'
   where id = p_room_id
     and host_user_id = (select auth.uid());

  if not found then
    raise exception using errcode = 'P0001', message = 'HOST_NOT_AUTHORIZED';
  end if;
end;
$$;

create or replace function public.leave_majlis_room(
  p_room_id uuid,
  p_guest_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_hash text;
begin
  if coalesce(p_guest_token, '') !~ '^[A-Za-z0-9_-]{40,128}$' then
    return;
  end if;
  v_token_hash := encode(extensions.digest(p_guest_token, 'sha256'), 'hex');
  update public.majlis_room_players
     set active = false,
         last_seen = now()
   where room_id = p_room_id
     and guest_token_hash = v_token_hash;
end;
$$;

revoke all on function public.create_majlis_room() from public, anon, authenticated;
revoke all on function public.check_majlis_room(text) from public, anon, authenticated;
revoke all on function public.join_majlis_room(text, text, text, text) from public, anon, authenticated;
revoke all on function public.list_majlis_room_players(uuid, text) from public, anon, authenticated;
revoke all on function public.get_majlis_room_snapshot(uuid, text) from public, anon, authenticated;
revoke all on function public.update_majlis_room(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.close_majlis_room(uuid) from public, anon, authenticated;
revoke all on function public.leave_majlis_room(uuid, text) from public, anon, authenticated;

grant execute on function public.create_majlis_room() to authenticated;
grant execute on function public.update_majlis_room(uuid, text, jsonb) to authenticated;
grant execute on function public.close_majlis_room(uuid) to authenticated;

grant execute on function public.check_majlis_room(text) to anon, authenticated;
grant execute on function public.join_majlis_room(text, text, text, text) to anon, authenticated;
grant execute on function public.list_majlis_room_players(uuid, text) to anon, authenticated;
grant execute on function public.get_majlis_room_snapshot(uuid, text) to anon, authenticated;
grant execute on function public.leave_majlis_room(uuid, text) to anon, authenticated;
