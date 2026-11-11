'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { canSlidePages, isPlainClick, usePageSlide } from '@/components/motion/PageTransition';

/** Wheel distance (px) needed at the bottom of the page. Separate slow wheel clicks count as at least a quarter each. */
const WHEEL_GOAL = 260;
const TOUCH_GOAL = 120;
/**
 * Only gestures that start at the bottom count: a pause this long starts a new wheel gesture, and a swipe counts
 * if the finger touched down there. The scroll that carries the page to the bottom stops there first.
 */
const GESTURE_GAP = 160;

const HINTS = {
  idle: 'كمّل نزول أو دوس هنا',
  pull: 'كمّل نزول…',
  near: 'قربت…',
  go: 'يلا بينا!',
} as const;
type Phase = keyof typeof HINTS;

/**
 * "Next page" button of the landing. Scrolling past the bottom of the page (wheel, touch or keyboard)
 * fills the ring around the arrow and moves on to the next page when it's full.
 */
export function NextPage({ href, label = 'الصفحة التالية' }: { href: string; label?: string }) {
  const router = useRouter();
  const slide = usePageSlide();
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const goRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>('idle');
  const [cue, setCue] = useState(false);

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  useEffect(() => {
    const link = linkRef.current;
    const root = link?.closest<HTMLElement>('.hm-root');
    if (!link || !root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pull = 0;
    let going = false;
    let shown: Phase = 'idle';
    let lastWheel = 0;
    let wheelFromBottom = false;
    let touchFrom: number | null = null;
    let releaseTimer = 0;
    let navTimer = 0;
    let introDone = false;
    let linkVisible = true;

    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const show = (p: Phase) => {
      if (p !== shown) setPhase((shown = p));
    };
    const syncCue = () => setCue(introDone && !linkVisible && !going);
    const set = (value: number) => {
      pull = Math.min(1, Math.max(0, value));
      root.style.setProperty('--pull', pull.toFixed(3));
      root.classList.toggle('is-pulling', pull > 0);
      if (!going) show(pull === 0 ? 'idle' : pull < 0.6 ? 'pull' : 'near');
    };
    const release = () => {
      window.clearTimeout(releaseTimer);
      if (!going) set(0);
    };
    const releaseLater = () => {
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(release, 450);
    };
    const go = () => {
      if (going) return;
      going = true;
      window.clearTimeout(releaseTimer);
      set(1);
      show('go');
      syncCue();
      root.classList.add('is-going');
      const slides = canSlidePages();
      if (!slides && !reduce) root.classList.add('is-leaving');
      navTimer = window.setTimeout(() => slideRef.current(href, 'up'), reduce ? 0 : slides ? 260 : 420);
    };
    goRef.current = go;
    const add = (amount: number) => {
      set(pull + amount);
      if (pull >= 1) go();
      else releaseLater();
    };

    const onWheel = (e: WheelEvent) => {
      if (going || e.ctrlKey) return;
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (gap > GESTURE_GAP) wheelFromBottom = atBottom();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (dy < 0) return release();
      if (dy === 0 || !wheelFromBottom || !atBottom()) return;
      add((gap > 60 ? Math.max(dy, WHEEL_GOAL * 0.26) : dy) / WHEEL_GOAL);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchFrom = !going && e.touches.length === 1 && atBottom() ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (going || touchFrom === null || e.touches.length !== 1) return;
      set((touchFrom - e.touches[0].clientY) / TOUCH_GOAL);
      if (pull >= 1) go();
    };
    const onTouchEnd = () => {
      touchFrom = null;
      release();
    };
    const onKey = (e: KeyboardEvent) => {
      if (going || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !atBottom()) return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (e.key === 'ArrowDown') add(0.34);
      else if (e.key === 'PageDown' || e.key === ' ' || e.key === 'End') {
        e.preventDefault();
        go();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        linkVisible = entry.isIntersecting;
        syncCue();
      },
      { threshold: 0.6 },
    );
    observer.observe(link);
    const introTimer = window.setTimeout(
      () => {
        introDone = true;
        syncCue();
      },
      reduce ? 0 : 2600,
    );

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(releaseTimer);
      window.clearTimeout(navTimer);
      window.clearTimeout(introTimer);
      observer.disconnect();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [href]);

  function scrollToButton() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <footer className="hm-foot">
      <Link
        ref={linkRef}
        href={href}
        className={`hm-next is-${phase}`}
        onClick={(e) => {
          if (!isPlainClick(e)) return;
          e.preventDefault();
          goRef.current();
        }}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="hm-next-ic">
          <svg viewBox="0 0 64 64" className="hm-ring">
            <circle cx="32" cy="32" r="29" className="hm-ring-track" />
            <circle cx="32" cy="32" r="29" className="hm-ring-fill" pathLength={100} />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9 L12 15 L18 9" />
          </svg>
        </span>
        <span aria-hidden="true" key={phase} className="hm-next-hint">
          {HINTS[phase]}
        </span>
      </Link>

      <button type="button" tabIndex={-1} aria-hidden="true" className={`hm-cue${cue ? ' is-on' : ''}`} onClick={scrollToButton}>
        <span className="hm-cue-mouse">
          <span />
        </span>
        <svg className="hm-cue-swipe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 7 L12 13 L18 7" />
          <path d="M6 12 L12 18 L18 12" />
        </svg>
        <span className="hm-cue-text">انزل لتحت</span>
      </button>
    </footer>
  );
}
