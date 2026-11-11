export const GAME_TYPES = [
  'mcq',
  'true_false',
  'matching',
  'memory',
  'scramble',
  'fill_blank',
  'classify',
  'word_search',
  'puzzle',
] as const;

export type GameType = (typeof GAME_TYPES)[number];

export function isGameType(value: unknown): value is GameType {
  return typeof value === 'string' && (GAME_TYPES as readonly string[]).includes(value);
}

export interface GameSettings {
  /** Points for each correct item. */
  pointsPerItem: number;
  /** Time limit for the whole game in seconds. 0 = no limit. */
  timeLimitSec: number;
  /** Time limit per question (mcq, true_false). 0 = no limit. */
  questionTimeSec: number;
  shuffle: boolean;
  showExplanations: boolean;
  /** Attempts each student gets. 0 = unlimited. */
  attemptsAllowed: number;
}

export interface ReviewItem {
  prompt: string;
  correct: boolean;
  given?: string;
  expected?: string;
  explanation?: string;
  /** What went wrong, e.g. "عدم التركيز", taken from the chosen option's explanation. */
  problem?: string;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  review: ReviewItem[];
  /** Optional one-line summary, e.g. how many wrong flips in the memory game. */
  summary?: string;
  /** Optional picture for the result screen, e.g. the finished puzzle. */
  picture?: string;
}
