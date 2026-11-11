'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
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
    <section className="wheel-sec" aria-labelledby="wheelTitle">
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
        <svg aria-hidden="true" viewBox="0 0 40 34" className="pointer">
          <path d="M20 34 L2 2 L38 2 Z" fill="#E8C46F" stroke="#2E2E30" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div
          className="wheel"
          role="img"
          aria-label={`عجلة فيها: ${ITEMS.map((i) => i.label).join('، ')}`}
          style={{ background: BACKGROUND, transform: `rotate(${angle}deg)` }}
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
        <span className="hub" aria-hidden="true">
          لف
        </span>
      </div>
    </section>
  );
}
