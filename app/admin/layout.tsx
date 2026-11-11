import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { Grain } from '@/components/site/SiteHeader';
import { LockIcon } from '@/components/ui/icons';
import { getSession } from '@/lib/data';
import { firstName } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import '../admin.css';

export const metadata: Metadata = { title: 'لوحة التحكم', robots: { index: false, follow: false } };

function AdminGate({ title, children, signedIn }: { title: string; children: React.ReactNode; signedIn: boolean }) {
  return (
    <div className="gp-root ad-403" dir="rtl">
      <Grain />
      <div className="card empty" style={{ maxWidth: 520, position: 'relative' }}>
        <div className="e-ic">
          <LockIcon size={30} />
        </div>
        <h3>{title}</h3>
        <p>{children}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/" className="btn btn-gold">
            الصفحة الرئيسية
          </Link>
          {signedIn && (
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-ghost">
                خروج وادخل بحساب تاني
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <AdminGate title="لوحة التحكم محتاجة Supabase" signedIn={false}>
        حط NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في ملف .env.local وشغّل الموقع تاني. الخطوات كلها في ملف README.
      </AdminGate>
    );
  }
  const { userId, profile } = await getSession();
  if (!userId) redirect('/login?next=/admin');
  if (profile?.role !== 'admin') {
    return (
      <AdminGate title="الصفحة دي للأدمن بس" signedIn>
        إنت داخل بحساب طالب. لو إنت من التيم، خلّي المسؤول يخلّي حسابك أدمن من صفحة الطلاب.
      </AdminGate>
    );
  }
  return <AdminShell name={firstName(profile.full_name)}>{children}</AdminShell>;
}
