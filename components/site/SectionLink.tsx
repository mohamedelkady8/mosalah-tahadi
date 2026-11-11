'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useToast } from '@/components/ui/Toast';
import { COMING_SOON, type Section } from '@/lib/sections';

/** Opens a site section: in-app link, external site in a new tab, or a "coming soon" toast. */
export function SectionLink({ section, className, style, children }: { section: Section; className?: string; style?: CSSProperties; children: ReactNode }) {
  const toast = useToast();
  if (section.href?.startsWith('/')) {
    return (
      <Link href={section.href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  if (section.href) {
    return (
      <a href={section.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} style={style} onClick={() => toast(COMING_SOON)}>
      {children}
    </button>
  );
}
