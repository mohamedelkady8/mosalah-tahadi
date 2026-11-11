import type { ComponentType } from 'react';
import type { GameType } from '@/lib/games/types';
import type { EditorProps } from '../types';
import ClassifyEditor from './ClassifyEditor';
import FillBlankEditor from './FillBlankEditor';
import MatchingEditor from './MatchingEditor';
import McqEditor from './McqEditor';
import MemoryEditor from './MemoryEditor';
import PuzzleEditor from './PuzzleEditor';
import ScrambleEditor from './ScrambleEditor';
import TrueFalseEditor from './TrueFalseEditor';
import WordSearchEditor from './WordSearchEditor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EDITORS: Record<GameType, ComponentType<EditorProps<any>>> = {
  mcq: McqEditor,
  true_false: TrueFalseEditor,
  matching: MatchingEditor,
  memory: MemoryEditor,
  scramble: ScrambleEditor,
  fill_blank: FillBlankEditor,
  classify: ClassifyEditor,
  word_search: WordSearchEditor,
  puzzle: PuzzleEditor,
};
