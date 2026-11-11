'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface WheelItem {
  label: string;
  desc: string;
  bg: string;
  fg: string;
  href?: string;
}

const ITEMS: WheelItem[] = [
  { label: 'مسابقات', desc: 'نافس زمايلك، وخش لوحة الشرف.', bg: '#7A2A3A', fg: '#FFFFFF', href: '/leaderboard' },
  { label: 'ألعاب', desc: 'اتعلم العربي وإنت بتلعب.', bg: '#E8C46F', fg: '#2E2E30', href: '/games' },
  { label: 'ع السريع', desc: '١٠ أسئلة، وبعد كل سؤال تحليل يقولك مشكلتك فين.', bg: '#F4E6CF', fg: '#2E2E30', href: 'https://tahadi-team-hamthalah.vercel.app/' },
  { label: 'نصايح', desc: 'نصايح من التيم هتسهّل عليك.', bg: '#1F6FB5', fg: '#FFFFFF' },
  { label: 'فيديوهات تحفيزية', desc: 'فيديوهات من التيم هتفرق معاك.', bg: '#E8C46F', fg: '#2E2E30' },
  { label: 'سؤال اليوم', desc: 'سؤال واحد، يتحل في ١٠ ثواني.', bg: '#F4E6CF', fg: '#2E2E30', href: '/daily' },
];

const N = ITEMS.length;
const STEP = 360 / N;
const BACKGROUND = `conic-gradient(${ITEMS.map((it, i) => `${it.bg} ${i * STEP}deg ${(i + 1) * STEP}deg`).join(', ')})`;

export function Wheel() {
  const toast = useToast();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spun, setSpun] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const angleRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<SVGSVGElement>(null);
  const tickFrame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(tickFrame.current), []);

  /** Flicks the pointer every time a segment edge passes under it while the wheel turns. */
  function tickPointer(until: number) {
    const wheel = wheelRef.current;
    const pointer = pointerRef.current;
    if (!wheel || !pointer) return;
    let last = -1;
    const frame = () => {
      const { a, b } = new DOMMatrixReadOnly(getComputedStyle(wheel).transform);
      const seg = Math.floor(((((Math.atan2(b, a) * 180) / Math.PI) % 360) + 360) % 360 / STEP);
      if (last !== -1 && seg !== last) {
        pointer.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(0deg)' }], {
          duration: 180,
          easing: 'ease-out',
        });
      }
      last = seg;
      if (performance.now() < until) tickFrame.current = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(tickFrame.current);
    tickFrame.current = requestAnimationFrame(frame);
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const idx = Math.floor(Math.random() * N);
    const target = ((-(idx * STEP + STEP / 2)) % 360 + 360) % 360;
    const cur = ((angleRef.current % 360) + 360) % 360;
    angleRef.current += 360 * 5 + ((target - cur + 360) % 360);
    setAngle(angleRef.current);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) tickPointer(performance.now() + 4300);
    setTimeout(
      () => {
        setSpinning(false);
        setSpun(true);
        setResult(idx);
      },
      reduce ? 50 : 4300,
    );
  }

  const picked = result === null ? null : ITEMS[result];

  return (
    <section className="wheel-sec" aria-labelledby="wheelTitle" data-reveal="">
      <div className="wheel-text">
        <h2 id="wheelTitle">يلا نبدأ</h2>
        <p>مش عارف تبدأ منين؟ لف العجلة، وشوف هتبدأ بإيه النهارده.</p>
        {picked && (
          <div className="result">
            <span className="r-k">طلعتلك</span>
            <strong>{picked.label}</strong>
            <span>{picked.desc}</span>
            {picked.href?.startsWith('/') ? (
              <Link href={picked.href}>يلا بينا</Link>
            ) : picked.href ? (
              <a href={picked.href} target="_blank" rel="noopener">
                يلا بينا
              </a>
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast('الجزء ده تحت التجهيز، وقريب هيبقى موجود');
                }}
              >
                يلا بينا
              </a>
            )}
          </div>
        )}
        <button type="button" className="spin-btn" onClick={spin} disabled={spinning}>
          {spinning ? 'بتلف...' : spun ? 'لف تاني' : 'لف العجلة'}
        </button>
      </div>
      <div className="wheel-box">
        <svg ref={pointerRef} aria-hidden="true" viewBox="0 0 40 34" className="pointer">
          <path d="M20 34 L2 2 L38 2 Z" fill="#E8C46F" stroke="#2E2E30" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div
          ref={wheelRef}
          className="wheel"
          role="img"
          aria-label={`عجلة فيها: ${ITEMS.map((i) => i.label).join('، ')}`}
          style={{ background: BACKGROUND, transform: `rotate(${angle}deg)` }}
          onClick={spin}
        >
          {ITEMS.map((it, i) => (
            <span
              key={it.label}
              className="seg"
              style={{
                color: it.fg,
                transform: `translate(-50%, -50%) rotate(${i * STEP + STEP / 2}deg) translateY(calc(var(--wheel-size) * -0.31))`,
              }}
            >
              {it.label}
            </span>
          ))}
        </div>
        <button type="button" className="hub" aria-hidden="true" tabIndex={-1} onClick={spin} disabled={spinning}>
          لف
        </button>
      </div>
    </section>
  );
}
