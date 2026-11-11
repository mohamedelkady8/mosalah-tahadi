import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GameBrowser } from '@/components/games/GameBrowser';
import { SitePage } from '@/components/site/SiteHeader';
import { Steps } from '@/components/site/Steps';
import { GamepadIcon, LockIcon, StarIcon, TrophyIcon, WheelIcon } from '@/components/ui/icons';
import { getCatalog, getSession, gradeName, trackName } from '@/lib/data';
import { firstName, num } from '@/lib/format';
import { bestScores, gamesForGrade } from '@/lib/student';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const grade = (await getCatalog()).grades.find((g) => g.slug === slug);
  return { title: grade ? `ألعاب ${grade.name}` : 'المرحلة' };
}

export default async function GradeGamesPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [catalog, { profile }] = await Promise.all([getCatalog(), getSession()]);
  const grade = catalog.grades.find((g) => g.slug === slug);
  if (!grade) notFound();
  const showTrack = grade.trackIds.length > 1;

  if (!profile) {
    return (
      <SitePage back={{ href: '/grades', label: 'المراحل' }}>
        <p className="hello">{grade.subtitle}</p>
        <h1 className="gp-title">{grade.name}</h1>
        <Steps current={2} />
        <div className="card empty st-panel a-fadeup" style={{ animationDelay: '.22s', maxWidth: 560 }}>
          <div className="e-ic">
            <WheelIcon size={30} />
          </div>
          <h3>اعمل حسابك وابدأ</h3>
          <p>
            سجّل في ثانية برقم موبايلك أو إيميلك، وهتلاقي عجلة بتختارلك كل يوم حاجة جديدة من التيم: ألعاب، «ع السريع»، مسابقات،
            نصايح، فيديوهات، وسؤال اليوم.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href={`/signup?grade=${grade.slug}`} className="btn btn-gold btn-lg">
              اعمل حساب
            </Link>
            <Link href={`/login?next=${encodeURIComponent(`/grades/${grade.slug}`)}`} className="btn btn-ghost btn-lg">
              عندي حساب
            </Link>
          </div>
          <Link href="/try" className="muted" style={{ fontWeight: 700 }}>
            أو جرّب الألعاب الأول من غير حساب
          </Link>
        </div>
      </SitePage>
    );
  }

  const isAdmin = profile.role === 'admin';
  const myGrade = catalog.grades.find((g) => g.id === profile.grade_id);
  if (!isAdmin && profile.grade_id !== grade.id) {
    return (
      <SitePage back={{ href: '/grades', label: 'المراحل' }}>
        <p className="hello">{grade.subtitle}</p>
        <h1 className="gp-title">{grade.name}</h1>
        <div className="card empty st-panel a-fadeup" style={{ animationDelay: '.15s', maxWidth: 560 }}>
          <div className="e-ic">
            <LockIcon size={30} />
          </div>
          <h3>دي مش مرحلتك</h3>
          <p>
            {myGrade
              ? `إنت مسجّل في ${myGrade.name}${myGrade.trackIds.length > 1 && profile.track_id ? ` (${trackName(catalog, profile.track_id)})` : ''}، وألعابك هناك.`
              : 'لسه مختارتش مرحلتك.'}{' '}
            لو المرحلة اتغيرت، تقدر تعدّلها من صفحتك.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            {myGrade && (
              <Link href={`/grades/${myGrade.slug}`} className="btn btn-gold">
                روح لألعاب {myGrade.name}
              </Link>
            )}
            <Link href="/me#profile" className="btn btn-ghost">
              غيّر مرحلتك
            </Link>
          </div>
        </div>
      </SitePage>
    );
  }

  const supabase = await createClient();
  const games = await gamesForGrade(supabase, grade.id, profile);
  const [best, rankRows] = await Promise.all([
    bestScores(
      supabase,
      profile.id,
      games.map((g) => g.id),
    ),
    isAdmin ? Promise.resolve({ data: null }) : supabase.rpc('leaderboard_by_grade', { p_grade_id: grade.id, p_limit: 1 }),
  ]);
  const myRank = (rankRows.data as { user_id: string; rank: number }[] | null)?.find((r) => r.user_id === profile.id)?.rank ?? null;
  const played = Object.keys(best).length;

  return (
    <SitePage back={isAdmin ? { href: '/grades', label: 'المراحل' } : { href: '/wheel', label: 'العجلة' }}>
      <p className="hello">{isAdmin ? 'إنت شايف الصفحة زي طلاب المرحلة دي' : `أهلًا يا ${firstName(profile.full_name)}`}</p>
      <h1 className="gp-title">{isAdmin ? grade.name : 'ألعاب'}</h1>
      <p className="gp-sub">
        {isAdmin ? grade.subtitle : `ألعاب ${grade.name}${showTrack && profile.track_id ? ` · ${trackName(catalog, profile.track_id)}` : ''}، اتعلم العربي وإنت بتلعب.`}
      </p>

      {!isAdmin && (
        <>
          <div className="st-bar a-fadeup" style={{ animationDelay: '.2s' }}>
            <div className="st-item">
              <b>
                <StarIcon size={18} filled /> {num(profile.points)}
              </b>
              <span>نقطة</span>
            </div>
            <div className="st-item">
              <b>
                <GamepadIcon size={18} /> {num(played)}
                <small>/{num(games.length)}</small>
              </b>
              <span>لعبة لعبتها</span>
            </div>
            <Link href="/leaderboard" className="st-item" title={`ترتيبك في ${gradeName(catalog, grade.id)}`}>
              <b>
                <TrophyIcon size={18} /> {myRank ? `#${num(myRank)}` : '—'}
              </b>
              <span>ترتيبك</span>
            </Link>
            <Link href="/wheel" className="btn btn-gold btn-sm">
              <WheelIcon size={16} /> لف العجلة
            </Link>
          </div>
        </>
      )}

      <GameBrowser games={games} best={best} />
    </SitePage>
  );
}
