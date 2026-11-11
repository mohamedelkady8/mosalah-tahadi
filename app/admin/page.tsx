import Link from 'next/link';
import { AdminTop } from '@/components/admin/AdminShell';
import { BoltIcon, ChartIcon, GamepadIcon, PlusIcon, SectionIcon, UsersIcon, WheelIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { cairoDayKey, cairoStartOfDay, countLabel, num, pct, timeAgo } from '@/lib/format';
import { getDef } from '@/lib/games/registry';
import { adminHref, kindOf } from '@/lib/kinds';
import { SECTION_KEYS, SECTIONS, type SectionKey } from '@/lib/sections';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GameType } from '@/lib/games/types';

const SECTION_ADMIN: Record<SectionKey, { manage: string; add: string; addLabel: string }> = {
  contests: { manage: '/admin/contests', add: '/admin/contests/new', addLabel: 'مسابقة جديدة' },
  games: { manage: '/admin/games', add: '/admin/games/new', addLabel: 'لعبة جديدة' },
  quick: { manage: '/admin/quick', add: '/admin/quick/new', addLabel: 'تحدي جديد' },
  tips: { manage: '/admin/tips', add: '/admin/tips', addLabel: 'ضيف نصايح' },
  videos: { manage: '/admin/videos', add: '/admin/videos', addLabel: 'ضيف فيديو' },
  daily: { manage: '/admin/daily', add: '/admin/daily', addLabel: 'نزّل سؤال النهارده' },
};

export default async function AdminHome() {
  const { supabase, profile } = await requireAdmin();
  const catalog = await getCatalog();
  const today = cairoStartOfDay().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const nowIso = new Date().toISOString();
  const recentlyEnded = new Date(Date.now() - 3 * 86400000).toISOString();

  const head = { count: 'exact', head: true } as const;
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const contestsQuery = () => supabase.from('games').select('id', head).eq('kind', 'contest').eq('status', 'published');
  const wheelPromise = Promise.all([
    count(contestsQuery().gte('ends_at', recentlyEnded)),
    count(supabase.from('games').select('id', head).eq('kind', 'game').eq('status', 'published')),
    count(supabase.from('games').select('id', head).eq('kind', 'quick').eq('status', 'published')),
    count(supabase.from('tips').select('id', head).eq('active', true)),
    count(supabase.from('videos').select('id', head).eq('active', true)),
    count(supabase.from('daily_questions').select('id', head).eq('day', cairoDayKey())),
    count(contestsQuery().lte('starts_at', nowIso).gt('ends_at', nowIso)),
    count(contestsQuery().gt('starts_at', nowIso)),
  ]);
  const [students, published, drafts, attempts, attemptsToday, attemptsWeek, perGrade, top, recent, newcomers] = await Promise.all([
    count(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')),
    count(supabase.from('games').select('id', { count: 'exact', head: true }).eq('kind', 'game').eq('status', 'published')),
    count(supabase.from('games').select('id', { count: 'exact', head: true }).eq('kind', 'game').eq('status', 'draft')),
    count(supabase.from('attempts').select('id', { count: 'exact', head: true })),
    count(supabase.from('attempts').select('id', { count: 'exact', head: true }).gte('created_at', today)),
    count(supabase.from('attempts').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)),
    Promise.all(
      catalog.grades.map((g) =>
        count(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('grade_id', g.id)).then((n) => ({ grade: g, n })),
      ),
    ),
    supabase.from('game_stats').select('game_id, plays, players, avg_percent').gt('plays', 0).order('plays', { ascending: false }).limit(6),
    supabase
      .from('attempts')
      .select('id, score, max_score, created_at, profiles(full_name), games(title, type)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('profiles').select('id, full_name, grade_id, created_at').eq('role', 'student').order('created_at', { ascending: false }).limit(6),
  ]);

  const [contests, games, quick, tips, videos, daily, liveContests, upcomingContests] = await wheelPromise;
  const ready: Record<SectionKey, number> = { contests, games, quick, tips, videos, daily };
  const readyCount = SECTION_KEYS.filter((key) => ready[key] > 0).length;
  const readyText: Record<SectionKey, string> = {
    contests: liveContests
      ? `${countLabel(liveContests, { one: 'مسابقة شغالة', two: 'مسابقتين شغالين', few: 'مسابقات شغالة', many: 'مسابقة شغالة' })} دلوقتي`
      : upcomingContests
        ? countLabel(upcomingContests, { one: 'مسابقة جاية', two: 'مسابقتين جايين', few: 'مسابقات جاية', many: 'مسابقة جاية' })
        : 'مسابقة خلصت من قريب، والطلاب بيشوفوا الترتيب',
    games: countLabel(games, { one: 'لعبة منشورة', two: 'لعبتين منشورين', few: 'ألعاب منشورة', many: 'لعبة منشورة' }),
    quick: countLabel(quick, { one: 'تحدي منشور', two: 'تحديين منشورين', few: 'تحديات منشورة', many: 'تحدي منشور' }),
    tips: countLabel(tips, { one: 'نصيحة ظاهرة', two: 'نصيحتين ظاهرين', few: 'نصايح ظاهرة', many: 'نصيحة ظاهرة' }),
    videos: countLabel(videos, { one: 'فيديو ظاهر', two: 'فيديوهين ظاهرين', few: 'فيديوهات ظاهرة', many: 'فيديو ظاهر' }),
    daily: 'سؤال النهارده نازل',
  };
  const emptyText: Record<SectionKey, string> = {
    contests: 'مفيش مسابقة شغالة أو جاية',
    games: 'مفيش ألعاب منشورة',
    quick: 'مفيش تحديات منشورة',
    tips: 'مفيش نصايح',
    videos: 'مفيش فيديوهات',
    daily: 'لسه مفيش سؤال النهارده',
  };

  type TopGame = { id: string; title: string; type: GameType; kind: string };
  const topIds = (top.data ?? []).map((r) => r.game_id as string);
  const { data: topGames } = topIds.length ? await supabase.from('games').select('id, title, type, kind').in('id', topIds) : { data: [] as TopGame[] };
  const titleOf = new Map((topGames ?? []).map((g) => [g.id as string, g as TopGame]));
  const maxGrade = Math.max(1, ...perGrade.map((p) => p.n));
  const serviceKeyMissing = createAdminClient() === null;

  const stats = [
    { icon: <UsersIcon size={24} />, value: students, label: 'طالب مسجّل', hint: newcomers.data?.[0] ? `آخر واحد ${timeAgo(newcomers.data[0].created_at)}` : 'لسه مفيش طلاب' },
    { icon: <GamepadIcon size={24} />, value: published, label: 'لعبة منشورة', hint: drafts ? `و${num(drafts)} مسودة` : 'مفيش مسودات' },
    { icon: <BoltIcon size={24} />, value: attemptsToday, label: 'محاولة النهارده', hint: `${num(attemptsWeek)} في آخر ٧ أيام` },
    { icon: <ChartIcon size={24} />, value: attempts, label: 'محاولة من الأول', hint: 'كل اللعب اللي اتسجّل' },
  ];

  return (
    <>
      <AdminTop title={`أهلًا يا ${profile.full_name.split(' ')[0]}`} sub="ده ملخص اللي بيحصل على الموقع.">
        <Link href="/admin/games/new" className="btn btn-gold">
          <PlusIcon size={20} />
          لعبة جديدة
        </Link>
      </AdminTop>

      {serviceKeyMissing && (
        <div className="form-error" role="alert">
          نتايج الطلاب مش بتتسجل دلوقتي لأن SUPABASE_SERVICE_ROLE_KEY مش موجود في إعدادات السيرفر. ضيفه في .env.local أو في إعدادات الاستضافة.
        </div>
      )}

      <section className="ad-stats" aria-label="أرقام سريعة">
        {stats.map((s) => (
          <div key={s.label} className="ad-stat">
            <div className="ic">{s.icon}</div>
            <b>{num(s.value)}</b>
            <span>{s.label}</span>
            <small>{s.hint}</small>
          </div>
        ))}
      </section>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>
            <WheelIcon size={20} style={{ verticalAlign: '-4px', color: 'var(--wine)' }} /> العجلة النهارده
          </h2>
          <span className={`badge ${readyCount === SECTION_KEYS.length ? 'badge-ok' : 'badge-gold'}`}>
            {num(readyCount)} من {num(SECTION_KEYS.length)} أقسام جاهزة
          </span>
        </div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
          بعد ما الطالب يسجّل، العجلة بتختارله قسم من الأقسام اللي فيها حاجة لمرحلته. القسم الفاضي مش بيظهر في العجلة لحد ما تضيف فيه.
        </p>
        <div className="ad-wheel">
          {SECTION_KEYS.map((key) => {
            const n = ready[key];
            const links = SECTION_ADMIN[key];
            return (
              <div key={key} className={`ad-wheel-sec${n ? ' ok' : ''}`}>
                <span className="ic">
                  <SectionIcon section={key} size={22} />
                </span>
                <div className="grow">
                  <b>{SECTIONS[key].label}</b>
                  <small>{n ? readyText[key] : emptyText[key]}</small>
                </div>
                {n ? (
                  <Link href={links.manage} className="btn btn-sm btn-ghost">
                    إدارة
                  </Link>
                ) : (
                  <Link href={links.add} className="btn btn-sm btn-gold">
                    <PlusIcon size={16} /> {links.addLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="ad-grid-2">
        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>الطلاب في كل مرحلة</h2>
            <Link href="/admin/students" className="btn btn-sm btn-ghost">
              كل الطلاب
            </Link>
          </div>
          {perGrade.length ? (
            <div className="ad-bars">
              {perGrade.map(({ grade, n }) => (
                <Link key={grade.id} href={`/admin/students?grade=${grade.id}`} className="r" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span>{grade.name}</span>
                  <div className="bar">
                    <span style={{ width: `${(n / maxGrade) * 100}%` }} />
                  </div>
                  <span className="num">{num(n)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">مفيش مراحل لسه.</p>
          )}
        </section>

        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>الأكتر لعبًا</h2>
            <Link href="/admin/games" className="btn btn-sm btn-ghost">
              كل الألعاب
            </Link>
          </div>
          {top.data?.length ? (
            <ul className="ad-list">
              {top.data.map((r) => {
                const g = titleOf.get(r.game_id as string);
                const kind = kindOf(g?.kind);
                return (
                  <li key={r.game_id as string}>
                    <div className="grow">
                      <b>
                        <Link href={adminHref(kind, r.game_id as string)} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {g?.title ?? 'لعبة'}
                        </Link>
                      </b>
                      <small>
                        {g ? (kind === 'game' ? getDef(g.type).label : kind === 'quick' ? 'ع السريع' : 'مسابقة') : ''} · {num(r.players as number)} طالب
                      </small>
                    </div>
                    <span className="badge">{num(r.plays as number)} محاولة</span>
                    <span className="badge badge-gold">{num(Math.round(r.avg_percent as number))}٪</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">لسه محدش لعب. أول ما الطلاب يبدأوا هتلاقي هنا أكتر الألعاب اللي بيلعبوها.</p>
          )}
        </section>

        <section className="ad-panel">
          <h2>آخر المحاولات</h2>
          {recent.data?.length ? (
            <ul className="ad-list">
              {recent.data.map((a) => {
                const who = a.profiles as unknown as { full_name: string } | null;
                const game = a.games as unknown as { title: string } | null;
                return (
                  <li key={a.id as string}>
                    <div className="grow">
                      <b>{who?.full_name ?? 'طالب'}</b>
                      <small>
                        {game?.title ?? 'لعبة'} · {timeAgo(a.created_at as string)}
                      </small>
                    </div>
                    <span className="badge badge-gold">{pct(a.score as number, a.max_score as number)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">مفيش محاولات لسه.</p>
          )}
        </section>

        <section className="ad-panel">
          <h2>طلاب جداد</h2>
          {newcomers.data?.length ? (
            <ul className="ad-list">
              {newcomers.data.map((s) => (
                <li key={s.id as string}>
                  <div className="grow">
                    <b>
                      <Link href={`/admin/students/${s.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {s.full_name as string}
                      </Link>
                    </b>
                    <small>
                      {catalog.grades.find((g) => g.id === s.grade_id)?.name ?? 'من غير مرحلة'} · {timeAgo(s.created_at as string)}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">لسه محدش سجّل.</p>
          )}
        </section>
      </div>
    </>
  );
}
