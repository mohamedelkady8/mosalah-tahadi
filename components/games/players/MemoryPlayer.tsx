'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GradeIcon } from '@/components/ui/icons';
import { num } from '@/lib/format';
import { buildDeck, type MemoryAnswers, type MemoryContent } from '@/lib/games/defs/memory';
import { randomSeed } from '@/lib/games/random';
import type { PlayerProps } from '../types';

/** Columns per deck size, chosen so rows come out even. */
const COLUMNS: Record<number, number> = { 4: 4, 6: 3, 8: 4, 10: 5, 12: 6, 14: 7, 16: 4, 18: 6, 20: 5 };

export default function MemoryPlayer({ content, timeUp, onFinish, onProgress }: PlayerProps<MemoryContent, MemoryAnswers>) {
  const [seed] = useState(randomSeed);
  const deck = useMemo(() => buildDeck(content, seed), [content, seed]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [miss, setMiss] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [misses, setMisses] = useState(0);
  const flips = useRef<[number, number][]>([]);
  const openRef = useRef<number[]>([]);
  const matchedRef = useRef<Set<string>>(new Set());
  const busy = useRef(false);
  const finished = useRef(false);
  const total = content.pairs.length;

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinish({ seed, flips: flips.current });
  }

  function flip(i: number) {
    if (busy.current || finished.current || openRef.current.includes(i) || matchedRef.current.has(deck[i].pairId)) return;
    if (openRef.current.length === 0) {
      openRef.current = [i];
      setOpen([i]);
      return;
    }
    const a = openRef.current[0];
    flips.current.push([a, i]);
    setMoves((m) => m + 1);
    if (deck[a].pairId === deck[i].pairId) {
      const next = new Set(matchedRef.current).add(deck[i].pairId);
      matchedRef.current = next;
      openRef.current = [];
      setMatched(next);
      setOpen([]);
      onProgress?.(next.size, total);
      if (next.size === total) {
        busy.current = true;
        setTimeout(finish, 800);
      }
    } else {
      busy.current = true;
      openRef.current = [a, i];
      setOpen([a, i]);
      setMisses((m) => m + 1);
      setTimeout(() => setMiss([a, i]), 350);
      setTimeout(() => {
        openRef.current = [];
        setOpen([]);
        setMiss([]);
        busy.current = false;
      }, 1000);
    }
  }

  useEffect(() => {
    if (timeUp) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const cols = COLUMNS[deck.length] ?? 6;

  return (
    <div className="gm-board">
      <div className="gm-qhead">
        <div className="gm-stats">
          <span className="gm-chip">
            لقيت {num(matched.size)} من {num(total)}
          </span>
          <span className="gm-chip">المحاولات: {num(moves)}</span>
          {misses > 0 && <span className="gm-chip">الغلط: {num(misses)}</span>}
        </div>
      </div>
      <div className="gm-mem" style={{ '--cols': cols } as CSSProperties}>
        {deck.map((card, i) => {
          const done = matched.has(card.pairId);
          const isOpen = open.includes(i);
          const cls = ['gm-card', isOpen ? 'open' : '', done ? 'done' : '', miss.includes(i) ? 'miss' : ''].filter(Boolean).join(' ');
          return (
            <button
              key={card.key}
              type="button"
              className={cls}
              onClick={() => flip(i)}
              disabled={done}
              aria-label={isOpen || done ? card.text : `كارت ${num(i + 1)} مقلوب`}
            >
              <span className="gm-card-in">
                <span className="gm-face back" aria-hidden="true">
                  <GradeIcon icon="star" color="#E8C46F" />
                </span>
                <span className="gm-face front" aria-hidden={!(isOpen || done)}>
                  {card.text}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
