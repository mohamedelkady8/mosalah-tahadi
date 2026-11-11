import { z } from 'zod';
import { makeResult, NOT_ANSWERED, type GameDef } from '../def';
import { uid } from '../random';

export const tfContent = z.object({
  statements: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1, 'اكتب الجملة.').max(500, 'الجملة طويلة أوي.'),
        answer: z.boolean(),
        explanation: z.string().trim().max(600).default(''),
      }),
    )
    .min(1, 'ضيف جملة واحدة على الأقل.')
    .max(100, 'أقصى عدد جمل ١٠٠.'),
});

export const tfAnswers = z.object({
  answers: z.array(z.object({ id: z.string().max(40), value: z.boolean().nullable() })).max(200),
});

export type TfContent = z.output<typeof tfContent>;
export type TfStatement = TfContent['statements'][number];
export type TfAnswers = z.output<typeof tfAnswers>;

export const tfLabel = (v: boolean) => (v ? 'صح' : 'غلط');

export function newTfStatement(): TfStatement {
  return { id: uid(), text: '', answer: true, explanation: '' };
}

export const trueFalseDef: GameDef<TfContent, TfAnswers> = {
  type: 'true_false',
  label: 'صح ولا غلط',
  description: 'جمل سريعة، والطالب يقرر صح ولا غلط قبل ما الوقت يخلص.',
  howTo: 'اقرا الجملة وقرّر بسرعة: صح ولا غلط؟',
  accent: '#1F6FB5',
  itemForms: { one: 'جملة واحدة', two: 'جملتين', few: 'جمل', many: 'جملة' },
  contentSchema: tfContent,
  answersSchema: tfAnswers,
  usesQuestionTimer: true,
  defaultContent: () => ({ statements: [newTfStatement()] }),
  itemCount: (c) => c.statements.length,
  score(content, answers, settings) {
    const given = new Map(answers.answers.map((a) => [a.id, a.value]));
    let correct = 0;
    const review = content.statements.map((s) => {
      const value = given.get(s.id) ?? null;
      const ok = value === s.answer;
      if (ok) correct++;
      return {
        prompt: s.text,
        correct: ok,
        given: value === null ? NOT_ANSWERED : tfLabel(value),
        expected: tfLabel(s.answer),
        explanation: s.explanation || undefined,
      };
    });
    return makeResult(correct, content.statements.length, settings, review);
  },
};
