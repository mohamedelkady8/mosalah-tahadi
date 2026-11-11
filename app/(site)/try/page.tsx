import type { Metadata } from 'next';
import { pageMeta } from '@/lib/site';
import Link from 'next/link';
import { GameCards } from '@/components/games/GameCards';
import { SitePage } from '@/components/site/SiteHeader';
import { getSession } from '@/lib/data';
import { SAMPLE_GAMES } from '@/lib/games/samples';

export const metadata: Metadata = pageMeta({
  title: 'جرّب ألعاب العربي من غير حساب',
  description: 'جرّب ألعاب لغة عربية لثانوي ببلاش ومن غير تسجيل: اختيار من متعدد، صح ولا غلط، وصّل، كروت الذاكرة، رتّب، كمّل الفراغ، صنّف، دوّر على الكلمة، وركّبها.',
  path: '/try',
});

export default async function TryPage() {
  const { profile } = await getSession();
  return (
    <SitePage back={{ href: '/grades' }}>
      <p className="hello">من غير حساب، ومن غير ما النتيجة تتحفظ</p>
      <h1 className="gp-title">جرّب الألعاب</h1>
      <p className="gp-sub">لعبة من كل نوع عشان تاخد فكرة. ولما تعمل حساب، هتلاقي ألعاب مرحلتك ونقطك هتتحسب.</p>
      {!profile && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 22 }}>
          <Link href="/signup" className="btn btn-gold btn-lg">
            اعمل حساب
          </Link>
          <Link href="/login" className="btn btn-ghost btn-lg">
            عندي حساب
          </Link>
        </div>
      )}
      <GameCards games={SAMPLE_GAMES.map((g) => ({ ...g, description: g.description ?? '' }))} hrefPrefix="/try/" />
    </SitePage>
  );
}
