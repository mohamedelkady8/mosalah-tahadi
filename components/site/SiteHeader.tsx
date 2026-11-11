import Link from 'next/link';
import { getSession } from '@/lib/data';
import { firstName } from '@/lib/format';
import { ChartIcon, UserIcon } from '@/components/ui/icons';

export function BackLink({ href, label = 'رجوع' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="back">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2E2E30" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6 L15 12 L9 18" />
      </svg>
      {label}
    </Link>
  );
}

export async function HeaderActions({ children }: { children?: React.ReactNode }) {
  const { profile } = await getSession();
  return (
    <div className="head-actions">
      {profile?.role === 'admin' && (
        <Link href="/admin" className="pill pill-gold" title="لوحة التحكم">
          <ChartIcon size={18} />
          <span className="pill-text">لوحة التحكم</span>
        </Link>
      )}
      {profile ? (
        <Link href="/me" className="pill" title="صفحتي">
          <span className="dot">{firstName(profile.full_name).slice(0, 1) || '؟'}</span>
          <span className="pill-text">{firstName(profile.full_name)}</span>
        </Link>
      ) : (
        <Link href="/login" className="pill" title="دخول">
          <UserIcon size={18} />
          <span className="pill-text">دخول</span>
        </Link>
      )}
      {children}
    </div>
  );
}

export function Logo({ height = 52 }: { height?: number }) {
  return (
    <Link href="/" aria-label="الصفحة الرئيسية" style={{ display: 'block' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/logo.svg" alt="محمد صلاح" style={{ height, width: 'auto', display: 'block' }} />
    </Link>
  );
}

/** Header of the inner pages, same markup as the original grades page. */
export function SiteHeader({ back }: { back?: { href: string; label?: string } }) {
  return (
    <header className="gp-head">
      <Logo />
      <HeaderActions>{back && <BackLink href={back.href} label={back.label} />}</HeaderActions>
    </header>
  );
}

export function Grain({ id = 'gpGrain' }: { id?: string }) {
  return (
    <svg aria-hidden="true" className="grain">
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/** Full-page wrapper with the gradient, grain, header and footer of the original grades page. */
export function SitePage({
  children,
  back,
  mainClassName = 'gp-main',
}: {
  children: React.ReactNode;
  back?: { href: string; label?: string };
  mainClassName?: string;
}) {
  return (
    <div className="gp-root" dir="rtl">
      <Grain />
      <SiteHeader back={back} />
      <main className={mainClassName}>{children}</main>
      <footer className="gp-foot">We Don’t Study Alone.</footer>
    </div>
  );
}
