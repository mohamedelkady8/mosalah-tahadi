-- The site becomes the team's hub: besides games there are «ع السريع» quizzes, contests,
-- tips, motivational videos and a question of the day. The student's wheel picks one of them.

-- ---------------------------------------------------------------------------
-- Games: kinds and contest windows
-- ---------------------------------------------------------------------------
-- 'game' is a normal game, 'quick' an «ع السريع» quiz (always multiple choice) and 'contest' a game
-- that opens at starts_at, closes at ends_at and gives every student one attempt.
alter table public.games
  add column kind text not null default 'game',
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column prize text;

alter table public.games
  add constraint games_kind_check check (kind in ('game', 'quick', 'contest')),
  add constraint games_quick_is_mcq check (kind <> 'quick' or type = 'mcq'),
  add constraint games_prize_length check (prize is null or char_length(prize) <= 200),
  add constraint games_window_order check (starts_at is null or ends_at is null or ends_at > starts_at),
  add constraint games_contest_window check (
    kind <> 'contest' or status = 'draft' or (starts_at is not null and ends_at is not null)
  );

create index games_kind_status_idx on public.games (kind, status);

-- A contest's questions stay hidden from students until it starts.
drop policy "read targeted published games" on public.games;
create policy "read targeted published games" on public.games for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and (kind <> 'contest' or starts_at <= now())
      and exists (
        select 1 from public.game_targets t
         where t.game_id = games.id
           and t.grade_id = (select public.current_grade_id())
           and (t.track_id is null or t.track_id = (select public.current_track_id()))
      )
    )
  );

-- Contests that haven't started yet, without their questions, so students can see what's coming.
create or replace function public.upcoming_contests()
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  prize text,
  cover_url text,
  type public.game_type,
  item_count int,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.slug, g.title, g.description, g.prize, g.cover_url, g.type, g.item_count, g.starts_at, g.ends_at
    from public.games g
   where g.kind = 'contest'
     and g.status = 'published'
     and g.starts_at > now()
     and (
       public.is_admin()
       or exists (
         select 1 from public.game_targets t
          where t.game_id = g.id
            and t.grade_id = public.current_grade_id()
            and (t.track_id is null or t.track_id = public.current_track_id())
       )
     )
   order by g.starts_at;
$$;

-- Contest results: each student's first attempt counts, ranked by score then speed.
-- Returns the top p_limit rows plus the caller's own row; participants is the total count.
create or replace function public.contest_ranking(p_game_id uuid, p_limit int default 10)
returns table (
  user_id uuid,
  full_name text,
  score int,
  max_score int,
  duration_ms int,
  rank bigint,
  participants bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (
    select 1
      from public.games g
     where g.id = p_game_id
       and g.kind = 'contest'
       and (
         public.is_admin()
         or (
           g.status = 'published'
           and g.starts_at <= now()
           and exists (
             select 1 from public.game_targets t
              where t.game_id = g.id
                and t.grade_id = public.current_grade_id()
                and (t.track_id is null or t.track_id = public.current_track_id())
           )
         )
       )
  ),
  firsts as (
    select distinct on (a.user_id) a.user_id, a.score, a.max_score, a.duration_ms
      from public.attempts a
      join public.profiles p on p.id = a.user_id
     where a.game_id = p_game_id
       and p.role = 'student'
       and exists (select 1 from allowed)
     order by a.user_id, a.created_at
  ),
  ranked as (
    select f.user_id, f.score, f.max_score, f.duration_ms,
           rank() over (order by f.score desc, f.duration_ms) as rank,
           count(*) over () as participants
      from firsts f
  )
  select r.user_id, p.full_name, r.score, r.max_score, r.duration_ms, r.rank, r.participants
    from ranked r
    join public.profiles p on p.id = r.user_id
   where r.rank <= greatest(1, least(coalesce(p_limit, 10), 100))
      or r.user_id = (select auth.uid())
   order by r.rank, p.full_name;
$$;

revoke execute on function public.upcoming_contests() from public, anon;
grant execute on function public.upcoming_contests() to authenticated;
revoke execute on function public.contest_ranking(uuid, int) from public, anon;
grant execute on function public.contest_ranking(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Tips, videos and the question of the day
-- ---------------------------------------------------------------------------
-- A null grade_id means "for every grade".
create table public.tips (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 3 and 600),
  grade_id uuid references public.grades (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index tips_grade_idx on public.tips (grade_id);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  description text not null default '' check (char_length(description) <= 300),
  cover_url text,
  grade_id uuid references public.grades (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index videos_grade_idx on public.videos (grade_id);

-- One question per day per grade (or one for everyone). Students answer it on the Facebook group,
-- so there's no answer column. Questions scheduled for later days stay hidden until their day.
create table public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  grade_id uuid references public.grades (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 3 and 800),
  image_url text,
  post_url text check (post_url is null or (post_url ~ '^https://' and char_length(post_url) <= 500)),
  created_at timestamptz not null default now(),
  constraint daily_questions_day_grade unique nulls not distinct (day, grade_id)
);
create index daily_questions_grade_idx on public.daily_questions (grade_id);

alter table public.tips enable row level security;
alter table public.videos enable row level security;
alter table public.daily_questions enable row level security;

create policy "active tips are public" on public.tips for select to anon, authenticated using (active);
create policy "admins read all tips" on public.tips for select to authenticated using (public.is_admin());
create policy "admins insert tips" on public.tips for insert to authenticated with check (public.is_admin());
create policy "admins update tips" on public.tips for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete tips" on public.tips for delete to authenticated using (public.is_admin());

create policy "active videos are public" on public.videos for select to anon, authenticated using (active);
create policy "admins read all videos" on public.videos for select to authenticated using (public.is_admin());
create policy "admins insert videos" on public.videos for insert to authenticated with check (public.is_admin());
create policy "admins update videos" on public.videos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete videos" on public.videos for delete to authenticated using (public.is_admin());

create policy "daily questions are public from their day" on public.daily_questions for select to anon, authenticated
  using (day <= (now() at time zone 'Africa/Cairo')::date);
create policy "admins read all daily questions" on public.daily_questions for select to authenticated using (public.is_admin());
create policy "admins insert daily questions" on public.daily_questions for insert to authenticated with check (public.is_admin());
create policy "admins update daily questions" on public.daily_questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete daily questions" on public.daily_questions for delete to authenticated using (public.is_admin());
