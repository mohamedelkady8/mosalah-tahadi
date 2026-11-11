'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { num } from '@/lib/format';
import type { WordSearchAnswers, WordSearchContent } from '@/lib/games/defs/wordSearch';
import { randomSeed } from '@/lib/games/random';
import { generateWordSearch, lineCells, matchSelection, type Cell } from '@/lib/games/wordsearch';
import { PAIR_COLORS } from '../dnd';
import type { PlayerProps } from '../types';

interface Found {
  start: Cell;
  end: Cell;
  order: number;
}

const key = ([r, c]: Cell) => `${r},${c}`;

/** Snaps a drag to the closest straight or diagonal line from the start cell. */
function snap(start: Cell, to: Cell, size: number): Cell {
  const dr = to[0] - start[0];
  const dc = to[1] - start[1];
  if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) return to;
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  const angle = Math.atan2(dr, dc);
  const step = Math.round(angle / (Math.PI / 4));
  const a = step * (Math.PI / 4);
  const r = Math.min(size - 1, Math.max(0, start[0] + Math.round(Math.sin(a)) * len));
  const c = Math.min(size - 1, Math.max(0, start[1] + Math.round(Math.cos(a)) * len));
  return lineCells(start, [r, c]) ? [r, c] : start;
}

export default function WordSearchPlayer({ content, timeUp, onFinish, onProgress }: PlayerProps<WordSearchContent, WordSearchAnswers>) {
  const [seed] = useState(randomSeed);
  const grid = useMemo(() => generateWordSearch(content.words, content.size, content.directions, seed), [content, seed]);
  const n = grid.size;
  const [found, setFound] = useState<Map<number, Found>>(() => new Map());
  const [start, setStart] = useState<Cell | null>(null);
  const [current, setCurrent] = useState<Cell | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const dragging = useRef(false);
  const moved = useRef(false);
  const finished = useRef(false);
  const foundRef = useRef(found);
  const total = grid.placements.length;

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      seed,
      found: [...foundRef.current.entries()].map(([index, f]) => ({ index, start: f.start, end: f.end })),
    });
  }

  function evaluate(a: Cell, b: Cell) {
    if (finished.current) return;
    const index = matchSelection(grid, content.words, a, b, new Set(foundRef.current.keys()));
    if (index >= 0) {
      const next = new Map(foundRef.current).set(index, { start: a, end: b, order: foundRef.current.size });
      foundRef.current = next;
      setFound(next);
      onProgress?.(next.size, total);
      if (next.size === total) setTimeout(finish, 800);
    } else if (key(a) !== key(b)) {
      const cells = (lineCells(a, b) ?? []).map(key);
      setWrong(cells);
      setTimeout(() => setWrong([]), 450);
    }
  }

  function cellAt(e: PointerEvent): Cell | null {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cell]');
    if (!el?.dataset.cell) return null;
    const [r, c] = el.dataset.cell.split(',').map(Number);
    return [r, c];
  }

  function onDown(e: PointerEvent) {
    const cell = cellAt(e);
    if (!cell || finished.current) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = true;
    moved.current = false;
    if (start && !current && key(start) !== key(cell) && lineCells(start, cell)) {
      setCurrent(cell);
      return;
    }
    setStart(cell);
    setCurrent(null);
  }

  function onMove(e: PointerEvent) {
    if (!dragging.current || !start) return;
    const cell = cellAt(e);
    if (!cell) return;
    if (key(cell) !== key(start)) moved.current = true;
    if (moved.current) setCurrent(snap(start, cell, n));
  }

  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (!start) return;
    if (current && key(current) !== key(start)) {
      evaluate(start, current);
      setStart(null);
      setCurrent(null);
    } else {
      setCurrent(null);
    }
  }

  useEffect(() => {
    if (timeUp) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const selection = new Set(start && current ? (lineCells(start, current) ?? []).map(key) : []);
  const colors = new Map<string, string>();
  for (const f of found.values()) {
    const color = PAIR_COLORS[f.order % PAIR_COLORS.length];
    for (const cell of lineCells(f.start, f.end) ?? []) colors.set(key(cell), color);
  }

  return (
    <div className="gm-board">
      <div className="gm-qhead">
        <span>
          لقيت {num(found.size)} من {num(total)}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={finish}>
          خلصت
        </button>
      </div>
      <div className="gm-ws">
        <div
          className="gm-grid"
          style={{ '--n': n } as CSSProperties}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="grid"
          aria-label="جدول الحروف"
        >
          {grid.cells.map((letter, i) => {
            const cell: Cell = [Math.floor(i / n), i % n];
            const k = key(cell);
            const isStart = start && key(start) === k && !current;
            const cls = ['gm-cell', selection.has(k) ? 'sel' : '', isStart ? 'start' : '', colors.has(k) ? 'found' : '', wrong.includes(k) ? 'wrong' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={k}
                type="button"
                data-cell={k}
                className={cls}
                style={colors.has(k) && !selection.has(k) ? { background: colors.get(k) } : undefined}
                tabIndex={-1}
                aria-label={letter}
              >
                {letter}
              </button>
            );
          })}
        </div>
        <div className="gm-words">
          <ul>
            {grid.placements.map((p) => {
              const f = found.get(p.index);
              return (
                <li key={p.index} className={f ? 'found' : ''}>
                  <span className="sw" style={f ? { background: PAIR_COLORS[f.order % PAIR_COLORS.length] } : undefined} />
                  {content.words[p.index]}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>
        اسحب على الحروف من أول الكلمة لآخرها، أو دوس على أول حرف وبعدين آخر حرف.
      </p>
    </div>
  );
}
