import Link from 'next/link';
import { getSession } from '@/lib/data';
import { firstName } from '@/lib/format';
import { TransitionLink } from '@/components/motion/PageTransition';
import { ChartIcon, UserIcon, WheelIcon } from '@/components/ui/icons';

export function BackLink({ href, label = 'رجوع' }: { href: string; label?: string }) {
  return (
    <TransitionLink href={href} dir="down" className="back">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2E2E30" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6 L15 12 L9 18" />
      </svg>
      <span className="back-text">{label}</span>
    </TransitionLink>
  );
}

/** `wheel`: show students the way back to their wheel (off on the wheel itself and when the back link goes there). */
export async function HeaderActions({ children, wheel = true }: { children?: React.ReactNode; wheel?: boolean }) {
  const { profile } = await getSession();
  return (
    <div className="head-actions">
      {profile?.role === 'admin' && (
        <Link href="/admin" className="pill pill-gold" title="لوحة التحكم">
          <ChartIcon size={18} />
          <span className="pill-text">لوحة التحكم</span>
        </Link>
      )}
      {wheel && profile?.role === 'student' && (
        <TransitionLink href="/wheel" dir="down" className="pill pill-gold" title="العجلة">
          <WheelIcon size={18} />
          <span className="pill-text">العجلة</span>
        </TransitionLink>
      )}
      {profile ? (
        <Link href="/me" className="pill" title="صفحتي">
          <span className="dot">{firstName(profile.full_name).slice(0, 1) || '؟'}</span>
          <span className="pill-text">{firstName(profile.full_name)}</span>
        </Link>
      ) : (
        <Link href="/login" className="pill pill-login" title="دخول">
          <UserIcon size={18} />
          <span className="pill-text">دخول</span>
        </Link>
      )}
      {children}
    </div>
  );
}

export function Logo() {
  return (
    <TransitionLink href="/" dir="down" aria-label="الصفحة الرئيسية" style={{ display: 'block', flex: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/logo.svg" alt="محمد صلاح" className="gp-logo" width={1335} height={400} />
    </TransitionLink>
  );
}

/** Header of the inner pages, same markup as the original grades page. */
export function SiteHeader({ back, wheelPill = true }: { back?: { href: string; label?: string }; wheelPill?: boolean }) {
  return (
    <header className="gp-head">
      <Logo />
      <HeaderActions wheel={wheelPill && back?.href !== '/wheel'}>{back && <BackLink href={back.href} label={back.label} />}</HeaderActions>
    </header>
  );
}

export function Grain() {
  return <div aria-hidden="true" className="grain" />;
}

/** Full-page wrapper with the gradient, grain, header and footer of the original grades page. */
export function SitePage({
  children,
  back,
  mainClassName = 'gp-main',
  wheelPill = true,
}: {
  children: React.ReactNode;
  back?: { href: string; label?: string };
  mainClassName?: string;
  wheelPill?: boolean;
}) {
  return (
    <div className="gp-root" dir="rtl">
      <Grain />
      <SiteHeader back={back} wheelPill={wheelPill} />
      <main className={mainClassName}>{children}</main>
      <footer className="gp-foot">We Don’t Study Alone.</footer>
    </div>
  );
}
