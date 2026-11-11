import { z } from 'zod';
import { makeResult, type GameDef } from '../def';
import { GAME_META } from '../meta';
import { uid } from '../random';

export const classifyContent = z
  .object({
    buckets: z
      .array(z.object({ id: z.string().min(1), label: z.string().trim().min(1, 'اكتب اسم المجموعة.').max(40) }))
      .min(2, 'ضيف مجموعتين على الأقل.')
      .max(5, 'أقصى عدد ٥ مجموعات.'),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().trim().min(1, 'فيه عنصر فاضي.').max(160),
          bucketId: z.string(),
        }),
      )
      .min(2, 'ضيف عنصرين على الأقل.')
      .max(40, 'أقصى عدد ٤٠ عنصر.'),
  })
  .superRefine((c, ctx) => {
    const ids = new Set(c.buckets.map((b) => b.id));
    c.items.forEach((item, i) => {
      if (!ids.has(item.bucketId)) {
        ctx.addIssue({ code: 'custom', message: 'اختار المجموعة الصح للعنصر ده.', path: ['items', i, 'bucketId'] });
      }
    });
  });

export const classifyAnswers = z.object({
  answers: z.array(z.object({ id: z.string().max(40), bucketId: z.string().max(40).nullable() })).max(100),
});

export type ClassifyContent = z.output<typeof classifyContent>;
export type ClassifyBucket = ClassifyContent['buckets'][number];
export type ClassifyItem = ClassifyContent['items'][number];
export type ClassifyAnswers = z.output<typeof classifyAnswers>;

export function newBucket(label = ''): ClassifyBucket {
  return { id: uid(), label };
}

export function newClassifyItem(bucketId = ''): ClassifyItem {
  return { id: uid(), text: '', bucketId };
}

export const classifyDef: GameDef<ClassifyContent, ClassifyAnswers> = {
  type: 'classify',
  label: GAME_META.classify.label,
  description: 'مجموعات وعناصر، والطالب يحط كل عنصر في مجموعته (مثلًا: فاعل / مفعول به / مبتدأ).',
  howTo: 'اسحب كل كارت للمجموعة الصح، أو دوس عليه وبعدين دوس على المجموعة.',
  accent: '#7A2A3A',
  itemForms: GAME_META.classify.itemForms,
  contentSchema: classifyContent,
  answersSchema: classifyAnswers,
  defaultContent: () => {
    const a = newBucket('فاعل');
    const b = newBucket('مفعول به');
    return { buckets: [a, b], items: [newClassifyItem(a.id), newClassifyItem(b.id)] };
  },
  itemCount: (c) => c.items.length,
  score(content, answers, settings) {
    const label = new Map(content.buckets.map((b) => [b.id, b.label]));
    const given = new Map(answers.answers.map((a) => [a.id, a.bucketId]));
    let correct = 0;
    const review = content.items.map((item) => {
      const placed = given.get(item.id) ?? null;
      const ok = placed === item.bucketId;
      if (ok) correct++;
      return {
        prompt: item.text,
        correct: ok,
        given: placed ? (label.get(placed) ?? '؟') : 'ماتحطش',
        expected: label.get(item.bucketId),
      };
    });
    return makeResult(correct, content.items.length, settings, review);
  },
};
