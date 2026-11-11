import type { GameRow } from '@/lib/types';
import type { GameSettings } from '@/lib/games/types';

export type PlayableGame = Pick<
  GameRow,
  'id' | 'slug' | 'title' | 'description' | 'type' | 'content' | 'settings' | 'item_count' | 'cover_url' | 'topic' | 'difficulty'
>;

export interface PlayerProps<C, A> {
  content: C;
  settings: GameSettings;
  /** The whole-game time limit ran out; the player should hand in what it has. */
  timeUp: boolean;
  onFinish: (answers: A) => void;
  onProgress?: (done: number, total: number) => void;
}

export interface EditorProps<C> {
  value: C;
  onChange: (value: C) => void;
}
