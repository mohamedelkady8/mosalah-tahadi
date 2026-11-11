import type { Metadata } from 'next';
import { pageMeta } from '@/lib/site';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/auth/AuthForms';
import { SitePage } from '@/components/site/SiteHeader';
import { NOT_CONFIGURED } from '@/lib/auth/errors';
import { getCatalog, getSession } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = pageMeta({
  title: 'اعمل حساب جديد',
  description: 'اعمل حساب ببلاش على موقع تيم حمثلاح، واختار مرحلتك، والعب ألعاب ومسابقات العربي واجمع نقط مع مستر محمد صلاح.',
  path: '/signup',
});

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const { grade } = await searchParams;
  const [session, catalog] = await Promise.all([getSession(), getCatalog()]);
  if (session.profile) redirect(session.profile.role === 'admin' ? '/admin' : '/wheel');
  const defaultGradeId = catalog.grades.find((g) => g.slug === grade)?.id;

  return (
    <SitePage back={{ href: '/grades' }}>
      <div className="page-hero">
        <p className="hello">انضم لتيم حمثلاح</p>
        <h1 className="gp-title">اعمل حسابك</h1>
        <p className="gp-sub">دقيقة واحدة، وهتلاقي ألعاب مرحلتك مستنياك</p>
      </div>
      <div className="auth-wrap a-fadeup" style={{ animationDelay: '.22s' }}>
        <div className="card auth-card">
          {!isSupabaseConfigured && <p className="form-error">{NOT_CONFIGURED}</p>}
          <SignupForm catalog={catalog} defaultGradeId={defaultGradeId} />
        </div>
      </div>
    </SitePage>
  );
}
