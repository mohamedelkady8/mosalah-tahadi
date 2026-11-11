'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePageSlide } from '@/components/motion/PageTransition';
import { ChevronEnd, SectionIcon } from '@/components/ui/icons';
import type { Section, SectionKey } from '@/lib/sections';

export type WheelSection = Section & { ready: boolean };

const COLORS: Record<SectionKey, { bg: string; fg: string }> = {
  contests: { bg: '#7A2A3A', fg: '#FFFFFF' },
  games: { bg: '#E8C46F', fg: '#2E2E30' },
  quick: { bg: '#F4E6CF', fg: '#2E2E30' },
  tips: { bg: '#1F6FB5', fg: '#FFFFFF' },
  videos: { bg: '#E8C46F', fg: '#2E2E30' },
  daily: { bg: '#F4E6CF', fg: '#2E2E30' },
};
const OFF = { bg: '#B9A493', fg: 'rgba(46,46,48,.55)' };

const SPIN_MS = 3800;
/** Time to read the result before the wheel takes you there. */
const GO_MS = 2400;
const LAST_KEY = 'hm-wheel-last';

/** The student's home: one spin picks a section that has something today, then goes there. */
export function SpinWheel({ sections }: { sections: WheelSection[] }) {
  const router = useRouter();
  const slide = usePageSlide();
  const n = sections.length;
  const step = 360 / n;
  const ready = sections.map((s, i) => (s.ready ? i : -1)).filter((i) => i >= 0);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const angleRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<SVGSVGElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const tickFrame = useRef(0);
  const goTimer = useRef(0);
  const leaving = useRef(false);

  useEffect(() => {
    for (const s of sections) if (s.ready) router.prefetch(s.href);
  }, [router, sections]);

  useEffect(
    () => () => {
      cancelAnimationFrame(tickFrame.current);
      window.clearTimeout(goTimer.current);
    },
    [],
  );

  const background = `conic-gradient(${sections
    .map((s, i) => `${(s.ready ? COLORS[s.key] : OFF).bg} ${i * step}deg ${(i + 1) * step}deg`)
    .join(', ')})`;

  function go(href: string) {
    if (leaving.current) return;
    leaving.current = true;
    window.clearTimeout(goTimer.current);
    slide(href, 'up');
  }

  /** Flicks the pointer every time a segment edge passes under it while the wheel turns. */
  function tickPointer(until: number) {
    const wheel = wheelRef.current;
    const pointer = pointerRef.current;
    if (!wheel || !pointer) return;
    let last = -1;
    const frame = () => {
      const { a, b } = new DOMMatrixReadOnly(getComputedStyle(wheel).transform);
      const seg = Math.floor((((((Math.atan2(b, a) * 180) / Math.PI) % 360) + 360) % 360) / step);
      if (last !== -1 && seg !== last) {
        pointer.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(0deg)' }], { duration: 180, easing: 'ease-out' });
      }
      last = seg;
      if (performance.now() < until) tickFrame.current = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(tickFrame.current);
    tickFrame.current = requestAnimationFrame(frame);
  }

  function spin() {
    if (spinning || result !== null || !ready.length) return;
    let pool = ready;
    try {
      const last = window.localStorage.getItem(LAST_KEY);
      if (ready.length > 1) pool = ready.filter((i) => sections[i].key !== last);
    } catch {}
    const idx = pool[Math.floor(Math.random() * pool.length)];
    // Land somewhere inside the segment, not always on its middle line.
    const within = step * (0.2 + Math.random() * 0.6);
    const target = (((-(idx * step + within)) % 360) + 360) % 360;
    const cur = ((angleRef.current % 360) + 360) % 360;
    angleRef.current += 360 * 6 + ((target - cur + 360) % 360);
    setAngle(angleRef.current);
    setSpinning(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) tickPointer(performance.now() + SPIN_MS + 100);
    window.setTimeout(
      () => {
        setSpinning(false);
        setResult(idx);
        try {
          window.localStorage.setItem(LAST_KEY, sections[idx].key);
        } catch {}
        goTimer.current = window.setTimeout(() => go(sections[idx].href), reduce ? GO_MS + 1200 : GO_MS);
      },
      reduce ? 50 : SPIN_MS + 100,
    );
  }

  useEffect(() => {
    if (result === null) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [result]);

  const picked = result === null ? null : sections[result];
  const offCount = n - ready.length;

  return (
    <section className="wh-stage" aria-label="عجلة الحظ">
      <div className="wheel-box">
        <svg ref={pointerRef} aria-hidden="true" viewBox="0 0 40 34" className="pointer">
          <path d="M20 34 L2 2 L38 2 Z" fill="#E8C46F" stroke="#2E2E30" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div
          ref={wheelRef}
          className={`wheel${result !== null ? ' is-done' : ''}`}
          role="img"
          aria-label={`عجلة فيها: ${sections.map((s) => s.label).join('، ')}`}
          style={{ background, transform: `rotate(${angle}deg)`, transitionDuration: `${SPIN_MS}ms` }}
          onClick={spin}
        >
          {sections.map((s, i) => (
            <span
              key={s.key}
              className={`seg wh-seg${s.ready ? '' : ' off'}${result === i ? ' won' : ''}`}
              style={{
                color: (s.ready ? COLORS[s.key] : OFF).fg,
                transform: `translate(-50%, -50%) rotate(${i * step + step / 2}deg) translateY(calc(var(--wheel-size) * -0.3))`,
              }}
            >
              <SectionIcon section={s.key} size={22} />
              {s.label}
            </span>
          ))}
        </div>
        <button type="button" className="hub" aria-hidden="true" tabIndex={-1} onClick={spin} disabled={spinning || result !== null || !ready.length}>
          لف
        </button>
      </div>

      <div className="wh-act">
        {result === null && (
          <button type="button" className="spin-btn wh-spin" onClick={spin} disabled={spinning || !ready.length} autoFocus>
            {spinning ? 'بتلف...' : 'لف العجلة'}
          </button>
        )}
        {result === null && !spinning && offCount > 0 && ready.length > 0 && (
          <p className="wh-hint">الأجزاء الباهتة لسه مفيهاش حاجة النهارده، والعجلة مش هتقف عليها.</p>
        )}
        {!ready.length && <p className="wh-hint">لسه مفيش حاجة جاهزة النهارده. تعالى كمان شوية!</p>}
        <div ref={resultRef} aria-live="polite" className="result-slot">
          {picked && (
            <div className="result wh-result" style={{ '--go-ms': `${GO_MS}ms` } as CSSProperties}>
              <span className="wh-result-ic" style={{ background: COLORS[picked.key].bg, color: COLORS[picked.key].fg }}>
                <SectionIcon section={picked.key} size={26} />
              </span>
              <span className="r-k">العجلة اختارتلك</span>
              <strong>{picked.label}</strong>
              <span>{picked.desc}</span>
              <button type="button" className="go wh-go" onClick={() => go(picked.href)} autoFocus>
                <span className="wh-go-fill" aria-hidden="true" />
                <span className="wh-go-text">
                  يلا بينا <ChevronEnd size={18} />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
