import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Section } from '@/lib/sections';

export function SectionLink({ section, className, style, children }: { section: Section; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <Link href={section.href} className={className} style={style}>
      {children}
    </Link>
  );
}
