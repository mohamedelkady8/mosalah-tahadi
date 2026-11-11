import { z } from 'zod';
import { type GameDef } from '../def';
import { GAME_META } from '../meta';
import { uid } from '../random';
import { blankedText, blanksOf, normalizeAnswer } from '../text';

export const fillContent = z
  .object({
    mode: z.enum(['type', 'bank']).default('bank'),
    ignoreDiacritics: z.boolean().default(true),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().trim().min(1, 'اكتب الجملة.').max(600, 'الجملة طويلة أوي.'),
          explanation: z.string().trim().max(600).default(''),
        }),
      )
      .min(1, 'ضيف جملة واحدة على الأقل.')
      .max(50, 'أقصى عدد ٥٠.'),
    distractors: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  })
  .superRefine((c, ctx) => {
    c.items.forEach((item, i) => {
      const blanks = blanksOf(item.text);
      if (blanks.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'حط الإجابة بين [[ ]] عشان تبقى فراغ.', path: ['items', i, 'text'] });
      } else if (blanks.some((b) => b.length === 0)) {
        ctx.addIssue({ code: 'custom', message: 'فيه فراغ من غير إجابة جوه [[ ]].', path: ['items', i, 'text'] });
      } else if (blanks.length > 6) {
        ctx.addIssue({ code: 'custom', message: 'أقصى عدد ٦ فراغات في الجملة.', path: ['items', i, 'text'] });
      }
    });
  });

export const fillAnswers = z.object({
  answers: z.array(z.object({ id: z.string().max(40), values: z.array(z.string().max(200)).max(10) })).max(100),
});

export type FillContent = z.output<typeof fillContent>;
export type FillItem = FillContent['items'][number];
export type FillAnswers = z.output<typeof fillAnswers>;

export function newFillItem(): FillItem {
  return { id: uid(), text: '', explanation: '' };
}

export const fillBlankDef: GameDef<FillContent, FillAnswers> = {
  type: 'fill_blank',
  label: GAME_META.fill_blank.label,
  description: 'جمل فيها فراغات، والطالب يكتب الإجابة أو يختارها من بنك الكلمات.',
  howTo: 'كمّل كل فراغ بالكلمة المناسبة، وبعدين دوس «تأكيد».',
  accent: '#1F6FB5',
  itemForms: GAME_META.fill_blank.itemForms,
  contentSchema: fillContent,
  answersSchema: fillAnswers,
  defaultContent: () => ({ mode: 'bank', ignoreDiacritics: true, items: [newFillItem()], distractors: [] }),
  itemCount: (c) => c.items.length,
  score(content, answers, settings) {
    const given = new Map(answers.answers.map((a) => [a.id, a.values]));
    let correctBlanks = 0;
    let totalBlanks = 0;
    const review = content.items.map((item) => {
      const blanks = blanksOf(item.text);
      const values = given.get(item.id) ?? [];
      let allOk = true;
      blanks.forEach((alternatives, i) => {
        totalBlanks++;
        const v = normalizeAnswer(values[i] ?? '', content.ignoreDiacritics);
        const ok = v !== '' && alternatives.some((alt) => normalizeAnswer(alt, content.ignoreDiacritics) === v);
        if (ok) correctBlanks++;
        else allOk = false;
      });
      return {
        prompt: blankedText(item.text),
        correct: allOk,
        given: blanks.map((_, i) => values[i]?.trim() || '—').join(' / '),
        expected: blanks.map((b) => b[0]).join(' / '),
        explanation: item.explanation || undefined,
      };
    });
    const pts = settings.pointsPerItem;
    return {
      score: correctBlanks * pts,
      maxScore: totalBlanks * pts,
      correctCount: correctBlanks,
      totalCount: totalBlanks,
      review,
    };
  },
};
