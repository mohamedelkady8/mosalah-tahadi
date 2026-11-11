'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HomeIcon, LayersIcon, LogoutIcon, QuoteIcon, SectionIcon, UsersIcon, WheelIcon, type IconProps } from '@/components/ui/icons';
import { SECTION_KEYS, SECTIONS, type SectionKey } from '@/lib/sections';

const SECTION_ADMIN: Record<SectionKey, string> = {
  contests: '/admin/contests',
  games: '/admin/games',
  quick: '/admin/quick',
  tips: '/admin/tips',
  videos: '/admin/videos',
  daily: '/admin/daily',
};

const under = (base: string) => (p: string) => p === base || p.startsWith(`${base}/`);

const GROUPS: { title?: string; links: { href: string; label: string; icon: (p: IconProps) => React.ReactNode; match: (p: string) => boolean }[] }[] = [
  { links: [{ href: '/admin', label: 'الرئيسية', icon: HomeIcon, match: (p) => p === '/admin' }] },
  {
    title: 'أقسام العجلة',
    links: SECTION_KEYS.map((key) => ({
      href: SECTION_ADMIN[key],
      label: SECTIONS[key].label,
      icon: (p: IconProps) => <SectionIcon section={key} {...p} />,
      match: under(SECTION_ADMIN[key]),
    })),
  },
  {
    title: 'الموقع',
    links: [
      { href: '/admin/students', label: 'الطلاب', icon: UsersIcon, match: under('/admin/students') },
      { href: '/admin/grades', label: 'المراحل والشعب', icon: LayersIcon, match: under('/admin/grades') },
      { href: '/admin/quotes', label: 'جمل الصفحة الرئيسية', icon: QuoteIcon, match: under('/admin/quotes') },
    ],
  },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`ad-root${open ? ' nav-open' : ''}`} dir="rtl">
      <aside className="ad-side" id="ad-side" aria-label="قائمة لوحة التحكم">
        <Link href="/admin" className="ad-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.svg" alt="" />
          <span>لوحة التحكم</span>
        </Link>
        <nav className="ad-nav">
          {GROUPS.map((group, gi) => (
            <div key={gi} className="ad-nav-group">
              {group.title && <span className="ad-nav-title">{group.title}</span>}
              {group.links.map(({ href, label, icon: Icon, match }) => (
                <Link key={href} href={href} className={match(pathname) ? 'on' : undefined} aria-current={match(pathname) ? 'page' : undefined}>
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </div>
          ))}
          <div className="sep" />
          <Link href="/wheel">
            <WheelIcon size={20} />
            افتح الموقع
          </Link>
        </nav>
        <div className="ad-me">
          <span>
            أهلًا، <b>{name}</b>
          </span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-sm btn-ghost-light btn-block">
              <LogoutIcon size={18} />
              خروج
            </button>
          </form>
        </div>
      </aside>
      {open && <div className="ad-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="ad-main">
        <div className="ad-mbar">
          <button
            type="button"
            className="icon-btn ad-burger"
            aria-label="افتح القائمة"
            aria-expanded={open}
            aria-controls="ad-side"
            onClick={() => setOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
            </svg>
          </button>
          <Link href="/admin" className="ad-mbar-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo.svg" alt="" />
            لوحة التحكم
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminTop({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="ad-top">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
