import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/site/SiteHeader';
import { TrophyIcon } from '@/components/ui/icons';
import { getCatalog, getSession } from '@/lib/data';
import { cairoDayKey, cairoStartOfDay, formatDate, num } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'لوحة الشرف' };

type Search = Promise<{ grade?: string; track?: string; period?: string }>;

interface Row {
  user_id: string;
  full_name: string;
  points: number;
  games_played: number;
  rank: number;
}

/** The Egyptian week starts on Saturday. */
function weekStart(now = new Date()): Date {
  const [y, m, d] = cairoDayKey(now).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return cairoStartOfDay(now, (dow + 1) % 7);
}

const shortName = (full: string) => full.trim().split(/\s+/).slice(0, 2).join(' ');

export default async function LeaderboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const [catalog, { profile }] = await Promise.all([getCatalog(), getSession()]);

  if (!profile) {
    return (
      <SitePage back={{ href: '/grades', label: 'المراحل' }}>
        <p className="hello">مين الأول في مرحلتك؟</p>
        <h1 className="gp-title">لوحة الشرف</h1>
        <div className="card empty st-panel a-fadeup" style={{ animationDelay: '.18s', maxWidth: 560 }}>
          <div className="e-ic">
            <TrophyIcon size={30} />
          </div>
          <h3>ادخل وشوف ترتيبك</h3>
          <p>لوحة الشرف بتجمع نقط طلاب كل مرحلة. سجّل دخولك عشان تشوفها وتنافس زمايلك.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/signup" className="btn btn-gold btn-lg">
              اعمل حساب
            </Link>
            <Link href="/login?next=/leaderboard" className="btn btn-ghost btn-lg">
              دخول
            </Link>
          </div>
        </div>
      </SitePage>
    );
  }

  const grades = catalog.grades.filter((g) => g.active || g.id === profile.grade_id);
  const grade = grades.find((g) => g.slug === sp.grade) ?? grades.find((g) => g.id === profile.grade_id) ?? grades[0];
  const tracks = grade ? grade.trackIds.map((id) => catalog.tracks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t)) : [];
  const track = tracks.length > 1 ? (tracks.find((t) => t.slug === sp.track) ?? null) : null;
  const period = sp.period === 'all' ? 'all' : 'week';
  const since = period === 'week' ? weekStart() : null;

  const myGradeSlug = catalog.grades.find((g) => g.id === profile.grade_id)?.slug;
  const href = (next: { grade?: string; track?: string | null; period?: 'week' | 'all' }) => {
    const q = new URLSearchParams();
    const g = next.grade ?? grade?.slug;
    if (g && g !== myGradeSlug) q.set('grade', g);
    const sameGrade = g === grade?.slug;
    const t = next.track !== undefined ? next.track : sameGrade ? track?.slug : null;
    if (t) q.set('track', t);
    if ((next.period ?? period) === 'all') q.set('period', 'all');
    const s = q.toString();
    return s ? `/leaderboard?${s}` : '/leaderboard';
  };

  let rows: Row[] = [];
  if (grade) {
    const supabase = await createClient();
    const { data } = await supabase.rpc('leaderboard_by_grade', {
      p_grade_id: grade.id,
      p_track_id: track?.id ?? null,
      p_since: since ? since.toISOString() : null,
      p_limit: 50,
    });
    rows = ((data ?? []) as Row[]).map((r) => ({ ...r, points: Number(r.points), games_played: Number(r.games_played), rank: Number(r.rank) }));
  }
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const me = rows.find((r) => r.user_id === profile.id);
  const order = [podium[1], podium[0], podium[2]];

  return (
    <SitePage back={{ href: '/wheel', label: 'العجلة' }}>
      <p className="hello">{me ? `إنت رقم ${num(me.rank)} ${period === 'week' ? 'الأسبوع ده' : 'من الأول'}` : 'نافس زمايلك واطلع الأول'}</p>
      <h1 className="gp-title">لوحة الشرف</h1>
      <p className="gp-sub">
        {period === 'week' ? `نقط الأسبوع ده، من السبت ${formatDate(since!)}.` : 'مجموع أحسن نتيجة في كل لعبة من أول ما بدأت.'} الترتيب بيتحدّث أول ما حد يخلّص لعبة.
      </p>

      <section className="lb-board a-fadeup" style={{ animationDelay: '.2s' }} aria-label="الترتيب">
        <div className="lb-controls">
          <div className="tabs tabs-light" role="group" aria-label="المدة">
            <Link href={href({ period: 'week' })} className={period === 'week' ? 'on' : ''} aria-current={period === 'week' ? 'page' : undefined}>
              الأسبوع ده
            </Link>
            <Link href={href({ period: 'all' })} className={period === 'all' ? 'on' : ''} aria-current={period === 'all' ? 'page' : undefined}>
              من الأول
            </Link>
          </div>
          {grades.length > 1 && (
            <div className="chips chips-dark" role="group" aria-label="المرحلة">
              {grades.map((g) => (
                <Link key={g.id} href={href({ grade: g.slug })} className={`chip${g.id === grade?.id ? ' on' : ''}`} aria-current={g.id === grade?.id ? 'page' : undefined}>
                  {g.name}
                </Link>
              ))}
            </div>
          )}
          {tracks.length > 1 && (
            <div className="chips chips-dark" role="group" aria-label="الشعبة">
              <Link href={href({ track: null })} className={`chip${!track ? ' on' : ''}`}>
                كل الشعب
              </Link>
              {tracks.map((t) => (
                <Link key={t.id} href={href({ track: t.slug })} className={`chip${track?.id === t.id ? ' on' : ''}`}>
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="lb-empty">
            <TrophyIcon size={40} />
            <h3>{period === 'week' ? 'لسه محدش لعب الأسبوع ده' : 'لسه محدش لعب'}</h3>
            <p>العب أول لعبة وخليك أول اسم في لوحة الشرف.</p>
            <Link href="/games" className="btn btn-gold">
              يلا نلعب
            </Link>
          </div>
        ) : (
          <>
            <ol className="lb-podium" aria-label="المراكز الأولى">
              {order.map((r, i) =>
                r ? (
                  <li key={r.user_id} className={`lb-step r${Math.min(r.rank, 3)}${r.user_id === profile.id ? ' me' : ''}`} style={{ animationDelay: `${0.25 + i * 0.06}s` }}>
                    <span className="av" aria-hidden="true">
                      {r.full_name.trim().slice(0, 1)}
                    </span>
                    <span className="name">{r.user_id === profile.id ? 'إنت' : shortName(r.full_name)}</span>
                    <span className="block">
                      <b>{num(r.rank)}</b>
                      <small>{num(r.points)} نقطة</small>
                    </span>
                  </li>
                ) : (
                  <li key={`empty-${i}`} className="lb-step ghost" aria-hidden="true" />
                ),
              )}
            </ol>
            {rest.length > 0 && (
              <ol className="lb-list">
                {rest.flatMap((r, i) => {
                  const mine = r.user_id === profile.id;
                  const row = (
                    <li key={r.user_id} className={`lb-row${mine ? ' me' : ''}`}>
                      <span className="rk">{num(r.rank)}</span>
                      <span className="nm">
                        {mine ? `إنت (${shortName(r.full_name)})` : shortName(r.full_name)}
                        <small>{num(r.games_played)} لعبة</small>
                      </span>
                      <span className="pts">{num(r.points)} نقطة</span>
                    </li>
                  );
                  const gap = mine && i > 0 && r.rank > rest[i - 1].rank + 1;
                  return gap ? [<li key="gap" className="lb-gap" aria-hidden="true">…</li>, row] : [row];
                })}
              </ol>
            )}
          </>
        )}
      </section>
    </SitePage>
  );
}
