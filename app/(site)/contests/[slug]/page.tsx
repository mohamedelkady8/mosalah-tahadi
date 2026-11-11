import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import type { PlayableGame } from '@/components/games/types';
import { Challenge } from '@/components/hub/Challenge';
import { ContestRanking } from '@/components/hub/ContestRanking';
import { Countdown } from '@/components/hub/Countdown';
import { SitePage } from '@/components/site/SiteHeader';
import { CalendarIcon, CheckIcon, ClockIcon, EditIcon, FacebookIcon, GiftIcon, TrophyIcon } from '@/components/ui/icons';
import { getCatalog, gradeName, requireSession } from '@/lib/data';
import { durationText, formatWhen, num } from '@/lib/format';
import { itemsLabel } from '@/lib/games/registry';
import { isGameType } from '@/lib/games/types';
import { contestRanking, firstAttempts, type ContestCard } from '@/lib/hub';
import { contestPhase, kindOf, studentHref, type ContestPhase } from '@/lib/kinds';
import { FACEBOOK_GROUP } from '@/lib/sections';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'مسابقة' };

type Params = Promise<{ slug: string }>;
type Search = Promise<{ done?: string }>;
type ContestGame = PlayableGame & { status: string; kind: string; starts_at: string | null; ends_at: string | null; prize: string | null };

const COLUMNS = 'id, slug, title, description, type, content, settings, item_count, cover_url, topic, difficulty, status, kind, starts_at, ends_at, prize';

function Head({ c, phase }: { c: Pick<ContestCard, 'title' | 'description' | 'prize' | 'type' | 'item_count' | 'starts_at' | 'ends_at'>; phase: ContestPhase }) {
  return (
    <>
      <p className="hello">{phase === 'live' ? 'مسابقة شغالة دلوقتي' : phase === 'upcoming' ? 'مسابقة جاية' : 'مسابقة خلصت'}</p>
      <h1 className="gp-title">{c.title}</h1>
      {c.description && <p className="gp-sub">{c.description}</p>}
      <div className="ct-facts">
        {c.prize && (
          <span className="ct-fact gold">
            <GiftIcon size={16} /> الجايزة: {c.prize}
          </span>
        )}
        <span className="ct-fact">
          <CalendarIcon size={16} />{' '}
          {phase === 'upcoming' ? `بتبدأ ${formatWhen(c.starts_at)}` : phase === 'live' ? `بتقفل ${formatWhen(c.ends_at)}` : `خلصت ${formatWhen(c.ends_at)}`}
        </span>
        {isGameType(c.type) && <span className="ct-fact">{itemsLabel(c.type, c.item_count)}</span>}
      </div>
    </>
  );
}

export default async function ContestPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ slug }, { done }] = await Promise.all([params, searchParams]);
  const { profile } = await requireSession(`/contests/${slug}`);
  const isAdmin = profile.role === 'admin';
  const back = isAdmin ? { href: '/admin/contests', label: 'لوحة التحكم' } : { href: '/contests', label: 'المسابقات' };
  const [catalog, supabase] = await Promise.all([getCatalog(), createClient()]);

  const valid = /^[a-z0-9-]{1,80}$/.test(slug);
  const { data: row } = valid ? await supabase.from('games').select(COLUMNS).eq('slug', slug).maybeSingle() : { data: null };
  if (row && kindOf(row.kind) !== 'contest') redirect(studentHref(kindOf(row.kind), slug));
  const game = row && (row.status === 'published' || isAdmin) && row.starts_at && row.ends_at ? (row as ContestGame) : null;

  let soon: ContestCard | null = null;
  if (!game && valid) {
    const { data } = await supabase.rpc('upcoming_contests');
    soon = ((data ?? []) as ContestCard[]).find((c) => c.slug === slug) ?? null;
  }

  if (!game && !soon) {
    return (
      <SitePage back={back}>
        <h1 className="gp-title">مسابقات</h1>
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
          <div className="e-ic">
            <TrophyIcon size={30} />
          </div>
          <h3>المسابقة دي مش متاحة</h3>
          <p>{row && isAdmin ? 'حدد ميعاد البداية والنهاية من لوحة التحكم الأول.' : 'ممكن تكون اتشالت أو مش معمولة لمرحلتك.'}</p>
          <Link href="/contests" className="btn btn-gold">
            شوف المسابقات
          </Link>
        </div>
      </SitePage>
    );
  }

  const info = (game ?? soon)! as ContestCard;
  const phase = contestPhase(info.starts_at, info.ends_at);

  if (!game || (phase === 'upcoming' && !isAdmin)) {
    return (
      <SitePage back={back}>
        <Head c={info} phase="upcoming" />
        <div className="card ct-wait a-fadeup">
          <span className="ct-wait-k">المسابقة هتبدأ بعد</span>
          <Countdown to={info.starts_at} />
          <p className="ct-wait-when">{formatWhen(info.starts_at)}</p>
          <p className="muted">الأسئلة هتظهر هنا أول ما المسابقة تبدأ، والصفحة هتفتح لوحدها لو سايبها مفتوحة.</p>
          <a href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer" className="btn btn-fb">
            <FacebookIcon size={20} /> تابع الجروب عشان متفوّتهاش
          </a>
        </div>
      </SitePage>
    );
  }

  const [mine, ranking] = await Promise.all([firstAttempts(supabase, profile.id, [game.id]), contestRanking(supabase, game.id, 10)]);
  const my = mine.get(game.id);
  const myRank = ranking.find((r) => r.user_id === profile.id);
  const grade = gradeName(catalog, profile.grade_id);
  const doneHref = `/contests/${slug}?done=1`;

  if (!isAdmin && phase === 'live' && !my) {
    return (
      <SitePage back={back}>
        <div className="qz-page">
          {game.type === 'mcq' ? (
            <Challenge
              game={game}
              variant="contest"
              heading={game.title}
              audience={grade ? `طلاب ${grade}` : 'الطلاب'}
              dateLabel={`بتقفل ${formatWhen(game.ends_at!)}`}
              prize={game.prize}
              doneHref={doneHref}
              extra={
                <p className="qz-ends">
                  <ClockIcon size={16} /> <Countdown to={game.ends_at!} inline prefix="المسابقة بتقفل بعد" />
                </p>
              }
            />
          ) : (
            <>
              <p className="ct-banner">
                <TrophyIcon size={18} /> مسابقة: محاولة واحدة بس، والترتيب بالدرجة وبعدين السرعة ·{' '}
                <Countdown to={game.ends_at!} inline prefix="بتقفل بعد" refresh={false} />
              </p>
              <GameShell game={game} mode="play" stats={{ attemptsUsed: 0, best: null }} backHref={doneHref} backLabel="شوف ترتيبك" />
            </>
          )}
        </div>
      </SitePage>
    );
  }

  return (
    <SitePage back={back}>
      <Head c={info} phase={phase} />
      {isAdmin && (
        <div className="row ct-admin">
          <Link href={`/admin/contests/${game.id}`} className="btn btn-sm btn-ink">
            <EditIcon size={16} /> عدّل المسابقة
          </Link>
          <span className="muted">إنت أدمن: بتشوف الأسئلة قبل ميعادها، وتجربتك مش بتتحسب.</span>
        </div>
      )}
      {my && (
        <div className="card ct-mine a-fadeup">
          {done && <div className="form-ok">إجابتك اتسجلت في المسابقة.</div>}
          <span className="ct-mine-k">
            <CheckIcon size={18} /> إنت شاركت
          </span>
          <div className="ct-mine-row">
            <span>
              <b>
                {num(my.score)}/{num(my.max_score)}
              </b>
              <small>درجتك</small>
            </span>
            <span>
              <b>{myRank ? num(myRank.rank) : '—'}</b>
              <small>ترتيبك</small>
            </span>
            <span>
              <b>{durationText(my.duration_ms)}</b>
              <small>وقتك</small>
            </span>
          </div>
          {phase === 'live' ? (
            <p className="muted">
              المسابقة لسه شغالة والترتيب ممكن يتغيّر. النتيجة النهائية <Countdown to={game.ends_at!} inline prefix="بعد" />.
            </p>
          ) : (
            <p className="muted">المسابقة خلصت، وده ترتيبك النهائي.</p>
          )}
        </div>
      )}
      {!my && !isAdmin && phase === 'ended' && (
        <div className="card ct-mine a-fadeup">
          <span className="ct-mine-k">المسابقة دي خلصت</span>
          <p className="muted">ملحقتش تشارك فيها. تابع الجروب عشان تعرف المسابقة الجاية أول ما تتعلن.</p>
        </div>
      )}

      <ContestRanking rows={ranking} meId={profile.id} live={phase !== 'ended'} />

      {isAdmin && (
        <section className="ct-preview" aria-label="معاينة الأسئلة">
          <h2 className="ct-h">جرّب الأسئلة</h2>
          {game.type === 'mcq' ? (
            <Challenge game={game} variant="contest" preview heading={game.title} audience="الطلاب" prize={game.prize} />
          ) : (
            <GameShell game={game} mode="preview" />
          )}
        </section>
      )}
    </SitePage>
  );
}
