'use server';

import { getSession } from '@/lib/data';
import { getDef } from '@/lib/games/registry';
import { parseSettings } from '@/lib/games/settings';
import { isGameType, type ScoreResult } from '@/lib/games/types';
import { CONTEST_GRACE_MS } from '@/lib/kinds';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type SubmitResult =
  | {
      ok: true;
      result: ScoreResult;
      saved: boolean;
      note?: string;
      best: number;
      attemptsUsed: number;
      points: number | null;
    }
  | { ok: false; error: string; retry?: boolean; attemptsUsed?: number };

const MAX_DURATION_MS = 3 * 60 * 60 * 1000;

export async function submitAttempt(input: { gameId: string; answers: unknown; durationMs: number }): Promise<SubmitResult> {
  const { userId, profile } = await getSession();
  if (!userId || !profile) return { ok: false, error: 'سجّل دخولك الأول عشان نحفظ نتيجتك.' };

  const supabase = await createClient();
  const { data: game } = await supabase
    .from('games')
    .select('id, type, content, settings, status, kind, starts_at, ends_at')
    .eq('id', String(input.gameId))
    .maybeSingle();
  if (!game || !isGameType(game.type)) return { ok: false, error: 'اللعبة دي مش متاحة ليك.' };
  const isAdmin = profile.role === 'admin';
  const contest = game.kind === 'contest';
  if (contest && !isAdmin) {
    const now = Date.now();
    if (!game.starts_at || new Date(game.starts_at).getTime() > now) return { ok: false, error: 'المسابقة لسه مابدأتش.' };
    if (game.ends_at && new Date(game.ends_at).getTime() + CONTEST_GRACE_MS < now) {
      return { ok: false, error: 'المسابقة خلصت، ومبقاش ينفع تتسجل إجابات جديدة.' };
    }
  }

  const def = getDef(game.type);
  const content = def.contentSchema.safeParse(game.content);
  if (!content.success) return { ok: false, error: 'محتوى اللعبة فيه مشكلة، كلّم المستر.' };
  const answers = def.answersSchema.safeParse(input.answers);
  if (!answers.success) return { ok: false, error: 'الإجابات وصلت ناقصة، جرّب تاني.' };
  const settings = parseSettings(game.settings, game.type);

  // One read gives both how many attempts were used and the best score so far.
  const { data: previous } = await supabase.from('attempts').select('score').eq('game_id', game.id).eq('user_id', userId).limit(1000);
  const used = previous?.length ?? 0;
  const bestBefore = (previous ?? []).reduce((max, a) => Math.max(max, a.score as number), 0);
  const allowed = contest ? 1 : settings.attemptsAllowed;
  if (allowed > 0 && used >= allowed && !isAdmin) {
    return {
      ok: false,
      error: contest ? 'إنت شاركت في المسابقة دي قبل كده، وليك محاولة واحدة بس.' : 'خلصت عدد المحاولات المسموحة للعبة دي.',
      attemptsUsed: used,
    };
  }

  const result = def.score(content.data, answers.data, settings);

  if (isAdmin || game.status !== 'published') {
    return { ok: true, result, saved: false, note: 'دي تجربة أدمن، النتيجة مش بتتحفظ.', best: result.score, attemptsUsed: used, points: null };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: true,
      result,
      saved: false,
      note: 'النتيجة ماتحفظتش لأن مفتاح السيرفر (SUPABASE_SERVICE_ROLE_KEY) مش متظبط.',
      best: result.score,
      attemptsUsed: used,
      points: null,
    };
  }

  const durationMs = Math.min(MAX_DURATION_MS, Math.max(0, Math.round(Number(input.durationMs) || 0)));
  const { error } = await admin.from('attempts').insert({
    user_id: userId,
    game_id: game.id,
    score: result.score,
    max_score: result.maxScore,
    correct_count: result.correctCount,
    total_count: result.totalCount,
    duration_ms: durationMs,
    answers: answers.data,
  });
  if (error) {
    console.error('attempt insert failed', error);
    return { ok: false, error: 'معرفناش نحفظ نتيجتك، جرّب تاني.', retry: true };
  }

  // The insert trigger has already re-added the student's points.
  const { data: me } = await supabase.from('profiles').select('points').eq('id', userId).maybeSingle();

  return {
    ok: true,
    result,
    saved: true,
    best: Math.max(bestBefore, result.score),
    attemptsUsed: used + 1,
    points: me?.points ?? null,
  };
}
