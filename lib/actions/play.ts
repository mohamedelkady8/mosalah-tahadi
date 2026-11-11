'use server';

import { getSession } from '@/lib/data';
import { getDef } from '@/lib/games/registry';
import { parseSettings } from '@/lib/games/settings';
import { isGameType, type ScoreResult } from '@/lib/games/types';
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
    .select('id, type, content, settings, status')
    .eq('id', String(input.gameId))
    .maybeSingle();
  if (!game || !isGameType(game.type)) return { ok: false, error: 'اللعبة دي مش متاحة ليك.' };

  const def = getDef(game.type);
  const content = def.contentSchema.safeParse(game.content);
  if (!content.success) return { ok: false, error: 'محتوى اللعبة فيه مشكلة، كلّم المستر.' };
  const answers = def.answersSchema.safeParse(input.answers);
  if (!answers.success) return { ok: false, error: 'الإجابات وصلت ناقصة، جرّب تاني.' };
  const settings = parseSettings(game.settings, game.type);

  const { count } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', game.id)
    .eq('user_id', userId);
  const used = count ?? 0;
  if (settings.attemptsAllowed > 0 && used >= settings.attemptsAllowed && profile.role !== 'admin') {
    return { ok: false, error: 'خلصت عدد المحاولات المسموحة للعبة دي.', attemptsUsed: used };
  }

  const result = def.score(content.data, answers.data, settings);

  if (profile.role === 'admin' || game.status !== 'published') {
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

  const [best, me] = await Promise.all([
    supabase.from('attempts').select('score').eq('game_id', game.id).eq('user_id', userId).order('score', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profiles').select('points').eq('id', userId).maybeSingle(),
  ]);

  return {
    ok: true,
    result,
    saved: true,
    best: best.data?.score ?? result.score,
    attemptsUsed: used + 1,
    points: me.data?.points ?? null,
  };
}
