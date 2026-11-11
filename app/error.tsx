'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { RefreshIcon } from '@/components/ui/icons';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="gp-root gp-center" dir="rtl">
      <div className="card empty a-fadeup" style={{ maxWidth: 520 }}>
        <div className="e-ic">
          <RefreshIcon size={30} />
        </div>
        <h3>حصلت مشكلة</h3>
        <p>حاجة وقفت واحنا بنحمّل الصفحة. جرّب تاني، ولو المشكلة فضلت ارجع بعد شوية.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-gold" onClick={reset}>
            جرّب تاني
          </button>
          <Link href="/" className="btn btn-ghost">
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
