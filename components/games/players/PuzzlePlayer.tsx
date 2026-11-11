'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ClockIcon, EyeIcon, ShuffleIcon } from '@/components/ui/icons';
import { clock, num } from '@/lib/format';
import { placedCount, startOrder, type PuzzleAnswers, type PuzzleContent } from '@/lib/games/defs/puzzle';
import { randomSeed } from '@/lib/games/random';
import type { PlayerProps } from '../types';

const GAP = 3;
/** The ink frame's padding, the gold ring and the frame's margin, on both sides. */
const FRAME = 40;
const BUTTONS_ROW = 58;

/** Distance from the top of the page, or of the dialog when the game is inside one. */
function offsetTop(el: HTMLElement): number {
  let y = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) y += node.offsetTop;
  return y;
}

export default function PuzzlePlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<PuzzleContent, PuzzleAnswers>) {
  const { image, cols, rows } = content;
  const pieces = cols * rows;
  const [seed, setSeed] = useState(randomSeed);
  const [order, setOrder] = useState(() => startOrder(pieces, seed));
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [peek, setPeek] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [imgState, setImgState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [elapsed, setElapsed] = useState(0);
  const swaps = useRef<[number, number][]>([]);
  const finished = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const showClock = settings.timeLimitSec === 0;

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinish({ seed, swaps: swaps.current });
  }

  function tap(pos: number) {
    if (done || finished.current) return;
    if (sel === null) return setSel(pos);
    if (sel === pos) return setSel(null);
    const next = order.slice();
    [next[sel], next[pos]] = [next[pos], next[sel]];
    swaps.current.push([sel, pos]);
    setOrder(next);
    setSel(null);
    setMoves((m) => m + 1);
    const placed = placedCount(next);
    onProgress?.(placed, pieces);
    if (placed === pieces) {
      setDone(true);
      setPeek(false);
      setTimeout(finish, 1200);
    }
  }

  function reshuffle() {
    if (done || finished.current) return;
    const s = randomSeed();
    const next = startOrder(pieces, s);
    swaps.current = [];
    setSeed(s);
    setOrder(next);
    setSel(null);
    setMoves(0);
    onProgress?.(placedCount(next), pieces);
  }

  useEffect(() => {
    onProgress?.(placedCount(order), pieces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timeUp) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  useEffect(() => {
    if (!showClock || done) return;
    const start = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showClock, done]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgState('ready');
    img.onerror = () => setImgState('error');
    img.src = image;
  }, [image]);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let lastWidth = window.innerWidth;
    const measure = () => {
      const ratio = content.height / content.width;
      // On phones the buttons sit above the board (see games.css), and the whole board should fit on screen.
      const top = offsetTop(el) + (window.matchMedia('(max-width: 560px)').matches ? BUTTONS_ROW : 0);
      const maxH = Math.max(300, Math.min(window.innerHeight * 0.62, window.innerHeight - top - FRAME - 16));
      let w = Math.min(el.clientWidth - FRAME, ratio > 1 ? 420 : 640);
      let h = w * ratio;
      if (h > maxH) {
        h = maxH;
        w = h / ratio;
      }
      const next = { w: Math.floor(w), h: Math.floor(h) };
      setSize((s) => (s && s.w === next.w && s.h === next.h ? s : next));
    };
    // Phones change the window height while scrolling (the address bar), which shouldn't resize the board.
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      measure();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [content.width, content.height]);

  const gap = done ? 0 : GAP;
  const cw = size ? (size.w - gap * (cols - 1)) / cols : 0;
  const ch = size ? (size.h - gap * (rows - 1)) / rows : 0;
  const bg = `url("${image}")`;

  return (
    <div className="gm-board">
      <div className={`gm-pz${done ? ' done' : ''}`} ref={wrap}>
        {size && (
          <div className={`gm-pz-frame${done ? ' a-pop' : ''}`}>
            <div
              className="gm-pz-board"
              role="group"
              aria-label="قطع الصورة"
              style={{
                width: size.w,
                height: size.h,
                gap,
                gridTemplateColumns: `repeat(${cols}, ${cw}px)`,
                gridTemplateRows: `repeat(${rows}, ${ch}px)`,
              }}
            >
              {order.map((piece, pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`gm-pz-tile${sel === pos ? ' sel' : ''}`}
                  style={{
                    backgroundImage: bg,
                    backgroundSize: `${size.w}px ${size.h}px`,
                    backgroundPosition: `${-(piece % cols) * (cw + gap)}px ${-Math.floor(piece / cols) * (ch + gap)}px`,
                  }}
                  onClick={() => tap(pos)}
                  disabled={done}
                  aria-pressed={sel === pos}
                  aria-label={`قطعة ${num(pos + 1)}`}
                />
              ))}
            </div>
            <div className={`gm-pz-peek${peek ? ' on' : ''}`} style={{ backgroundImage: bg }} aria-hidden="true" />
            {imgState === 'loading' && (
              <div className="gm-pz-load">
                <span className="spinner" />
              </div>
            )}
          </div>
        )}

        <div className="gm-pz-side">
          <div className="gm-stats">
            <span className="gm-chip">الحركات: {num(moves)}</span>
            {showClock && (
              <span className="gm-chip">
                <ClockIcon size={16} /> {clock(elapsed)}
              </span>
            )}
          </div>
          <p className="gm-pz-hint" aria-live="polite">
            {imgState === 'error'
              ? 'الصورة مش راضية تحمّل. اتأكد من النت وجرّب تاني.'
              : done
                ? 'ركّبتها!'
                : sel === null
                  ? 'دوس على قطعة، وبعدين على القطعة اللي عايز تبدّلها بيها'
                  : 'تمام، دوس دلوقتي على القطعة التانية'}
          </p>
          <div className="gm-pz-actions">
            <button
              type="button"
              className="btn btn-gold gm-pz-peekbtn"
              disabled={done}
              aria-pressed={peek}
              onPointerDown={() => setPeek(true)}
              onPointerUp={() => setPeek(false)}
              onPointerLeave={() => setPeek(false)}
              onPointerCancel={() => setPeek(false)}
              onClick={(e) => e.detail === 0 && setPeek((p) => !p)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <EyeIcon size={18} /> بص على الصورة
            </button>
            <button type="button" className="btn btn-ghost" disabled={done} onClick={reshuffle}>
              <ShuffleIcon size={18} /> لخبطها تاني
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
