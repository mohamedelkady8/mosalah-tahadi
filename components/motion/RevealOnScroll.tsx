'use client';

import { useEffect } from 'react';

/** Elements marked with `data-reveal` that start below the fold stay hidden until they're scrolled into view, then rise in. */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fold = window.innerHeight * 0.92;
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
      (el) => el.getBoundingClientRect().top > fold,
    );
    if (!items.length) return;
    for (const el of items) el.classList.add('rv');
    const observer = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.setProperty('--rd', `${n++ * 90}ms`);
          el.classList.add('rv-in');
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    );
    for (const el of items) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return null;
}
