'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CopyIcon, EditIcon, EyeIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteGame, duplicateGame, setGameStatus, type ActionResult } from '@/lib/actions/admin';

export function GameRowActions({ id, slug, title, status }: { id: string; slug: string; title: string; status: 'draft' | 'published' }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>, after?: (r: ActionResult & { ok: true }) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast(r.errors?.length ? `${r.error} ${r.errors[0]}` : r.error);
        return;
      }
      if (r.message) toast(r.message);
      if (after) after(r);
      else router.refresh();
    });

  return (
    <div className="t-actions">
      <button
        type="button"
        className={`btn btn-sm ${status === 'published' ? 'btn-ghost' : 'btn-wine'}`}
        disabled={pending}
        onClick={() => run(() => setGameStatus(id, status === 'published' ? 'draft' : 'published'))}
      >
        {status === 'published' ? 'إلغاء النشر' : 'انشر'}
      </button>
      <Link href={`/admin/games/${id}`} className="icon-btn" title="تعديل" aria-label={`تعديل ${title}`}>
        <EditIcon size={18} />
      </Link>
      {status === 'published' && (
        <Link href={`/play/${slug}`} className="icon-btn" title="افتحها زي الطالب" aria-label={`افتح ${title} زي الطالب`} target="_blank">
          <EyeIcon size={18} />
        </Link>
      )}
      <button
        type="button"
        className="icon-btn"
        title="اعمل نسخة"
        aria-label={`اعمل نسخة من ${title}`}
        disabled={pending}
        onClick={() => run(() => duplicateGame(id), (r) => router.push(`/admin/games/${r.id}`))}
      >
        <CopyIcon size={18} />
      </button>
      <button
        type="button"
        className="icon-btn danger"
        title="امسح"
        aria-label={`امسح ${title}`}
        disabled={pending}
        onClick={() => {
          if (confirm(`تمسح «${title}»؟ كل محاولات الطلاب فيها هتتمسح ونقطهم هتتحسب من جديد.`)) run(() => deleteGame(id));
        }}
      >
        <TrashIcon size={18} />
      </button>
    </div>
  );
}
