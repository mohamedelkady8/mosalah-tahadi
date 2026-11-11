-- Hamthalah games platform: schema, security and storage.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.game_type as enum (
  'mcq', 'true_false', 'matching', 'memory', 'scramble', 'fill_blank', 'classify', 'word_search'
);
create type public.game_status as enum ('draft', 'published');
create type public.user_role as enum ('student', 'admin');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  label text not null default 'طلاب',
  subtitle text not null default '',
  icon text not null default 'cap',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Which tracks (sections) exist inside each grade.
create table public.grade_tracks (
  grade_id uuid not null references public.grades (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  primary key (grade_id, track_id)
);
create index grade_tracks_track_idx on public.grade_tracks (track_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  grade_id uuid references public.grades (id) on delete set null,
  track_id uuid references public.tracks (id) on delete set null,
  role public.user_role not null default 'student',
  points int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_grade_track_idx on public.profiles (grade_id, track_id);
create index profiles_track_idx on public.profiles (track_id);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  type public.game_type not null,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  item_count int not null default 0,
  cover_url text,
  topic text,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  status public.game_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index games_status_idx on public.games (status);
create index games_created_by_idx on public.games (created_by);

-- A null track_id means "every track of this grade".
create table public.game_targets (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  grade_id uuid not null references public.grades (id) on delete cascade,
  track_id uuid references public.tracks (id) on delete cascade,
  constraint game_targets_unique unique nulls not distinct (game_id, grade_id, track_id)
);
create index game_targets_grade_track_idx on public.game_targets (grade_id, track_id);
create index game_targets_track_idx on public.game_targets (track_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  score int not null check (score >= 0),
  max_score int not null check (max_score >= 0),
  correct_count int not null default 0,
  total_count int not null default 0,
  duration_ms int not null default 0 check (duration_ms >= 0),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint attempts_score_le_max check (score <= max_score)
);
create index attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index attempts_game_created_idx on public.attempts (game_id, created_at desc);
create index attempts_created_idx on public.attempts (created_at desc);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 300),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.current_grade_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.grade_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.current_track_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.track_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.games_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.check_profile_track()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.grade_id is not null and new.track_id is not null and not exists (
    select 1 from public.grade_tracks gt
    where gt.grade_id = new.grade_id and gt.track_id = new.track_id
  ) then
    raise exception 'track_not_allowed_for_grade' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Creates the profile row when someone signs up. Grade and track come from the signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_grade uuid;
  v_track uuid;
  v_name text;
begin
  begin
    v_grade := nullif(meta ->> 'grade_id', '')::uuid;
  exception when invalid_text_representation then
    v_grade := null;
  end;
  begin
    v_track := nullif(meta ->> 'track_id', '')::uuid;
  exception when invalid_text_representation then
    v_track := null;
  end;

  if v_grade is not null and not exists (select 1 from public.grades g where g.id = v_grade) then
    v_grade := null;
  end if;

  if v_grade is null then
    v_track := null;
  elsif v_track is null or not exists (
    select 1 from public.grade_tracks gt where gt.grade_id = v_grade and gt.track_id = v_track
  ) then
    select case when count(*) = 1 then (array_agg(gt.track_id))[1] end
      into v_track
      from public.grade_tracks gt
     where gt.grade_id = v_grade;
  end if;

  v_name := nullif(btrim(coalesce(meta ->> 'full_name', '')), '');

  insert into public.profiles (id, full_name, email, phone, grade_id, track_id)
  values (
    new.id,
    coalesce(v_name, split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    nullif(btrim(coalesce(meta ->> 'phone', '')), ''),
    v_grade,
    v_track
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Points = the sum of the student's best score in each game, so replaying a game can't farm points.
create or replace function public.refresh_points_for(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles p
     set points = coalesce((
       select sum(b.best)
         from (
           select max(a.score) as best
             from public.attempts a
            where a.user_id = p_user
            group by a.game_id
         ) b
     ), 0)
   where p.id = p_user;
$$;

create or replace function public.attempts_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_points_for(old.user_id);
  else
    perform public.refresh_points_for(new.user_id);
  end if;
  return null;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'cannot_demote_self' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- Replaces who a game is for in one transaction. p_targets: [{"grade_id": "...", "track_id": null | "..."}]
create or replace function public.set_game_targets(p_game_id uuid, p_targets jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  delete from public.game_targets where game_id = p_game_id;
  insert into public.game_targets (game_id, grade_id, track_id)
  select p_game_id, (t ->> 'grade_id')::uuid, nullif(t ->> 'track_id', '')::uuid
    from jsonb_array_elements(coalesce(p_targets, '[]'::jsonb)) as t
  on conflict do nothing;
end;
$$;

-- Ranking of students in one grade (optionally one track), for all time or since a date.
-- Returns the top p_limit rows plus the calling student's own row.
create or replace function public.leaderboard_by_grade(
  p_grade_id uuid,
  p_track_id uuid default null,
  p_since timestamptz default null,
  p_limit int default 50
)
returns table (user_id uuid, full_name text, points bigint, games_played bigint, rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select a.user_id, a.game_id, max(a.score) as best
      from public.attempts a
      join public.profiles p on p.id = a.user_id
     where p.grade_id = p_grade_id
       and (p_track_id is null or p.track_id = p_track_id)
       and p.role = 'student'
       and (p_since is null or a.created_at >= p_since)
     group by a.user_id, a.game_id
  ),
  totals as (
    select b.user_id, sum(b.best)::bigint as points, count(*)::bigint as games_played
      from best b
     group by b.user_id
    having sum(b.best) > 0
  ),
  ranked as (
    select t.user_id, p.full_name, t.points, t.games_played,
           rank() over (order by t.points desc) as rank
      from totals t
      join public.profiles p on p.id = t.user_id
  )
  select r.user_id, r.full_name, r.points, r.games_played, r.rank
    from ranked r
   where r.rank <= greatest(1, least(coalesce(p_limit, 50), 200))
      or r.user_id = (select auth.uid())
   order by r.rank, r.full_name;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profiles_check_track
  before insert or update of grade_id, track_id on public.profiles
  for each row execute function public.check_profile_track();

create trigger games_before_write
  before insert or update on public.games
  for each row execute function public.games_before_write();

create trigger attempts_points
  after insert or delete on public.attempts
  for each row execute function public.attempts_after_change();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create view public.game_stats with (security_invoker = true) as
select
  g.id as game_id,
  count(a.id)::int as plays,
  count(distinct a.user_id)::int as players,
  coalesce(round(avg(case when a.max_score > 0 then a.score::numeric * 100 / a.max_score end), 1), 0)::float8 as avg_percent,
  max(a.created_at) as last_played_at
from public.games g
left join public.attempts a on a.game_id = g.id
group by g.id;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
-- RLS helpers: policies for signed-in users call them; anonymous visitors never need them.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.current_grade_id() from public, anon;
revoke execute on function public.current_track_id() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_grade_id() to authenticated;
grant execute on function public.current_track_id() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_points_for(uuid) from public, anon, authenticated;
revoke execute on function public.attempts_after_change() from public, anon, authenticated;
revoke execute on function public.set_user_role(uuid, public.user_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
revoke execute on function public.set_game_targets(uuid, jsonb) from public, anon;
grant execute on function public.set_game_targets(uuid, jsonb) to authenticated;
revoke execute on function public.leaderboard_by_grade(uuid, uuid, timestamptz, int) from public, anon;
grant execute on function public.leaderboard_by_grade(uuid, uuid, timestamptz, int) to authenticated;

-- Students may edit only these profile columns. Role and points change through functions above.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, grade_id, track_id, avatar_url) on public.profiles to authenticated;

revoke all on public.game_stats from anon;
grant select on public.game_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.grades enable row level security;
alter table public.tracks enable row level security;
alter table public.grade_tracks enable row level security;
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_targets enable row level security;
alter table public.attempts enable row level security;
alter table public.quotes enable row level security;

-- Grades, tracks and their links: readable by everyone (needed for the signup form), editable by admins.
create policy "grades are public" on public.grades for select to anon, authenticated using (true);
create policy "admins insert grades" on public.grades for insert to authenticated with check (public.is_admin());
create policy "admins update grades" on public.grades for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete grades" on public.grades for delete to authenticated using (public.is_admin());

create policy "tracks are public" on public.tracks for select to anon, authenticated using (true);
create policy "admins insert tracks" on public.tracks for insert to authenticated with check (public.is_admin());
create policy "admins update tracks" on public.tracks for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete tracks" on public.tracks for delete to authenticated using (public.is_admin());

create policy "grade tracks are public" on public.grade_tracks for select to anon, authenticated using (true);
create policy "admins insert grade tracks" on public.grade_tracks for insert to authenticated with check (public.is_admin());
create policy "admins delete grade tracks" on public.grade_tracks for delete to authenticated using (public.is_admin());

-- Profiles: each student sees and edits their own row; admins see and edit everyone.
create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile or admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- Games: students read published games targeted at their grade and track; admins manage everything.
create policy "read targeted published games" on public.games for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.game_targets t
         where t.game_id = games.id
           and t.grade_id = (select public.current_grade_id())
           and (t.track_id is null or t.track_id = (select public.current_track_id()))
      )
    )
  );
create policy "admins insert games" on public.games for insert to authenticated with check (public.is_admin());
create policy "admins update games" on public.games for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete games" on public.games for delete to authenticated using (public.is_admin());

create policy "targets readable when signed in" on public.game_targets for select to authenticated using (true);
create policy "admins insert targets" on public.game_targets for insert to authenticated with check (public.is_admin());
create policy "admins update targets" on public.game_targets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete targets" on public.game_targets for delete to authenticated using (public.is_admin());

-- Attempts: students read their own. Rows are inserted only by the server (service role) after it
-- re-scores the answers, so a student can't post a fake score through the API.
create policy "read own attempts or admin" on public.attempts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "admins delete attempts" on public.attempts for delete to authenticated using (public.is_admin());

-- Quotes: active ones are public; admins manage all.
create policy "active quotes are public" on public.quotes for select to anon, authenticated using (active);
create policy "admins read all quotes" on public.quotes for select to authenticated using (public.is_admin());
create policy "admins insert quotes" on public.quotes for insert to authenticated with check (public.is_admin());
create policy "admins update quotes" on public.quotes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete quotes" on public.quotes for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: covers and question images (public bucket, admins upload)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-media', 'game-media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "admins upload game media" on storage.objects for insert to authenticated
  with check (bucket_id = 'game-media' and public.is_admin());
create policy "admins update game media" on storage.objects for update to authenticated
  using (bucket_id = 'game-media' and public.is_admin());
create policy "admins delete game media" on storage.objects for delete to authenticated
  using (bucket_id = 'game-media' and public.is_admin());
