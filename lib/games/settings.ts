import { z } from 'zod';
import type { GameSettings, GameType } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  pointsPerItem: 10,
  timeLimitSec: 0,
  questionTimeSec: 0,
  shuffle: true,
  showExplanations: true,
  attemptsAllowed: 0,
};

export const TYPE_DEFAULT_SETTINGS: Partial<Record<GameType, Partial<GameSettings>>> = {
  mcq: { questionTimeSec: 30 },
  true_false: { questionTimeSec: 12 },
  word_search: { timeLimitSec: 240 },
};

const settingsSchema = z.object({
  pointsPerItem: z.coerce.number().int().min(1).max(100).catch(DEFAULT_SETTINGS.pointsPerItem),
  timeLimitSec: z.coerce.number().int().min(0).max(3600).catch(0),
  questionTimeSec: z.coerce.number().int().min(0).max(600).catch(0),
  shuffle: z.boolean().catch(true),
  showExplanations: z.boolean().catch(true),
  attemptsAllowed: z.coerce.number().int().min(0).max(100).catch(0),
});

export function defaultSettingsFor(type: GameType): GameSettings {
  return { ...DEFAULT_SETTINGS, ...TYPE_DEFAULT_SETTINGS[type] };
}

/** Lenient: anything missing or invalid falls back to the defaults for the game type. */
export function parseSettings(raw: unknown, type: GameType): GameSettings {
  const stored = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return settingsSchema.parse({ ...defaultSettingsFor(type), ...stored });
}
