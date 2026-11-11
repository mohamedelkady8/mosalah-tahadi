import { Fragment, type CSSProperties } from 'react';
import { HeaderActions } from '@/components/site/SiteHeader';
import { LandingStage } from './LandingStage';
import { NextPage } from './NextPage';

const STAR_PATH = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';

const TITLE_WORDS = ['موقع', 'تيم', 'حمثلاح'];

const NOTES: { label: string; r: number; delay: number }[] = [
  { label: 'مسابقات', r: -4, delay: 0 },
  { label: 'ألعاب', r: 3, delay: 0.4 },
  { label: 'ع السريع', r: -2, delay: 0.8 },
  { label: 'نصايح', r: 4, delay: 1.2 },
  { label: 'فيديوهات تحفيزية', r: -3, delay: 1.6 },
];

const BIRDS: { d: string; origin: string; dur: number }[] = [
  { d: 'M20 40 Q 30 30 40 40 Q 50 30 60 40', origin: '40px 40px', dur: 0.9 },
  { d: 'M90 20 Q 98 12 106 20 Q 114 12 122 20', origin: '106px 20px', dur: 1.1 },
  { d: 'M140 60 Q 150 50 160 60 Q 170 50 180 60', origin: '160px 60px', dur: 0.8 },
  { d: 'M70 85 Q 77 78 84 85 Q 91 78 98 85', origin: '84px 85px', dur: 1 },
  { d: 'M175 100 Q 181 94 187 100 Q 193 94 199 100', origin: '187px 100px', dur: 1.2 },
];

export function Landing() {
  return (
    <LandingStage>
      <svg aria-hidden="true" className="hm-grain">
        <filter id="hmGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hmGrain)" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className="hm-city">
        <g fill="none" stroke="#7A2A3A" strokeWidth="1.2">
          <path d="M40 900 V560 H120 V500 H210 V900 M240 900 V610 H330 V900 M1120 900 V520 H1180 V470 H1260 V900 M1290 900 V600 H1400 V900" />
          <path d="M60 600 H100 M60 640 H100 M260 650 H310 M260 690 H310 M1140 560 H1170 M1300 640 H1390 M1300 680 H1390" />
        </g>
      </svg>

      <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className="hm-layer">
        <g className="hm-drift">
          <g fill="#F3D9C9" opacity="0.16">
            <ellipse cx="120" cy="900" rx="300" ry="120" />
            <ellipse cx="560" cy="930" rx="340" ry="120" />
            <ellipse cx="1000" cy="920" rx="330" ry="120" />
            <ellipse cx="1400" cy="890" rx="300" ry="130" />
          </g>
          <g fill="#FFFFFF" opacity="0.08">
            <ellipse cx="340" cy="840" rx="200" ry="60" />
            <ellipse cx="1180" cy="830" rx="220" ry="60" />
          </g>
          <g fill="#FFFFFF" opacity="0.12">
            <ellipse cx="1220" cy="260" rx="130" ry="34" />
            <ellipse cx="1290" cy="240" rx="80" ry="30" />
            <ellipse cx="240" cy="420" rx="110" ry="28" />
          </g>
        </g>
      </svg>

      <div aria-hidden="true" className="hm-birds">
        <svg viewBox="0 0 220 120" style={{ width: 220, height: 120 }}>
          <g fill="none" stroke="#7A2A3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            {BIRDS.map((b) => (
              <path key={b.d} d={b.d} style={{ transformOrigin: b.origin, animation: `hmFlap ${b.dur}s ease-in-out infinite` }} />
            ))}
          </g>
        </svg>
      </div>

      <div aria-hidden="true" className="hm-plane" style={{ top: '34%', animation: 'hmGlide 16s 2s linear infinite' }}>
        <svg viewBox="0 0 64 40" style={{ width: 64, height: 40 }}>
          <path d="M2 20 L62 2 L40 38 L30 24 Z" fill="#E8C46F" stroke="#2E2E30" strokeWidth="2" strokeLinejoin="round" />
          <path d="M62 2 L30 24" fill="none" stroke="#2E2E30" strokeWidth="2" />
        </svg>
      </div>
      <div aria-hidden="true" className="hm-plane" style={{ top: '58%', animation: 'hmGlide 22s 9s linear infinite' }}>
        <svg viewBox="0 0 64 40" style={{ width: 44, height: 28 }}>
          <path d="M2 20 L62 2 L40 38 L30 24 Z" fill="#FFFFFF" stroke="#1F6FB5" strokeWidth="2" strokeLinejoin="round" />
          <path d="M62 2 L30 24" fill="none" stroke="#1F6FB5" strokeWidth="2" />
        </svg>
      </div>

      <header className="hm-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo.svg" alt="محمد صلاح" className="hm-logo" />
        <HeaderActions />
      </header>

      <main className="hm-main">
        <div className="hm-hero">
          <span aria-hidden="true" className="hm-sun" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/mr-salah.webp" alt="مستر محمد صلاح" className="hm-teacher" />
        </div>

        <div aria-hidden="true" className="hm-stars">
          <svg viewBox="0 0 24 24" style={{ top: -40, right: '6%', width: 30, height: 30, animation: 'hmTwinkle 2.6s ease-in-out infinite' }}>
            <path d={STAR_PATH} fill="#F6D58A" />
          </svg>
          <svg viewBox="0 0 24 24" style={{ top: 10, left: '8%', width: 22, height: 22, animation: 'hmTwinkle 3.2s 0.8s ease-in-out infinite' }}>
            <path d={STAR_PATH} fill="#FFFFFF" />
          </svg>
          <svg viewBox="0 0 24 24" style={{ top: 90, left: '2%', width: 16, height: 16, animation: 'hmTwinkle 2.2s 1.4s ease-in-out infinite' }}>
            <path d={STAR_PATH} fill="#F6D58A" />
          </svg>
        </div>
        <h1 className="hm-title" style={{ filter: 'url(#hmRough)' }}>
          {TITLE_WORDS.map((word, i) => (
            <Fragment key={word}>
              {i > 0 && ' '}
              <span className="hm-w" style={{ '--i': i } as CSSProperties}>
                {word}
              </span>
            </Fragment>
          ))}
        </h1>
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
          <filter id="hmRough">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={4} />
            <feDisplacementMap in="SourceGraphic" scale={4} />
          </filter>
        </svg>
        <p className="hm-slogan">We Don’t Study Alone.</p>

        <p className="hm-lead">هنا هتفضلوا معانا في كل حاجة مختلفة</p>

        <div className="hm-board">
          <svg aria-hidden="true" viewBox="0 0 760 200" preserveAspectRatio="none" className="hm-layer">
            <g fill="none" stroke="#4FA3E0" strokeWidth="2" strokeDasharray="900" style={{ animation: 'hmDraw 2.2s 1.4s ease-out both' }}>
              <path d="M90 60 L 380 150 L 670 60" />
              <path d="M90 60 L 280 40 L 480 40 L 670 60" />
              <path d="M280 40 L 380 150 L 480 40" />
              <path d="M90 60 L 480 40" />
            </g>
          </svg>
          <div className="hm-notes">
            {NOTES.map((n, i) => (
              <span
                key={n.label}
                className="note"
                style={
                  {
                    '--r': `${n.r}deg`,
                    '--drop': `${(i * 0.16).toFixed(2)}s`,
                    '--sway': `${n.delay}s`,
                    transform: `rotate(${n.r}deg)`,
                  } as CSSProperties
                }
              >
                <span className="pin" />
                {n.label}
              </span>
            ))}
          </div>
        </div>

        <p className="hm-tagline">هنكون جزء من يومكوا</p>
        <a href="https://tahadi-team-hamthalah.vercel.app/" target="_blank" rel="noopener" className="hm-cta">
          ابدأ تحدي اليوم
          <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="#2E2E30" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6 L9 12 L15 18" />
          </svg>
        </a>
      </main>

      <div aria-hidden="true" className="hm-road">
        <div className="hm-road-edge" />
        <div className="hm-road-line" />
        <div className="hm-bus">
          <svg viewBox="0 0 132 64">
            <g className="hm-bus-body" stroke="#2E2E30" strokeLinejoin="round">
              <path d="M14 10 H118 Q126 10 126 18 V48 H6 V26 Q6 10 14 10 Z" fill="#E8C46F" strokeWidth="3" />
              <path d="M11 27 Q11 17 19 17 H28 V32 H11 Z" fill="#F4E6CF" strokeWidth="2.5" />
              {[36, 60, 84].map((x) => (
                <rect key={x} x={x} y="17" width="18" height="15" rx="2" fill="#F4E6CF" strokeWidth="2.5" />
              ))}
              <rect x="108" y="17" width="12" height="15" rx="2" fill="#F4E6CF" strokeWidth="2.5" />
              <path d="M6 38 H126" fill="none" strokeWidth="2.5" />
              <circle cx="12" cy="43" r="2.6" fill="#FFF3C9" strokeWidth="1.5" />
            </g>
            {[32, 100].map((cx) => (
              <g key={cx} className="hm-bus-wheel">
                <circle cx={cx} cy="50" r="9" fill="#2E2E30" />
                <circle cx={cx} cy="50" r="3.6" fill="#F4E6CF" />
                <path d={`M${cx} 42.5 V46`} stroke="#F4E6CF" strokeWidth="2" strokeLinecap="round" />
              </g>
            ))}
          </svg>
        </div>
      </div>
      <NextPage href="/grades" />
    </LandingStage>
  );
}
