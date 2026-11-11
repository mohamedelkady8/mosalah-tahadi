import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/auth/AuthForms';
import { SitePage } from '@/components/site/SiteHeader';
import { NOT_CONFIGURED } from '@/lib/auth/errors';
import { getCatalog, getSession } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'حساب جديد' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const { grade } = await searchParams;
  const [session, catalog] = await Promise.all([getSession(), getCatalog()]);
  if (session.profile) redirect('/grades');
  const defaultGradeId = catalog.grades.find((g) => g.slug === grade)?.id;

  return (
    <SitePage back={{ href: '/grades' }}>
      <div className="page-hero">
        <p className="hello">انضم لتيم حمثلاح</p>
        <h1 className="gp-title">اعمل حسابك</h1>
        <p className="gp-sub">دقيقة واحدة، وهتلاقي ألعاب مرحلتك مستنياك</p>
      </div>
      <div className="auth-wrap a-fadeup" style={{ animationDelay: '.45s' }}>
        <div className="card auth-card">
          {!isSupabaseConfigured && <p className="form-error">{NOT_CONFIGURED}</p>}
          <SignupForm catalog={catalog} defaultGradeId={defaultGradeId} />
        </div>
      </div>
    </SitePage>
  );
}
