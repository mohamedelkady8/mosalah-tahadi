import { z } from 'zod';
import { makeResult, NOT_ANSWERED, type GameDef } from '../def';
import { uid } from '../random';
import { graphemes, normalizeSpaces, words } from '../text';

export const scrambleContent = z
  .object({
    mode: z.enum(['words', 'letters']).default('words'),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          answer: z.string().trim().min(1, 'اكتب الجملة أو الكلمة الصح.').max(200, 'طويلة أوي.'),
          hint: z.string().trim().max(200).default(''),
        }),
      )
      .min(1, 'ضيف جملة واحدة على الأقل.')
      .max(50, 'أقصى عدد ٥٠.'),
  })
  .superRefine((c, ctx) => {
    c.items.forEach((item, i) => {
      const n = c.mode === 'words' ? words(item.answer).length : graphemes(item.answer.replace(/\s+/g, '')).length;
      if (n < 2) {
        ctx.addIssue({
          code: 'custom',
          message: c.mode === 'words' ? 'الجملة لازم تبقى كلمتين على الأقل.' : 'الكلمة لازم تبقى حرفين على الأقل.',
          path: ['items', i, 'answer'],
        });
      }
      if (n > 16) ctx.addIssue({ code: 'custom', message: 'أقصى عدد ١٦ قطعة.', path: ['items', i, 'answer'] });
    });
  });

export const scrambleAnswers = z.object({
  answers: z.array(z.object({ id: z.string().max(40), value: z.string().max(400) })).max(100),
});

export type ScrambleContent = z.output<typeof scrambleContent>;
export type ScrambleItem = ScrambleContent['items'][number];
export type ScrambleAnswers = z.output<typeof scrambleAnswers>;

/** The pieces a student rearranges. */
export function scrambleTiles(mode: ScrambleContent['mode'], answer: string): string[] {
  return mode === 'words' ? words(answer) : graphemes(answer.replace(/\s+/g, ''));
}

export function joinTiles(mode: ScrambleContent['mode'], tiles: string[]): string {
  return mode === 'words' ? tiles.join(' ') : tiles.join('');
}

function same(mode: ScrambleContent['mode'], a: string, b: string) {
  return mode === 'words' ? normalizeSpaces(a) === normalizeSpaces(b) : a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
}

export function newScrambleItem(): ScrambleItem {
  return { id: uid(), answer: '', hint: '' };
}

export const scrambleDef: GameDef<ScrambleContent, ScrambleAnswers> = {
  type: 'scramble',
  label: 'رتّب',
  description: 'كلمات جملة أو حروف كلمة متلخبطة، والطالب يرتبها صح.',
  howTo: 'دوس على القطع بالترتيب الصح عشان تكوّن الجملة، وتقدر تسحبها عشان تغيّر مكانها.',
  accent: '#F4E6CF',
  itemForms: { one: 'جملة واحدة', two: 'جملتين', few: 'جمل', many: 'جملة' },
  contentSchema: scrambleContent,
  answersSchema: scrambleAnswers,
  defaultContent: () => ({ mode: 'words', items: [newScrambleItem()] }),
  itemCount: (c) => c.items.length,
  score(content, answers, settings) {
    const given = new Map(answers.answers.map((a) => [a.id, a.value]));
    let correct = 0;
    const review = content.items.map((item) => {
      const value = given.get(item.id) ?? '';
      const ok = Boolean(value) && same(content.mode, value, item.answer);
      if (ok) correct++;
      return {
        prompt: item.hint || (content.mode === 'words' ? 'رتّب الجملة' : 'رتّب الكلمة'),
        correct: ok,
        given: value || NOT_ANSWERED,
        expected: item.answer,
      };
    });
    return makeResult(correct, content.items.length, settings, review);
  },
};
