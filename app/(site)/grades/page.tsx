import type { Metadata } from 'next';
import { GradeCards } from '@/components/grades/GradeCards';
import { Wheel } from '@/components/grades/Wheel';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';
import { SitePage } from '@/components/site/SiteHeader';
import { Steps } from '@/components/site/Steps';
import { QuoteIcon } from '@/components/ui/icons';
import { getCatalog, getQuoteOfDay, getSession } from '@/lib/data';
import { firstName } from '@/lib/format';

export const metadata: Metadata = { title: 'اختار مرحلتك' };

export default async function GradesPage() {
  const [catalog, quote, session] = await Promise.all([getCatalog(), getQuoteOfDay(), getSession()]);
  const grades = catalog.grades.filter((g) => g.active);
  const name = session.profile ? firstName(session.profile.full_name) : '';

  return (
    <SitePage back={{ href: '/' }}>
      <p className="hello">{name ? `أهلًا يا ${name} في تيم حمثلاح` : 'أهلًا بيك في تيم حمثلاح'}</p>
      <h1 className="gp-title">اختار مرحلتك</h1>
      <Steps current={1} />
      <GradeCards grades={grades} myGradeId={session.profile?.grade_id} />
      <Wheel />
      <div className="quote" data-reveal="">
        <span className="qicon" aria-hidden="true">
          <QuoteIcon size={20} style={{ color: '#E8C46F' }} />
        </span>
        <div>
          <span className="qlabel">هنقولك إيه النهارده؟</span>
          <p className="qtext">{quote}</p>
        </div>
      </div>
      <RevealOnScroll />
    </SitePage>
  );
}
