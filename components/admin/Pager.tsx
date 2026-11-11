import Link from 'next/link';
import { ChevronEnd, ChevronStart } from '@/components/ui/icons';
import { num } from '@/lib/format';

export function Pager({
  page,
  total,
  pageSize,
  path,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  path: string;
  params: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  return (
    <nav className="ad-pager" aria-label="الصفحات">
      {page > 1 ? (
        <Link href={href(page - 1)} className="icon-btn" aria-label="الصفحة اللي قبل">
          <ChevronStart size={18} />
        </Link>
      ) : (
        <span className="icon-btn" aria-hidden="true" style={{ opacity: 0.35 }}>
          <ChevronStart size={18} />
        </span>
      )}
      <span className="muted" style={{ fontWeight: 700 }}>
        صفحة {num(page)} من {num(pages)}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="icon-btn" aria-label="الصفحة اللي بعد">
          <ChevronEnd size={18} />
        </Link>
      ) : (
        <span className="icon-btn" aria-hidden="true" style={{ opacity: 0.35 }}>
          <ChevronEnd size={18} />
        </span>
      )}
    </nav>
  );
}
