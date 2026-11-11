import { TransitionLink } from '@/components/motion/PageTransition';
import { GradeIcon } from '@/components/ui/icons';
import type { GradeWithTracks } from '@/lib/types';

export function GradeCards({ grades, myGradeId }: { grades: GradeWithTracks[]; myGradeId?: string | null }) {
  return (
    <div className="grid">
      {grades.map((g) => {
        const mine = g.id === myGradeId;
        return (
          <TransitionLink key={g.id} href={`/grades/${g.slug}`} className={`gp-card gp-grade${mine ? ' is-mine' : ''}`} prefetch>
            <span className="gicon" aria-hidden="true">
              <GradeIcon icon={g.icon} />
            </span>
            <span className="g-txt">
              <span className="g-k">
                {g.label}
                {mine && <span className="gp-mine">مرحلتك</span>}
              </span>
              <span className="g-n">{g.name}</span>
              <span className="g-s">{g.subtitle}</span>
            </span>
            <span className="gp-go" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6 L9 12 L15 18" />
              </svg>
            </span>
          </TransitionLink>
        );
      })}
    </div>
  );
}
