import type { ComponentType } from 'react';
import type { GameType } from '@/lib/games/types';
import type { PlayerProps } from '../types';
import ClassifyPlayer from './ClassifyPlayer';
import FillBlankPlayer from './FillBlankPlayer';
import MatchingPlayer from './MatchingPlayer';
import McqPlayer from './McqPlayer';
import MemoryPlayer from './MemoryPlayer';
import PuzzlePlayer from './PuzzlePlayer';
import ScramblePlayer from './ScramblePlayer';
import TrueFalsePlayer from './TrueFalsePlayer';
import WordSearchPlayer from './WordSearchPlayer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PLAYERS: Record<GameType, ComponentType<PlayerProps<any, any>>> = {
  mcq: McqPlayer,
  true_false: TrueFalsePlayer,
  matching: MatchingPlayer,
  memory: MemoryPlayer,
  scramble: ScramblePlayer,
  fill_blank: FillBlankPlayer,
  classify: ClassifyPlayer,
  word_search: WordSearchPlayer,
  puzzle: PuzzlePlayer,
};
