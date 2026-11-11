import type { Metadata } from 'next';
import { TipDeck } from '@/components/hub/TipDeck';
import { SitePage } from '@/components/site/SiteHeader';
import { BulbIcon } from '@/components/ui/icons';
import { getSession } from '@/lib/data';
import { loadTips } from '@/lib/hub';
import { sectionBack } from '@/lib/sections';

export const metadata: Metadata = { title: 'نصايح' };

export default async function TipsPage() {
  const { profile } = await getSession();
  const tips = await loadTips(profile);

  return (
    <SitePage back={sectionBack(profile, '/admin/tips')}>
      <p className="hello">من التيم ليك</p>
      <h1 className="gp-title">نصايح</h1>
      <p className="gp-sub">نصيحة صغيرة ممكن تفرق معاك في المذاكرة.</p>
      {tips.length ? (
        <TipDeck tips={tips} start={Math.floor(Math.random() * tips.length)} />
      ) : (
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
          <div className="e-ic">
            <BulbIcon size={30} />
          </div>
          <h3>لسه مفيش نصايح</h3>
          <p>التيم هينزّل نصايح هنا قريب.</p>
        </div>
      )}
    </SitePage>
  );
}
