import type { z } from 'zod';
import type { GameSettings, GameType, ScoreResult } from './types';

export interface CountForms {
  one: string;
  two: string;
  few: string;
  many: string;
}

export interface GameDef<C = unknown, A = unknown> {
  type: GameType;
  /** Full name, e.g. "اختيار من متعدد". */
  label: string;
  /** What the admin sees when picking a type. */
  description: string;
  /** One-line instructions on the game's start screen. */
  howTo: string;
  /** Card color on the student pages. */
  accent: string;
  itemForms: CountForms;
  contentSchema: z.ZodType<C>;
  answersSchema: z.ZodType<A>;
  defaultContent(): C;
  itemCount(content: C): number;
  score(content: C, answers: A, settings: GameSettings): ScoreResult;
  /** Whether "time per question" applies to this type. */
  usesQuestionTimer?: boolean;
}

export function makeResult(
  correct: number,
  total: number,
  settings: GameSettings,
  review: ScoreResult['review'],
  extra?: Partial<ScoreResult>,
): ScoreResult {
  const pts = settings.pointsPerItem;
  return { score: correct * pts, maxScore: total * pts, correctCount: correct, totalCount: total, review, ...extra };
}

export const NOT_ANSWERED = 'ماجاوبتش';
