import { z } from 'zod';
import { makeResult, type GameDef } from '../def';
import { GAME_META } from '../meta';
import { uid } from '../random';
import { normalizeAnswer } from '../text';

export const matchingContent = z
  .object({
    leftLabel: z.string().trim().max(40).default('الكلمة'),
    rightLabel: z.string().trim().max(40).default('المعنى'),
    pairs: z
      .array(
        z.object({
          id: z.string().min(1),
          left: z.string().trim().min(1, 'فيه خانة فاضية في العمود الأول.').max(160),
          right: z.string().trim().min(1, 'فيه خانة فاضية في العمود التاني.').max(160),
        }),
      )
      .min(2, 'ضيف زوجين على الأقل.')
      .max(12, 'أقصى عدد ١٢ زوج.'),
  })
  .superRefine((c, ctx) => {
    const seenLeft = new Set<string>();
    const seenRight = new Set<string>();
    c.pairs.forEach((p, i) => {
      const l = normalizeAnswer(p.left);
      const r = normalizeAnswer(p.right);
      if (l && seenLeft.has(l)) ctx.addIssue({ code: 'custom', message: 'فيه كلمتين زي بعض في العمود الأول.', path: ['pairs', i, 'left'] });
      if (r && seenRight.has(r)) ctx.addIssue({ code: 'custom', message: 'فيه إجابتين زي بعض في العمود التاني.', path: ['pairs', i, 'right'] });
      seenLeft.add(l);
      seenRight.add(r);
    });
  });

export const matchingAnswers = z.object({
  attempts: z.array(z.object({ leftId: z.string().max(40), rightId: z.string().max(40) })).max(500),
});

export type MatchingContent = z.output<typeof matchingContent>;
export type MatchingPair = MatchingContent['pairs'][number];
export type MatchingAnswers = z.output<typeof matchingAnswers>;

export function newPair(): MatchingPair {
  return { id: uid(), left: '', right: '' };
}

export const matchingDef: GameDef<MatchingContent, MatchingAnswers> = {
  type: 'matching',
  label: GAME_META.matching.label,
  description: 'عمودين، والطالب يوصّل كل كلمة بمعناها أو بإعرابها.',
  howTo: 'دوس على كلمة من العمود الأول وبعدين على اللي تناسبها من العمود التاني، أو اسحبها عليها.',
  accent: '#7A2A3A',
  itemForms: GAME_META.matching.itemForms,
  contentSchema: matchingContent,
  answersSchema: matchingAnswers,
  defaultContent: () => ({ leftLabel: 'الكلمة', rightLabel: 'المعنى', pairs: [newPair(), newPair(), newPair()] }),
  itemCount: (c) => c.pairs.length,
  score(content, answers, settings) {
    const byId = new Map(content.pairs.map((p) => [p.id, p]));
    const firstTry = new Map<string, string>();
    for (const a of answers.attempts) if (byId.has(a.leftId) && !firstTry.has(a.leftId)) firstTry.set(a.leftId, a.rightId);
    let correct = 0;
    const review = content.pairs.map((p) => {
      const tried = firstTry.get(p.id);
      const ok = tried === p.id;
      if (ok) correct++;
      return {
        prompt: p.left,
        correct: ok,
        given: tried ? (byId.get(tried)?.right ?? '؟') : 'ماتوصلتش',
        expected: p.right,
      };
    });
    return makeResult(correct, content.pairs.length, settings, review);
  },
};
