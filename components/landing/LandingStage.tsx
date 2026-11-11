'use client';

import { useEffect, useRef } from 'react';

/** Root of the landing page. Feeds the pointer (--mx, --my: -1..1) and scroll offset (--sy) to the CSS parallax layers. */
export function LandingStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let pointerFrame = 0;
    let scrollFrame = 0;

    const ease = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      root.style.setProperty('--mx', x.toFixed(3));
      root.style.setProperty('--my', y.toFixed(3));
      pointerFrame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002 ? requestAnimationFrame(ease) : 0;
    };
    const follow = (nx: number, ny: number) => {
      targetX = nx;
      targetY = ny;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(ease);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') follow((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) follow(0, 0);
    };
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        root.style.setProperty('--sy', String(Math.round(window.scrollY)));
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (finePointer) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('mouseout', onOut);
    }
    return () => {
      cancelAnimationFrame(pointerFrame);
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  return (
    <div ref={ref} dir="rtl" className="hm-root">
      {children}
    </div>
  );
}
