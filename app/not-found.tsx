import Link from 'next/link';
import { SitePage } from '@/components/site/SiteHeader';
import { SearchIcon } from '@/components/ui/icons';

export default function NotFound() {
  return (
    <SitePage back={{ href: '/', label: 'الرئيسية' }}>
      <h1 className="gp-title">٤٠٤</h1>
      <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
        <div className="e-ic">
          <SearchIcon size={30} />
        </div>
        <h3>الصفحة دي مش موجودة</h3>
        <p>يمكن الرابط غلط أو الصفحة اتشالت. ارجع للرئيسية أو اختار مرحلتك وكمّل لعب.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/grades" className="btn btn-gold">
            اختار مرحلتك
          </Link>
          <Link href="/" className="btn btn-ghost">
            الرئيسية
          </Link>
        </div>
      </div>
    </SitePage>
  );
}
