import { z } from 'zod';
import { makeResult, type GameDef } from '../def';
import { GAME_META } from '../meta';
import { normalizeAnswer } from '../text';
import { generateWordSearch, selectionSpells, wordLetters } from '../wordsearch';

const cell = z.tuple([z.number().int().min(0).max(30), z.number().int().min(0).max(30)]);

export const wordSearchContent = z
  .object({
    words: z
      .array(z.string().trim().min(1, 'فيه كلمة فاضية.').max(30))
      .min(2, 'ضيف كلمتين على الأقل.')
      .max(15, 'أقصى عدد ١٥ كلمة.'),
    size: z.number().int().min(6, 'أصغر جدول ٦×٦.').max(14, 'أكبر جدول ١٤×١٤.').default(10),
    directions: z.enum(['easy', 'hard']).default('easy'),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    c.words.forEach((w, i) => {
      const len = wordLetters(w).length;
      if (len < 2) ctx.addIssue({ code: 'custom', message: 'الكلمة لازم تبقى حرفين على الأقل.', path: ['words', i] });
      if (len > 14) ctx.addIssue({ code: 'custom', message: 'الكلمة طويلة أوي على الجدول.', path: ['words', i] });
      const key = normalizeAnswer(w);
      if (seen.has(key)) ctx.addIssue({ code: 'custom', message: 'الكلمة دي متكررة.', path: ['words', i] });
      seen.add(key);
    });
  });

export const wordSearchAnswers = z.object({
  seed: z.number().int().min(1).max(2147483647),
  found: z.array(z.object({ index: z.number().int().min(0).max(30), start: cell, end: cell })).max(30),
});

export type WordSearchContent = z.output<typeof wordSearchContent>;
export type WordSearchAnswers = z.output<typeof wordSearchAnswers>;

export const wordSearchDef: GameDef<WordSearchContent, WordSearchAnswers> = {
  type: 'word_search',
  label: GAME_META.word_search.label,
  description: 'جدول حروف فيه كلمات مستخبية، والطالب يدوّر عليها.',
  howTo: 'اسحب صباعك على الحروف من أول الكلمة لآخرها، أو دوس على أول حرف وبعدين آخر حرف.',
  accent: '#E8C46F',
  itemForms: GAME_META.word_search.itemForms,
  contentSchema: wordSearchContent,
  answersSchema: wordSearchAnswers,
  defaultContent: () => ({ words: ['', '', ''], size: 10, directions: 'easy' }),
  itemCount: (c) => c.words.length,
  score(content, answers, settings) {
    const grid = generateWordSearch(content.words, content.size, content.directions, answers.seed);
    const placed = grid.placements.map((p) => p.index);
    const placedSet = new Set(placed);
    const found = new Set<number>();
    for (const f of answers.found) {
      if (found.has(f.index) || !placedSet.has(f.index)) continue;
      if (selectionSpells(grid, content.words[f.index], f.start, f.end)) found.add(f.index);
    }
    const review = placed.map((i) => ({ prompt: content.words[i], correct: found.has(i) }));
    return makeResult(found.size, placed.length, settings, review);
  },
};
