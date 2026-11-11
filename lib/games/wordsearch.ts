import { mulberry32 } from './random';
import { stripDiacritics } from './text';

export type Cell = [number, number];

export interface Placement {
  index: number;
  start: Cell;
  end: Cell;
}

export interface WordSearchGrid {
  size: number;
  cells: string[];
  placements: Placement[];
}

export type WordSearchDirections = 'easy' | 'hard';

// Column 0 is drawn on the right (RTL), so [0, 1] reads like normal Arabic text.
const EASY_DIRS: Cell[] = [
  [0, 1],
  [1, 0],
];
const HARD_DIRS: Cell[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [1, -1],
  [-1, -1],
];
const FILLER = Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهويةأ');

export function wordLetters(word: string): string[] {
  return Array.from(stripDiacritics(word).replace(/\s+/g, ''));
}

/** Deterministic for a given seed, so the server can rebuild the exact grid the student saw. */
export function generateWordSearch(
  words: string[],
  size: number,
  directions: WordSearchDirections,
  seed: number,
): WordSearchGrid {
  const rand = mulberry32(seed);
  const dirs = directions === 'hard' ? HARD_DIRS : EASY_DIRS;
  const items = words
    .map((w, index) => ({ index, letters: wordLetters(w) }))
    .filter((w) => w.letters.length > 0)
    .sort((a, b) => b.letters.length - a.letters.length || a.index - b.index);
  const longest = items[0]?.letters.length ?? 2;
  const startSize = Math.max(size, longest);
  const tries = 6;

  for (let attempt = 0; attempt < tries; attempt++) {
    const n = startSize + attempt;
    const last = attempt === tries - 1;
    const cells: string[] = new Array(n * n).fill('');
    const placements: Placement[] = [];
    let ok = true;

    for (const item of items) {
      const len = item.letters.length;
      let placed = false;
      for (let t = 0; t < 400 && !placed; t++) {
        const [dr, dc] = dirs[Math.floor(rand() * dirs.length)];
        const r0 = Math.floor(rand() * n);
        const c0 = Math.floor(rand() * n);
        const r1 = r0 + dr * (len - 1);
        const c1 = c0 + dc * (len - 1);
        if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
        let fits = true;
        for (let k = 0; k < len; k++) {
          const cell = cells[(r0 + dr * k) * n + (c0 + dc * k)];
          if (cell && cell !== item.letters[k]) {
            fits = false;
            break;
          }
        }
        if (!fits) continue;
        for (let k = 0; k < len; k++) cells[(r0 + dr * k) * n + (c0 + dc * k)] = item.letters[k];
        placements.push({ index: item.index, start: [r0, c0], end: [r1, c1] });
        placed = true;
      }
      if (!placed && !last) {
        ok = false;
        break;
      }
    }

    if (ok) {
      for (let i = 0; i < cells.length; i++) if (!cells[i]) cells[i] = FILLER[Math.floor(rand() * FILLER.length)];
      return { size: n, cells, placements: placements.sort((a, b) => a.index - b.index) };
    }
  }
  return { size: startSize, cells: [], placements: [] };
}

/** Cells on the straight line from start to end, or null if the line isn't straight or diagonal. */
export function lineCells(start: Cell, end: Cell): Cell[] | null {
  const dr = end[0] - start[0];
  const dc = end[1] - start[1];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  return Array.from({ length: len }, (_, k) => [start[0] + sr * k, start[1] + sc * k] as Cell);
}

/** Letters under the selection, or null when it isn't a straight line inside the grid. */
function selectionLetters(grid: WordSearchGrid, start: Cell, end: Cell): string[] | null {
  const path = lineCells(start, end);
  if (!path || path.length < 2) return null;
  const n = grid.size;
  if (path.some(([r, c]) => r < 0 || c < 0 || r >= n || c >= n)) return null;
  return path.map(([r, c]) => grid.cells[r * n + c]);
}

/** Whether the selection spells the word, read in either direction. */
export function selectionSpells(grid: WordSearchGrid, word: string, start: Cell, end: Cell): boolean {
  const letters = selectionLetters(grid, start, end);
  if (!letters) return false;
  const target = wordLetters(word).join('');
  return letters.join('') === target || letters.slice().reverse().join('') === target;
}

/** Index of a not-yet-found word spelled by the selection, or -1. */
export function matchSelection(grid: WordSearchGrid, words: string[], start: Cell, end: Cell, skip: Set<number>): number {
  for (const p of grid.placements) {
    if (!skip.has(p.index) && selectionSpells(grid, words[p.index], start, end)) return p.index;
  }
  return -1;
}
