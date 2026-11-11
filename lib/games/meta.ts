import { countLabel } from '../format';
import type { CountForms } from './def';
import type { GameType } from './types';

/**
 * The name of each game type and how its items are counted. Kept apart from the game definitions
 * (which carry the validation and scoring code) so list pages can show a label without downloading them.
 */
export const GAME_META: Record<GameType, { label: string; itemForms: CountForms }> = {
  mcq: { label: 'اختيار من متعدد', itemForms: { one: 'سؤال واحد', two: 'سؤالين', few: 'أسئلة', many: 'سؤال' } },
  true_false: { label: 'صح ولا غلط', itemForms: { one: 'جملة واحدة', two: 'جملتين', few: 'جمل', many: 'جملة' } },
  matching: { label: 'وصّل', itemForms: { one: 'زوج واحد', two: 'زوجين', few: 'أزواج', many: 'زوج' } },
  memory: { label: 'كروت الذاكرة', itemForms: { one: 'زوج واحد', two: 'زوجين', few: 'أزواج', many: 'زوج' } },
  scramble: { label: 'رتّب', itemForms: { one: 'جملة واحدة', two: 'جملتين', few: 'جمل', many: 'جملة' } },
  fill_blank: { label: 'كمّل الفراغ', itemForms: { one: 'جملة واحدة', two: 'جملتين', few: 'جمل', many: 'جملة' } },
  classify: { label: 'صنّف', itemForms: { one: 'عنصر واحد', two: 'عنصرين', few: 'عناصر', many: 'عنصر' } },
  word_search: { label: 'دوّر على الكلمة', itemForms: { one: 'كلمة واحدة', two: 'كلمتين', few: 'كلمات', many: 'كلمة' } },
  puzzle: { label: 'ركّبها', itemForms: { one: 'قطعة واحدة', two: 'قطعتين', few: 'قطع', many: 'قطعة' } },
};

export function typeLabel(type: GameType): string {
  return GAME_META[type].label;
}

export function itemsLabel(type: GameType, count: number): string {
  return countLabel(count, GAME_META[type].itemForms);
}
