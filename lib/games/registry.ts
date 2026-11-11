import type { GameDef } from './def';
import { classifyDef } from './defs/classify';
import { fillBlankDef } from './defs/fillBlank';
import { matchingDef } from './defs/matching';
import { mcqDef } from './defs/mcq';
import { memoryDef } from './defs/memory';
import { scrambleDef } from './defs/scramble';
import { trueFalseDef } from './defs/trueFalse';
import { wordSearchDef } from './defs/wordSearch';
import { GAME_TYPES, type GameType } from './types';
import { countLabel, num } from '../format';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGameDef = GameDef<any, any>;

export const GAME_DEFS: Record<GameType, AnyGameDef> = {
  mcq: mcqDef,
  true_false: trueFalseDef,
  matching: matchingDef,
  memory: memoryDef,
  scramble: scrambleDef,
  fill_blank: fillBlankDef,
  classify: classifyDef,
  word_search: wordSearchDef,
};

export const GAME_TYPE_LIST = GAME_TYPES.map((t) => GAME_DEFS[t]);

export function getDef(type: GameType): AnyGameDef {
  return GAME_DEFS[type];
}

export function itemsLabel(type: GameType, count: number): string {
  return countLabel(count, GAME_DEFS[type].itemForms);
}

const PATH_NOUNS: Record<string, string> = {
  questions: 'السؤال',
  statements: 'الجملة',
  pairs: 'الزوج',
  buckets: 'المجموعة',
  words: 'الكلمة',
  distractors: 'الكلمة الزيادة',
};

function describePath(type: GameType, path: PropertyKey[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = path[i + 1];
    if (typeof key !== 'string' || typeof next !== 'number') continue;
    const noun = key === 'items' ? (type === 'classify' ? 'العنصر' : 'الجملة') : PATH_NOUNS[key];
    if (noun) parts.push(`${noun} ${num(next + 1)}`);
  }
  return parts.join('، ');
}

export type ContentCheck<C = unknown> = { ok: true; content: C } | { ok: false; errors: string[] };

/** Validates game content and turns zod issues into short Arabic messages. */
export function checkContent(type: GameType, content: unknown): ContentCheck {
  const parsed = GAME_DEFS[type].contentSchema.safeParse(content);
  if (parsed.success) return { ok: true, content: parsed.data };
  const errors: string[] = [];
  for (const issue of parsed.error.issues) {
    const where = describePath(type, issue.path);
    const message = /[\u0600-\u06FF]/.test(issue.message) ? issue.message : 'فيه خانة ناقصة أو مش مظبوطة.';
    const line = where ? `${where}: ${message}` : message;
    if (!errors.includes(line)) errors.push(line);
    if (errors.length >= 8) break;
  }
  return { ok: false, errors };
}
