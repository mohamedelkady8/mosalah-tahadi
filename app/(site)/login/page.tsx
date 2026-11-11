import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/AuthForms';
import { SitePage } from '@/components/site/SiteHeader';
import { safeNext } from '@/lib/auth/identifier';
import { NOT_CONFIGURED } from '@/lib/auth/errors';
import { getSession } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session.profile) redirect(safeNext(next) ?? (session.profile.role === 'admin' ? '/admin' : '/wheel'));

  return (
    <SitePage back={{ href: '/grades' }}>
      <div className="page-hero">
        <p className="hello">أهلًا بيك تاني</p>
        <h1 className="gp-title">سجّل دخولك</h1>
        <p className="gp-sub">ادخل بحسابك وكمّل من مكان ما وقفت</p>
      </div>
      <div className="auth-wrap a-fadeup" style={{ animationDelay: '.22s' }}>
        <div className="card auth-card">
          {!isSupabaseConfigured && <p className="form-error">{NOT_CONFIGURED}</p>}
          <LoginForm next={safeNext(next) ?? undefined} />
        </div>
      </div>
    </SitePage>
  );
}
