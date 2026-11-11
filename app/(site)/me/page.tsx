import type { Metadata } from 'next';
import { PRIVATE_META } from '@/lib/site';
import Link from 'next/link';
import { ProfileForm, PasswordForm } from '@/components/me/ProfileForms';
import { SitePage } from '@/components/site/SiteHeader';
import { BoltIcon, FlameIcon, GameTypeIcon, GamepadIcon, LogoutIcon, StarIcon, TrophyIcon } from '@/components/ui/icons';
import { displayContact } from '@/lib/auth/identifier';
import { getCatalog, gradeName, requireSession, trackName } from '@/lib/data';
import { firstName, num, pct, timeAgo } from '@/lib/format';
import { getDef } from '@/lib/games/registry';
import type { GameType } from '@/lib/games/types';
import { kindOf, studentHref, type GameKind } from '@/lib/kinds';
import { computeBadges, computeStreak, type Badge } from '@/lib/student';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'صفحتي', ...PRIVATE_META };

const BADGE_ICONS: Record<Badge['icon'], React.ReactNode> = {
  flame: <FlameIcon size={26} />,
  star: <StarIcon size={26} filled />,
  trophy: <TrophyIcon size={26} />,
  gamepad: <GamepadIcon size={26} />,
  bolt: <BoltIcon size={26} />,
};

interface AttemptRow {
  id: string;
  game_id: string;
  score: number;
  max_score: number;
  created_at: string;
  games: { title: string; slug: string; type: GameType; status: string; kind: GameKind } | null;
}

export default async function MePage() {
  const { userId, profile } = await requireSession('/me');
  const supabase = await createClient();
  const [catalog, { data: all }] = await Promise.all([
    getCatalog(),
    supabase
      .from('attempts')
      .select('id, game_id, score, max_score, created_at, games(title, slug, type, status, kind)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);
  const attempts = (all ?? []) as unknown as AttemptRow[];
  const streak = computeStreak(attempts.map((a) => a.created_at));
  const bestByGame = new Map<string, AttemptRow>();
  for (const a of attempts) {
    const cur = bestByGame.get(a.game_id);
    if (!cur || a.score > cur.score) bestByGame.set(a.game_id, a);
  }
  const perfect = [...bestByGame.values()].filter((a) => a.max_score > 0 && a.score >= a.max_score).length;
  const typesPlayed = new Set(attempts.map((a) => a.games?.type).filter(Boolean)).size;
  const badges = computeBadges({ streak, points: profile.points, perfect, gamesPlayed: bestByGame.size, typesPlayed, attempts: attempts.length });
  const earned = badges.filter((b) => b.earned).length;
  const grade = catalog.grades.find((g) => g.id === profile.grade_id);
  const showTrack = (grade?.trackIds.length ?? 0) > 1 && profile.track_id;

  return (
    <SitePage back={profile.role === 'admin' ? { href: '/admin', label: 'لوحة التحكم' } : { href: '/wheel', label: 'العجلة' }}>
      <p className="hello">{profile.role === 'admin' ? 'حساب أدمن' : [gradeName(catalog, profile.grade_id), showTrack ? trackName(catalog, profile.track_id) : ''].filter(Boolean).join(' · ')}</p>
      <h1 className="gp-title">{firstName(profile.full_name)}</h1>
      <p className="gp-sub">{streak.playedToday ? 'لعبت النهارده، برافو عليك! كمّل كده.' : streak.current ? 'لسه ملعبتش النهارده، العب لعبة عشان متقطعش السلسلة.' : 'العب كل يوم عشان تبني سلسلة أيام وتاخد شارات.'}</p>

      <div className="st-strip a-fadeup" style={{ animationDelay: '.18s' }}>
        <div className="st-stat">
          <b>{num(profile.points)}</b>
          <span>نقطة</span>
        </div>
        <div className="st-stat">
          <b>{num(bestByGame.size)}</b>
          <span>لعبة لعبتها</span>
        </div>
        <div className="st-stat">
          <b>{num(attempts.length)}</b>
          <span>محاولة</span>
        </div>
        <div className={`st-stat${streak.current ? ' hot' : ''}`}>
          <b>
            <FlameIcon size={26} /> {num(streak.current)}
          </b>
          <span>{streak.current === 1 ? 'يوم ورا بعض' : 'أيام ورا بعض'}</span>
        </div>
      </div>

      <div className="me-grid">
        <div className="stack" style={{ gap: 18 }}>
          <section className="card a-fadeup" style={{ animationDelay: '.22s' }} aria-labelledby="badges-title">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 id="badges-title" style={{ fontSize: 22 }}>
                الشارات
              </h2>
              <span className="badge badge-gold">
                {num(earned)} من {num(badges.length)}
              </span>
            </div>
            <div className="me-badges">
              {badges.map((b) => (
                <div key={b.key} className={`me-badge${b.earned ? '' : ' off'}`} title={b.desc}>
                  <span className="ic">{BADGE_ICONS[b.icon]}</span>
                  <b>{b.title}</b>
                  <span>{b.earned ? b.desc : (b.progress ?? b.desc)}</span>
                </div>
              ))}
            </div>
            {streak.longest > 1 && <p className="muted" style={{ marginTop: 12 }}>أطول سلسلة ليك: {num(streak.longest)} أيام ورا بعض.</p>}
          </section>

          <section className="card a-fadeup" style={{ animationDelay: '.28s' }} aria-labelledby="hist-title">
            <h2 id="hist-title" style={{ fontSize: 22, marginBottom: 12 }}>
              آخر اللي لعبته
            </h2>
            {attempts.length ? (
              <ul className="st-list">
                {attempts.slice(0, 30).map((a) => {
                  const g = a.games;
                  const playable = g && g.status === 'published';
                  return (
                    <li key={a.id}>
                      <span className="ic" aria-hidden="true">
                        {g ? <GameTypeIcon type={g.type} size={20} /> : <GamepadIcon size={20} />}
                      </span>
                      <div className="grow">
                        {playable ? (
                          <Link href={studentHref(kindOf(g.kind), g.slug)}>
                            <b>{g.title}</b>
                          </Link>
                        ) : (
                          <b>{g?.title ?? 'لعبة اتشالت'}</b>
                        )}
                        <small>
                          {g ? (g.kind === 'quick' ? 'ع السريع' : g.kind === 'contest' ? 'مسابقة' : getDef(g.type).label) : ''} · {timeAgo(a.created_at)}
                        </small>
                      </div>
                      <span className={`badge ${a.max_score && a.score >= a.max_score ? 'badge-gold' : ''}`}>{pct(a.score, a.max_score)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty" style={{ padding: 16 }}>
                <p>لسه ملعبتش ولا لعبة.</p>
                <Link href="/wheel" className="btn btn-gold">
                  لف العجلة
                </Link>
              </div>
            )}
          </section>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <section id="profile" className="card a-fadeup" style={{ animationDelay: '.25s' }} aria-labelledby="profile-title">
            <h2 id="profile-title" style={{ fontSize: 22, marginBottom: 4 }}>
              بياناتك
            </h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              بتدخل بـ <span dir="ltr">{displayContact(profile.email, profile.phone)}</span>
            </p>
            <ProfileForm
              catalog={catalog}
              initial={{ full_name: profile.full_name, phone: profile.phone ?? '', grade_id: profile.grade_id ?? '', track_id: profile.track_id ?? '' }}
            />
          </section>
          <section className="card a-fadeup" style={{ animationDelay: '.3s' }} aria-labelledby="pass-title">
            <h2 id="pass-title" style={{ fontSize: 22, marginBottom: 12 }}>
              كلمة السر
            </h2>
            <PasswordForm />
          </section>
          <form action="/auth/signout" method="post" className="a-fadeup" style={{ animationDelay: '.32s' }}>
            <button type="submit" className="btn btn-cream btn-block">
              <LogoutIcon size={18} /> خروج
            </button>
          </form>
        </div>
      </div>
    </SitePage>
  );
}
