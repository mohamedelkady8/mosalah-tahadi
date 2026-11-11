import 'server-only';
import type { BestScore, GameCardData } from '@/components/games/GameCards';
import { cairoDayKey } from '@/lib/format';
import type { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

type Client = Awaited<ReturnType<typeof createClient>>;

const CARD_COLUMNS = 'id, slug, title, description, type, item_count, cover_url, topic, difficulty, published_at';

/**
 * Published games of a grade that this person can play: games for the whole grade or for their track.
 * Admins see every published game of the grade.
 */
export async function gamesForGrade(supabase: Client, gradeId: string, profile: Profile): Promise<GameCardData[]> {
  const { data: targets } = await supabase.from('game_targets').select('game_id, track_id').eq('grade_id', gradeId);
  const isAdmin = profile.role === 'admin';
  const ids = [
    ...new Set(
      (targets ?? []).filter((t) => isAdmin || t.track_id === null || t.track_id === profile.track_id).map((t) => t.game_id as string),
    ),
  ];
  if (!ids.length) return [];
  const { data } = await supabase.from('games').select(CARD_COLUMNS).in('id', ids).eq('status', 'published').order('published_at', { ascending: false });
  return ((data ?? []) as (GameCardData & { description: string | null })[]).map((g) => ({ ...g, description: g.description ?? '' }));
}

export async function bestScores(supabase: Client, userId: string, gameIds: string[]): Promise<Record<string, BestScore>> {
  if (!gameIds.length) return {};
  const { data } = await supabase.from('attempts').select('game_id, score, max_score').eq('user_id', userId).in('game_id', gameIds);
  const best: Record<string, BestScore> = {};
  for (const a of data ?? []) {
    const id = a.game_id as string;
    if (!best[id] || (a.score as number) > best[id].score) best[id] = { score: a.score as number, max: a.max_score as number };
  }
  return best;
}

export interface Streak {
  current: number;
  longest: number;
  playedToday: boolean;
  days: number;
}

/** Days in a row with at least one game, in Egypt's timezone. Today not played yet doesn't break it. */
export function computeStreak(dates: string[], now = new Date()): Streak {
  const days = [...new Set(dates.map((d) => cairoDayKey(d)))].sort();
  if (!days.length) return { current: 0, longest: 0, playedToday: false, days: 0 };
  const toNum = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };
  const nums = days.map(toNum);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < nums.length; i++) {
    run = nums[i] === nums[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const today = toNum(cairoDayKey(now));
  const last = nums[nums.length - 1];
  let current = 0;
  if (last === today || last === today - 1) {
    current = 1;
    for (let i = nums.length - 1; i > 0 && nums[i] === nums[i - 1] + 1; i--) current++;
  }
  return { current, longest, playedToday: last === today, days: nums.length };
}

export interface Badge {
  key: string;
  icon: 'flame' | 'star' | 'trophy' | 'gamepad' | 'bolt';
  title: string;
  desc: string;
  earned: boolean;
  progress?: string;
}

export function computeBadges(input: { streak: Streak; points: number; perfect: number; gamesPlayed: number; typesPlayed: number; attempts: number }): Badge[] {
  const { streak, points, perfect, gamesPlayed, typesPlayed, attempts } = input;
  const best = streak.longest;
  const prog = (have: number, need: number) => (have >= need ? undefined : `${Math.min(have, need).toLocaleString('ar-EG')} من ${need.toLocaleString('ar-EG')}`);
  return [
    { key: 'first', icon: 'bolt', title: 'أول خطوة', desc: 'لعبت أول لعبة', earned: attempts > 0 },
    { key: 'streak3', icon: 'flame', title: '٣ أيام ورا بعض', desc: 'لعبت ٣ أيام من غير ما تقطع', earned: best >= 3, progress: prog(best, 3) },
    { key: 'streak7', icon: 'flame', title: 'أسبوع كامل', desc: '٧ أيام لعب ورا بعض', earned: best >= 7, progress: prog(best, 7) },
    { key: 'streak30', icon: 'flame', title: 'شهر من غير ما تقطع', desc: '٣٠ يوم لعب ورا بعض', earned: best >= 30, progress: prog(best, 30) },
    { key: 'perfect', icon: 'star', title: 'العلامة الكاملة', desc: 'خدت الدرجة النهائية في لعبة', earned: perfect > 0 },
    { key: 'perfect5', icon: 'star', title: 'خمس علامات كاملة', desc: 'الدرجة النهائية في ٥ ألعاب', earned: perfect >= 5, progress: prog(perfect, 5) },
    { key: 'games10', icon: 'gamepad', title: '١٠ ألعاب', desc: 'لعبت ١٠ ألعاب مختلفة', earned: gamesPlayed >= 10, progress: prog(gamesPlayed, 10) },
    { key: 'types', icon: 'gamepad', title: 'جرّبت كله', desc: 'لعبت من كل الأنواع التمانية', earned: typesPlayed >= 8, progress: prog(typesPlayed, 8) },
    { key: 'points500', icon: 'trophy', title: '٥٠٠ نقطة', desc: 'جمعت ٥٠٠ نقطة', earned: points >= 500, progress: prog(points, 500) },
    { key: 'points2000', icon: 'trophy', title: '٢٠٠٠ نقطة', desc: 'جمعت ٢٠٠٠ نقطة', earned: points >= 2000, progress: prog(points, 2000) },
  ];
}
