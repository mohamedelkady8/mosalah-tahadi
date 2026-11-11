import Link from 'next/link';
import { AdminTop } from '@/components/admin/AdminShell';
import { BoltIcon, ChartIcon, GamepadIcon, PlusIcon, UsersIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { cairoStartOfDay, num, pct, timeAgo } from '@/lib/format';
import { getDef } from '@/lib/games/registry';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GameType } from '@/lib/games/types';

export default async function AdminHome() {
  const { supabase, profile } = await requireAdmin();
  const catalog = await getCatalog();
  const today = cairoStartOfDay().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [students, published, drafts, attempts, attemptsToday, attemptsWeek, perGrade, top, recent, newcomers] = await Promise.all([
    count(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')),
    count(supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'published')),
    count(supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'draft')),
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

  const topIds = (top.data ?? []).map((r) => r.game_id as string);
  const { data: topGames } = topIds.length
    ? await supabase.from('games').select('id, title, type').in('id', topIds)
    : { data: [] as { id: string; title: string; type: GameType }[] };
  const titleOf = new Map((topGames ?? []).map((g) => [g.id as string, g as { id: string; title: string; type: GameType }]));
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
            <h2>أكتر الألعاب لعبًا</h2>
            <Link href="/admin/games" className="btn btn-sm btn-ghost">
              كل الألعاب
            </Link>
          </div>
          {top.data?.length ? (
            <ul className="ad-list">
              {top.data.map((r) => {
                const g = titleOf.get(r.game_id as string);
                return (
                  <li key={r.game_id as string}>
                    <div className="grow">
                      <b>
                        <Link href={`/admin/games/${r.game_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {g?.title ?? 'لعبة'}
                        </Link>
                      </b>
                      <small>
                        {g ? getDef(g.type).label : ''} · {num(r.players as number)} طالب
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
