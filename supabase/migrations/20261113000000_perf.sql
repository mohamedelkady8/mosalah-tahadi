-- Speed: fewer round trips per page and cheaper queries when thousands of students are online.
-- Everything here is additive or a same-meaning rewrite, so the previous app version keeps working.

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- "My attempts in this game" (play page, attempt limits) and the contest ranking, which reads each
-- student's first attempt in one game.
create index if not exists attempts_game_user_created_idx on public.attempts (game_id, user_id, created_at);

-- Ranking students of one grade by points.
create index if not exists profiles_grade_points_idx on public.profiles (grade_id, points desc) where role = 'student';

-- ---------------------------------------------------------------------------
-- Row Level Security: evaluate "am I an admin?" once per query instead of once per row
-- ---------------------------------------------------------------------------
alter policy "read own profile or admin" on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()));
alter policy "update own profile or admin" on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

alter policy "read own attempts or admin" on public.attempts
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter policy "read targeted published games" on public.games
  using (
    (select public.is_admin())
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

alter policy "admins read all quotes" on public.quotes using ((select public.is_admin()));
alter policy "admins read all tips" on public.tips using ((select public.is_admin()));
alter policy "admins read all videos" on public.videos using ((select public.is_admin()));
alter policy "admins read all daily questions" on public.daily_questions using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- The wheel: which of the game sections have something for the caller, in one call
-- ---------------------------------------------------------------------------
-- Runs with the caller's rights, so the games policy decides what counts as "for me".
create or replace function public.wheel_sections()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'games', exists (select 1 from public.games g where g.kind = 'game' and g.status = 'published'),
    'quick', exists (select 1 from public.games g where g.kind = 'quick' and g.status = 'published'),
    'contests', exists (
        select 1 from public.games g
         where g.kind = 'contest' and g.status = 'published'
           and g.starts_at <= now() and g.ends_at >= now() - interval '3 days'
      )
      or exists (select 1 from public.upcoming_contests())
  );
$$;

revoke execute on function public.wheel_sections() from public, anon;
grant execute on function public.wheel_sections() to authenticated;

-- ---------------------------------------------------------------------------
-- Ranking
-- ---------------------------------------------------------------------------
-- The caller's place among the students of their grade, by all-time points. Null until they score.
-- profiles.points is already the sum of the best score in each game, so nothing is re-added here.
create or replace function public.my_grade_rank()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when me.role = 'student' and me.grade_id is not null and me.points > 0 then (
             select count(*) + 1
               from public.profiles p
              where p.grade_id = me.grade_id and p.role = 'student' and p.points > me.points
           )
         end
    from public.profiles me
   where me.id = (select auth.uid());
$$;

revoke execute on function public.my_grade_rank() from public, anon;
grant execute on function public.my_grade_rank() to authenticated;

-- Same result as before. The all-time board now reads the stored points instead of adding up every
-- attempt of the grade on each visit; the weekly board still adds up that week's attempts.
create or replace function public.leaderboard_by_grade(
  p_grade_id uuid,
  p_track_id uuid default null,
  p_since timestamptz default null,
  p_limit int default 50
)
returns table (user_id uuid, full_name text, points bigint, games_played bigint, rank bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_me uuid := (select auth.uid());
begin
  if p_since is null then
    return query
    with ranked as (
      select p.id as uid, p.full_name as fname, p.points::bigint as pts,
             rank() over (order by p.points desc) as rnk
        from public.profiles p
       where p.grade_id = p_grade_id
         and (p_track_id is null or p.track_id = p_track_id)
         and p.role = 'student'
         and p.points > 0
    )
    select r.uid, r.fname, r.pts,
           (select count(distinct a.game_id) from public.attempts a where a.user_id = r.uid)::bigint,
           r.rnk
      from ranked r
     where r.rnk <= v_limit or r.uid = v_me
     order by r.rnk, r.fname;
  else
    return query
    with best as (
      select a.user_id as uid, a.game_id as gid, max(a.score) as best
        from public.attempts a
        join public.profiles p on p.id = a.user_id
       where p.grade_id = p_grade_id
         and (p_track_id is null or p.track_id = p_track_id)
         and p.role = 'student'
         and a.created_at >= p_since
       group by a.user_id, a.game_id
    ),
    totals as (
      select b.uid, sum(b.best)::bigint as pts, count(*)::bigint as played
        from best b
       group by b.uid
      having sum(b.best) > 0
    ),
    ranked as (
      select t.uid, p.full_name as fname, t.pts, t.played,
             rank() over (order by t.pts desc) as rnk
        from totals t
        join public.profiles p on p.id = t.uid
    )
    select r.uid, r.fname, r.pts, r.played, r.rnk
      from ranked r
     where r.rnk <= v_limit or r.uid = v_me
     order by r.rnk, r.fname;
  end if;
end;
$$;
