import { z } from 'zod';
import { type CountForms, type GameDef } from '../def';
import { countLabel, num } from '../../format';
import { mulberry32, shuffleWith } from '../random';

export const MAX_PIECES = 48;

/** The «اصنع مجدك بيدك» poster from the original ركّبها game. */
export const PUZZLE_POSTER = { image: '/assets/poster-asna3-magdak.jpg', width: 709, height: 1512, caption: 'اصنع مجدك بيدك' };

const PIECE_FORMS: CountForms = { one: 'قطعة واحدة', two: 'قطعتين', few: 'قطع', many: 'قطعة' };
const MOVE_FORMS: CountForms = { one: 'حركة واحدة', two: 'حركتين', few: 'حركات', many: 'حركة' };

export const puzzleContent = z
  .object({
    // Ends up inside CSS url("..."), so quotes, brackets and spaces are not allowed.
    image: z
      .string()
      .trim()
      .min(1, { message: 'ارفع صورة للعبة.', abort: true })
      .max(1000)
      .regex(/^(https?:\/\/|\/)[^\s"'()\\<>]+$/, 'رابط الصورة مش مظبوط، ارفعها تاني.'),
    width: z.number().int().min(1).max(20000),
    height: z.number().int().min(1).max(20000),
    cols: z.number().int().min(2, 'أقل حاجة عمودين.').max(8, 'أقصى حاجة ٨ أعمدة.'),
    rows: z.number().int().min(2, 'أقل حاجة صفين.').max(8, 'أقصى حاجة ٨ صفوف.'),
    caption: z.string().trim().max(60, 'اسم الصورة طويل أوي.').default(''),
  })
  .refine((c) => c.cols * c.rows <= MAX_PIECES, { message: `أقصى عدد ${num(MAX_PIECES)} قطعة.`, path: ['rows'] });

export const puzzleAnswers = z.object({
  seed: z.number().int().min(1).max(2147483647),
  swaps: z.array(z.tuple([z.number().int().min(0).max(MAX_PIECES - 1), z.number().int().min(0).max(MAX_PIECES - 1)])).max(2000),
});

export type PuzzleContent = z.output<typeof puzzleContent>;
export type PuzzleAnswers = z.output<typeof puzzleAnswers>;

const LEVEL_LABELS = ['سهلة', 'متوسطة', 'صعبة', 'صعبة جدًا'];

/** Ready-made grids that fit the picture's shape. */
export function puzzleLevels(width: number, height: number): { label: string; cols: number; rows: number }[] {
  const ratio = width / height;
  if (ratio > 0.8 && ratio < 1.25) return [3, 4, 5, 6].map((n, i) => ({ label: LEVEL_LABELS[i], cols: n, rows: n }));
  const grids: [number, number][] = [
    [2, 4],
    [3, 4],
    [3, 6],
    [4, 8],
  ];
  return grids.map(([short, long], i) => ({
    label: LEVEL_LABELS[i],
    cols: ratio < 1 ? short : long,
    rows: ratio < 1 ? long : short,
  }));
}

export function placedCount(order: readonly number[]): number {
  let n = 0;
  for (let i = 0; i < order.length; i++) if (order[i] === i) n++;
  return n;
}

/**
 * The scrambled start for a seed: order[position] = piece. Most pieces always start out of place,
 * and the server rebuilds the same start to replay every swap.
 */
export function startOrder(pieces: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const solved = Array.from({ length: pieces }, (_, i) => i);
  const minOut = Math.ceil(pieces * 0.75);
  for (let tries = 0; tries < 40; tries++) {
    const order = shuffleWith(solved, rand);
    if (pieces - placedCount(order) >= minOut) return order;
  }
  return solved.map((i) => (i + 1) % pieces);
}

/** Fewest swaps that solve the board: pieces minus the number of cycles. */
export function fewestSwaps(order: readonly number[]): number {
  const seen = new Array<boolean>(order.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < order.length; i++) {
    if (seen[i]) continue;
    cycles++;
    for (let j = i; !seen[j]; j = order[j]) seen[j] = true;
  }
  return order.length - cycles;
}

export const puzzleDef: GameDef<PuzzleContent, PuzzleAnswers> = {
  type: 'puzzle',
  label: 'ركّبها',
  description: 'صورة متقطّعة ومتلخبطة، والطالب يبدّل القطع لحد ما الصورة ترجع زي ما كانت.',
  howTo: 'دوس على قطعة، وبعدين على القطعة اللي عايز تبدّلها بيها، لحد ما الصورة تتركب. كل ما تركّبها بحركات أقل، درجتك تعلى.',
  accent: '#7A2A3A',
  itemForms: PIECE_FORMS,
  contentSchema: puzzleContent,
  answersSchema: puzzleAnswers,
  usesShuffle: false,
  usesExplanations: false,
  pointsUnit: 'قطعة',
  defaultContent: () => ({ image: '', width: 3, height: 4, cols: 2, rows: 4, caption: '' }),
  itemCount: (c) => c.cols * c.rows,
  score(content, answers, settings) {
    const pieces = content.cols * content.rows;
    const order = startOrder(pieces, answers.seed);
    const fewest = fewestSwaps(order);
    let moves = 0;
    let placed = placedCount(order);
    for (const [i, j] of answers.swaps) {
      if (placed === pieces) break;
      if (i === j || i >= pieces || j >= pieces) continue;
      [order[i], order[j]] = [order[j], order[i]];
      moves++;
      placed = placedCount(order);
    }
    const pts = settings.pointsPerItem;
    const max = pieces * pts;
    const solved = placed === pieces;
    const what = content.caption ? `«${content.caption}»` : 'الصورة';
    let score: number;
    let summary: string;
    if (solved) {
      // A few wasted moves are normal, so they are free.
      const extra = Math.max(0, moves - fewest - Math.ceil(pieces / 4));
      score = Math.max(Math.round(max * 0.3), max - extra * Math.ceil(pts / 5));
      const how = moves <= fewest ? '، وده أقل عدد ممكن!' : `، وأقل عدد ممكن كان ${countLabel(fewest, MOVE_FORMS)}.`;
      summary = `ركّبت ${what} في ${countLabel(moves, MOVE_FORMS)}${how} صوّرها وشيّرها ستوري!`;
    } else {
      score = Math.round(placed * pts * 0.5);
      summary = `حطيت ${num(placed)} من ${countLabel(pieces, PIECE_FORMS)} في مكانها قبل ما الوقت يخلص.`;
    }
    return {
      score: Math.min(max, score),
      maxScore: max,
      correctCount: placed,
      totalCount: pieces,
      summary,
      picture: solved ? content.image : undefined,
      review: [],
    };
  },
};
