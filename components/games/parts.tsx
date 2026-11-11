'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronEnd, FlameIcon } from '@/components/ui/icons';
import { num } from '@/lib/format';
import { highlightParts } from '@/lib/games/text';

/** Per-question countdown. Restarts when `resetKey` changes and stops while `running` is false. */
export function useCountdown(seconds: number, running: boolean, resetKey: unknown, onExpire: () => void): number {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  useLayoutEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    if (!seconds || !running) return;
    const end = Date.now() + seconds * 1000;
    setLeft(seconds);
    const t = setInterval(() => {
      const l = Math.ceil((end - Date.now()) / 1000);
      if (l <= 0) {
        clearInterval(t);
        setLeft(0);
        expire.current();
      } else {
        setLeft(l);
      }
    }, 200);
    return () => clearInterval(t);
  }, [seconds, running, resetKey]);
  return left;
}

export function TimerRing({ left, total }: { left: number; total: number }) {
  const low = left <= Math.max(3, Math.round(total / 4));
  return (
    <div
      className={`gm-ring${low ? ' low' : ''}`}
      style={{ '--p': total ? left / total : 0 } as CSSProperties}
      role="timer"
      aria-label={`فاضل ${num(left)} ثانية`}
    >
      <span>{num(left)}</span>
    </div>
  );
}

export function TimerBar({ left, total }: { left: number; total: number }) {
  const low = left <= Math.max(3, Math.round(total / 4));
  return (
    <div className={`gm-tbar${low ? ' low' : ''}`} role="timer" aria-label={`فاضل ${num(left)} ثانية`}>
      <span style={{ width: `${total ? (left / total) * 100 : 0}%` }} />
    </div>
  );
}

export function Streak({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span className="gm-streak a-pop" key={count}>
      <FlameIcon size={18} /> {num(count)} ورا بعض
    </span>
  );
}

export function StepHead({ index, total, label, children }: { index: number; total: number; label: string; children?: ReactNode }) {
  return (
    <>
      <div className="gm-qhead">
        <span>
          {label} {num(index + 1)} من {num(total)}
        </span>
        <div className="row" style={{ gap: 10 }}>
          {children}
        </div>
      </div>
      <div className="bar gm-progress">
        <span style={{ width: `${(index / total) * 100}%` }} />
      </div>
    </>
  );
}

export function Feedback({
  ok,
  title,
  children,
  onNext,
  last,
}: {
  ok: boolean;
  title: string;
  children?: ReactNode;
  onNext?: () => void;
  last?: boolean;
}) {
  return (
    <div className={`gm-feedback ${ok ? 'ok' : 'bad'} a-pop`} role="status">
      <strong>{title}</strong>
      {children}
      {onNext && (
        <button type="button" className="btn btn-ink" onClick={onNext} autoFocus>
          {last ? 'شوف النتيجة' : 'اللي بعده'} <ChevronEnd size={18} />
        </button>
      )}
    </div>
  );
}

/** Renders «...» parts of a text as highlighted words. */
export function Highlighted({ text }: { text: string }) {
  return (
    <>
      {highlightParts(text).map((p, i) =>
        p.mark ? (
          <mark key={i} className="gm-hl">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

const ARABIC_DIGITS: Record<string, string> = { '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6' };

/** Number key pressed (1-6, Western or Arabic digits), or 0. */
export function digitKey(e: KeyboardEvent): number {
  if (e.altKey || e.ctrlKey || e.metaKey) return 0;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return 0;
  const k = ARABIC_DIGITS[e.key] ?? e.key;
  const n = Number(k);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : 0;
}
