'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { num, timeLeftText } from '@/lib/format';

/**
 * Live time left until `to`. With `refresh`, reloads the page's data when it reaches zero (and a few times after,
 * in case this device's clock runs ahead of the server), so a contest opens or closes by itself.
 */
export function Countdown({ to, inline = false, prefix = 'فاضل', refresh = true }: { to: string; inline?: boolean; prefix?: string; refresh?: boolean }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(to).getTime();
    let nextRefresh = end + 800;
    let tries = 0;
    const tick = () => {
      const now = Date.now();
      setLeft(Math.max(0, end - now));
      if (refresh && now >= nextRefresh && tries < 12) {
        tries++;
        nextRefresh = now + 5000;
        router.refresh();
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [to, refresh, router]);

  if (inline) {
    return <span className="cd-inline">{left === null ? '\u00a0' : left > 0 ? `${prefix} ${timeLeftText(left)}` : 'دلوقتي'}</span>;
  }

  const s = left === null ? null : Math.floor(left / 1000);
  const units = [
    { v: s === null ? null : Math.floor(s / 86400), label: 'يوم' },
    { v: s === null ? null : Math.floor((s % 86400) / 3600), label: 'ساعة' },
    { v: s === null ? null : Math.floor((s % 3600) / 60), label: 'دقيقة' },
    { v: s === null ? null : s % 60, label: 'ثانية' },
  ].filter((u, i) => i > 0 || (u.v ?? 0) > 0);

  return (
    <div className="cd" role="timer" aria-label={left === null ? undefined : `${prefix} ${timeLeftText(left)}`}>
      {units.map((u) => (
        <span key={u.label} className="cd-unit">
          <b>{u.v === null ? '–' : num(u.v)}</b>
          <small>{u.label}</small>
        </span>
      ))}
    </div>
  );
}
