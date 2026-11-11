import 'server-only';
import { cairoDayKey } from '@/lib/format';
import type { GameType } from '@/lib/games/types';
import { contestPhase } from '@/lib/kinds';
import type { SectionKey } from '@/lib/sections';
import type { createClient } from '@/lib/supabase/server';
import type { DailyQuestion, Profile, Tip, Video } from '@/lib/types';

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Tips, videos and daily questions with no grade are for everyone. Students get those plus their grade's;
 * admins and visitors get everything (visitors only reach tips and videos).
 */
function gradeOr(profile: Profile | null): string | null {
  if (!profile || profile.role === 'admin') return null;
  return profile.grade_id ? `grade_id.is.null,grade_id.eq.${profile.grade_id}` : 'grade_id.is.null';
}

/** Which wheel sections have something for this student right now. Games, quizzes and contests are targeted by RLS. */
export async function sectionAvailability(supabase: Client, profile: Profile): Promise<Record<SectionKey, boolean>> {
  const now = new Date();
  const recentlyEnded = new Date(now.getTime() - 3 * 86400000).toISOString();
  const head = { count: 'exact', head: true } as const;
  const f = gradeOr(profile);
  let tips = supabase.from('tips').select('id', head).eq('active', true);
  let videos = supabase.from('videos').select('id', head).eq('active', true);
  let daily = supabase.from('daily_questions').select('id', head).eq('day', cairoDayKey(now));
  if (f) {
    tips = tips.or(f);
    videos = videos.or(f);
    daily = daily.or(f);
  }
  const [games, quick, contests, upcoming, t, v, d] = await Promise.all([
    supabase.from('games').select('id', head).eq('kind', 'game').eq('status', 'published'),
    supabase.from('games').select('id', head).eq('kind', 'quick').eq('status', 'published'),
    supabase
      .from('games')
      .select('id', head)
      .eq('kind', 'contest')
      .eq('status', 'published')
      .lte('starts_at', now.toISOString())
      .gte('ends_at', recentlyEnded),
    supabase.rpc('upcoming_contests'),
    tips,
    videos,
    daily,
  ]);
  return {
    contests: (contests.count ?? 0) > 0 || ((upcoming.data as unknown[] | null)?.length ?? 0) > 0,
    games: (games.count ?? 0) > 0,
    quick: (quick.count ?? 0) > 0,
    tips: (t.count ?? 0) > 0,
    videos: (v.count ?? 0) > 0,
    daily: (d.count ?? 0) > 0,
  };
}

export async function loadTips(supabase: Client, profile: Profile | null): Promise<Pick<Tip, 'id' | 'body'>[]> {
  let q = supabase.from('tips').select('id, body').eq('active', true).order('created_at', { ascending: false }).limit(500);
  const f = gradeOr(profile);
  if (f) q = q.or(f);
  const { data } = await q;
  return (data ?? []) as Pick<Tip, 'id' | 'body'>[];
}

export type VideoItem = Pick<Video, 'id' | 'title' | 'url' | 'description' | 'cover_url'>;

export async function loadVideos(supabase: Client, profile: Profile | null): Promise<VideoItem[]> {
  let q = supabase.from('videos').select('id, title, url, description, cover_url').eq('active', true).order('created_at', { ascending: false }).limit(200);
  const f = gradeOr(profile);
  if (f) q = q.or(f);
  const { data } = await q;
  return (data ?? []) as VideoItem[];
}

/** Today's question: the student's grade first, then the one for everyone. Visitors see the one for everyone. */
export async function loadDailyQuestions(supabase: Client, profile: Profile | null): Promise<{ today: DailyQuestion | null; past: DailyQuestion[] }> {
  const today = cairoDayKey();
  let q = supabase.from('daily_questions').select('*').lte('day', today).order('day', { ascending: false }).limit(40);
  const f = profile ? gradeOr(profile) : 'grade_id.is.null';
  if (f) q = q.or(f);
  const { data } = await q;
  const rows = (data ?? []) as DailyQuestion[];
  const mine = (r: DailyQuestion) => Boolean(profile?.grade_id) && r.grade_id === profile?.grade_id;
  const rank = (r: DailyQuestion) => (mine(r) ? 0 : r.grade_id === null ? 1 : 2);
  const byDay = new Map<string, DailyQuestion>();
  for (const r of rows) {
    const cur = byDay.get(r.day);
    if (!cur || rank(r) < rank(cur)) byDay.set(r.day, r);
  }
  const days = [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  return { today: byDay.get(today) ?? null, past: days.filter((r) => r.day !== today).slice(0, 6) };
}

export interface ContestCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  prize: string | null;
  cover_url: string | null;
  type: GameType;
  item_count: number;
  starts_at: string;
  ends_at: string;
}

const CONTEST_COLUMNS = 'id, slug, title, description, prize, cover_url, type, item_count, starts_at, ends_at';

/** Contests for this student: live, coming up (no questions yet), and finished ones. */
export async function loadContests(supabase: Client): Promise<{ live: ContestCard[]; upcoming: ContestCard[]; ended: ContestCard[] }> {
  const [{ data: visible }, { data: soon }] = await Promise.all([
    supabase.from('games').select(CONTEST_COLUMNS).eq('kind', 'contest').eq('status', 'published').order('ends_at', { ascending: false }).limit(60),
    supabase.rpc('upcoming_contests'),
  ]);
  const seen = new Set<string>();
  const all: ContestCard[] = [];
  for (const c of [...((soon ?? []) as ContestCard[]), ...((visible ?? []) as ContestCard[])]) {
    if (seen.has(c.id) || !c.starts_at || !c.ends_at) continue;
    seen.add(c.id);
    all.push({ ...c, description: c.description ?? '' });
  }
  const now = Date.now();
  const live = all.filter((c) => contestPhase(c.starts_at, c.ends_at, now) === 'live').sort((a, b) => a.ends_at.localeCompare(b.ends_at));
  const upcoming = all.filter((c) => contestPhase(c.starts_at, c.ends_at, now) === 'upcoming').sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const ended = all.filter((c) => contestPhase(c.starts_at, c.ends_at, now) === 'ended').sort((a, b) => b.ends_at.localeCompare(a.ends_at));
  return { live, upcoming, ended };
}

export interface FirstAttempt {
  score: number;
  max_score: number;
  correct_count: number;
  total_count: number;
  duration_ms: number;
  created_at: string;
}

/** The first attempt in each game, which is the one a contest counts. */
export async function firstAttempts(supabase: Client, userId: string, gameIds: string[]): Promise<Map<string, FirstAttempt>> {
  const out = new Map<string, FirstAttempt>();
  if (!gameIds.length) return out;
  const { data } = await supabase
    .from('attempts')
    .select('game_id, score, max_score, correct_count, total_count, duration_ms, created_at')
    .eq('user_id', userId)
    .in('game_id', gameIds)
    .order('created_at', { ascending: true });
  for (const a of data ?? []) if (!out.has(a.game_id as string)) out.set(a.game_id as string, a as FirstAttempt);
  return out;
}

export interface RankingRow {
  user_id: string;
  full_name: string;
  score: number;
  max_score: number;
  duration_ms: number;
  rank: number;
  participants: number;
}

export async function contestRanking(supabase: Client, gameId: string, limit = 10): Promise<RankingRow[]> {
  const { data } = await supabase.rpc('contest_ranking', { p_game_id: gameId, p_limit: limit });
  return ((data ?? []) as RankingRow[]).map((r) => ({
    ...r,
    score: Number(r.score),
    max_score: Number(r.max_score),
    duration_ms: Number(r.duration_ms),
    rank: Number(r.rank),
    participants: Number(r.participants),
  }));
}
