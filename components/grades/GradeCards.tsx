import Link from 'next/link';
import { GradeIcon } from '@/components/ui/icons';
import type { GradeWithTracks } from '@/lib/types';

export function GradeCards({ grades, myGradeId }: { grades: GradeWithTracks[]; myGradeId?: string | null }) {
  return (
    <div className="grid">
      {grades.map((g, i) => (
        <Link
          key={g.id}
          href={`/grades/${g.slug}`}
          className="gp-card"
          style={{ animationDelay: `${(0.6 + i * 0.12).toFixed(2)}s` }}
        >
          <span className="shine-wrap" aria-hidden="true">
            <span className="shine" style={{ animationDelay: `${(2 + i * 0.6).toFixed(1)}s` }} />
          </span>
          {g.id === myGradeId && <span className="gp-mine">مرحلتك</span>}
          <span className="gicon" aria-hidden="true">
            <GradeIcon icon={g.icon} />
          </span>
          <span className="g-k">{g.label}</span>
          <span className="g-n">{g.name}</span>
          <span className="g-s">{g.subtitle}</span>
          <span className="gp-go" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6 L9 12 L15 18" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
