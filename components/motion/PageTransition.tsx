'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ComponentProps, type MouseEvent } from 'react';

/** `up` slides the next page in from below (going forward), `down` drops the current page away (going back). */
export type SlideDirection = 'up' | 'down';

let finishPending: (() => void) | null = null;
let running = 0;

/** Mounted once in the root layout: lets a running page slide finish as soon as the new route has rendered. */
export function TransitionSettler() {
  const pathname = usePathname();
  useEffect(() => {
    finishPending?.();
    finishPending = null;
  }, [pathname]);
  return null;
}

export function canSlidePages() {
  return 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePageSlide() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (href: string, dir: SlideDirection) => {
      if (!canSlidePages() || new URL(href, window.location.href).pathname === pathname) {
        router.push(href);
        return;
      }
      const html = document.documentElement;
      const id = ++running;
      html.dataset.vt = dir;
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            finishPending?.();
            finishPending = resolve;
            // The screen stays frozen until the next page renders; if it's slow, show it without the slide instead.
            window.setTimeout(() => {
              if (finishPending !== resolve) return;
              finishPending = null;
              transition.skipTransition();
              resolve();
            }, 1200);
            router.push(href);
          }),
      );
      transition.ready.catch(() => {});
      const done = () => {
        if (running === id) delete html.dataset.vt;
      };
      transition.finished.then(done, done);
    },
    [router, pathname],
  );
}

export function isPlainClick(e: MouseEvent<HTMLAnchorElement>) {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string; dir?: SlideDirection };

export function TransitionLink({ href, dir = 'up', onClick, onPointerEnter, onTouchStart, onFocus, ...rest }: TransitionLinkProps) {
  const slide = usePageSlide();
  const router = useRouter();
  // Load the whole next page on intent so the slide can start right away.
  const warm = () => router.prefetch(href);
  return (
    <Link
      {...rest}
      href={href}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        warm();
      }}
      onTouchStart={(e) => {
        onTouchStart?.(e);
        warm();
      }}
      onFocus={(e) => {
        onFocus?.(e);
        warm();
      }}
      onClick={(e) => {
        onClick?.(e);
        if (!isPlainClick(e) || rest.target === '_blank') return;
        e.preventDefault();
        slide(href, dir);
      }}
    />
  );
}
