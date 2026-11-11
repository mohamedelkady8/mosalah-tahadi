'use client';

import type Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** The admin panel and the game screens (drag and drop, scrollable panels) keep native scrolling. */
const NATIVE_SCROLL = /^\/(admin|play|quick|contests)(\/|$)|^\/try\/./;

/**
 * Smooths mouse-wheel and trackpad scrolling on the student pages. Touch scrolling stays native, so
 * phones never download the library or run its animation loop.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const enabled = !NATIVE_SCROLL.test(pathname);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(any-pointer: fine)').matches) return;
    let cancelled = false;
    let lenis: Lenis | null = null;
    import('lenis')
      .then(({ default: LenisClass }) => {
        if (cancelled) return;
        lenis = new LenisClass({ autoRaf: true, lerp: 0.12, allowNestedScroll: true, stopInertiaOnNavigate: true });
        lenisRef.current = lenis;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  // A new page starts wherever the router left the scroll (top, or the restored position on back).
  useEffect(() => {
    lenisRef.current?.scrollTo(window.scrollY, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
