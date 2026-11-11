import { z } from 'zod';
import { type GameDef } from '../def';
import { GAME_META } from '../meta';
import { num } from '../../format';
import { mulberry32, shuffleWith, uid } from '../random';

export const memoryContent = z.object({
  pairs: z
    .array(
      z.object({
        id: z.string().min(1),
        a: z.string().trim().min(1, 'فيه كارت فاضي.').max(80, 'الكلام على الكارت طويل أوي.'),
        b: z.string().trim().min(1, 'فيه كارت فاضي.').max(80, 'الكلام على الكارت طويل أوي.'),
      }),
    )
    .min(2, 'ضيف زوجين على الأقل.')
    .max(12, 'أقصى عدد ١٢ زوج.'),
});

export const memoryAnswers = z.object({
  seed: z.number().int().min(1).max(2147483647),
  flips: z.array(z.tuple([z.number().int().min(0).max(60), z.number().int().min(0).max(60)])).max(400),
});

export type MemoryContent = z.output<typeof memoryContent>;
export type MemoryPair = MemoryContent['pairs'][number];
export type MemoryAnswers = z.output<typeof memoryAnswers>;

export interface MemoryCard {
  key: string;
  pairId: string;
  text: string;
}

/** The shuffled deck for a seed. The server rebuilds it to check every flip. */
export function buildDeck(content: MemoryContent, seed: number): MemoryCard[] {
  const cards = content.pairs.flatMap((p) => [
    { key: `${p.id}:a`, pairId: p.id, text: p.a },
    { key: `${p.id}:b`, pairId: p.id, text: p.b },
  ]);
  return shuffleWith(cards, mulberry32(seed));
}

export function newMemoryPair(): MemoryPair {
  return { id: uid(), a: '', b: '' };
}

export const memoryDef: GameDef<MemoryContent, MemoryAnswers> = {
  type: 'memory',
  label: GAME_META.memory.label,
  description: 'كروت مقلوبة، والطالب يلاقي كل كارت مع اللي يناسبه بأقل محاولات.',
  howTo: 'اقلب كارتين في كل مرة ولاقي الكروت اللي بتكمّل بعض. كل ما تخلص بمحاولات أقل، درجتك تعلى.',
  accent: '#E8C46F',
  itemForms: GAME_META.memory.itemForms,
  contentSchema: memoryContent,
  answersSchema: memoryAnswers,
  defaultContent: () => ({ pairs: [newMemoryPair(), newMemoryPair(), newMemoryPair()] }),
  itemCount: (c) => c.pairs.length,
  score(content, answers, settings) {
    const deck = buildDeck(content, answers.seed);
    const matched = new Set<string>();
    let misses = 0;
    let moves = 0;
    for (const [i, j] of answers.flips) {
      if (i === j || i >= deck.length || j >= deck.length) continue;
      const a = deck[i];
      const b = deck[j];
      if (matched.has(a.pairId) || matched.has(b.pairId)) continue;
      moves++;
      if (a.pairId === b.pairId) matched.add(a.pairId);
      else misses++;
    }
    const pairs = content.pairs.length;
    const pts = settings.pointsPerItem;
    const base = matched.size * pts;
    // Some misses are unavoidable, so the first `pairs` misses are free.
    const penalty = Math.max(0, misses - pairs) * Math.ceil(pts / 5);
    const floor = Math.round(base * 0.3);
    const score = Math.min(pairs * pts, Math.max(floor, base - penalty));
    return {
      score,
      maxScore: pairs * pts,
      correctCount: matched.size,
      totalCount: pairs,
      summary: `لقيت ${num(matched.size)} من ${num(pairs)} في ${num(moves)} محاولة، منهم ${num(misses)} غلط.`,
      review: content.pairs.map((p) => ({ prompt: `${p.a} ⟷ ${p.b}`, correct: matched.has(p.id) })),
    };
  },
};
