import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { GameType } from '@/lib/games/types';
import type { PlayerProps } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Player = ComponentType<PlayerProps<any, any>>;

function Loading() {
  return (
    <div className="gm-board">
      <div className="empty">
        <span className="spinner" />
      </div>
    </div>
  );
}

/**
 * Each game type is its own download, so a multiple-choice game doesn't ship the drag-and-drop code
 * of the other eight. GameShell warms the right one while the student reads the start screen.
 */
const LOADERS: Record<GameType, () => Promise<{ default: Player }>> = {
  mcq: () => import('./McqPlayer'),
  true_false: () => import('./TrueFalsePlayer'),
  matching: () => import('./MatchingPlayer'),
  memory: () => import('./MemoryPlayer'),
  scramble: () => import('./ScramblePlayer'),
  fill_blank: () => import('./FillBlankPlayer'),
  classify: () => import('./ClassifyPlayer'),
  word_search: () => import('./WordSearchPlayer'),
  puzzle: () => import('./PuzzlePlayer'),
};

export const PLAYERS: Record<GameType, Player> = {
  mcq: dynamic(() => import('./McqPlayer'), { loading: Loading }),
  true_false: dynamic(() => import('./TrueFalsePlayer'), { loading: Loading }),
  matching: dynamic(() => import('./MatchingPlayer'), { loading: Loading }),
  memory: dynamic(() => import('./MemoryPlayer'), { loading: Loading }),
  scramble: dynamic(() => import('./ScramblePlayer'), { loading: Loading }),
  fill_blank: dynamic(() => import('./FillBlankPlayer'), { loading: Loading }),
  classify: dynamic(() => import('./ClassifyPlayer'), { loading: Loading }),
  word_search: dynamic(() => import('./WordSearchPlayer'), { loading: Loading }),
  puzzle: dynamic(() => import('./PuzzlePlayer'), { loading: Loading }),
};

/** Starts the download early. A failure here is harmless: the player loads again when the game starts. */
export function preloadPlayer(type: GameType) {
  LOADERS[type]().catch(() => {});
}
