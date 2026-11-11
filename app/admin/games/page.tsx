import Link from 'next/link';
import { AdminTop } from '@/components/admin/AdminShell';
import { FilterForm } from '@/components/admin/Filters';
import { GameRowActions } from '@/components/admin/GameRowActions';
import { Pager } from '@/components/admin/Pager';
import { GameTypeIcon, GamepadIcon, PlusIcon } from '@/components/ui/icons';
import { PAGE_SIZE, pageParam, requireAdmin, strParam } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { formatDate, num } from '@/lib/format';
import { GAME_TYPE_LIST, getDef, itemsLabel } from '@/lib/games/registry';
import { isGameType } from '@/lib/games/types';
import { describeTargets } from '@/lib/targets';
import type { GameRow, GameTarget } from '@/lib/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminGames({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const type = strParam(sp.type);
  const status = strParam(sp.status);
  const grade = strParam(sp.grade);
  const page = pageParam(sp.page);
  const catalog = await getCatalog();

  let query = supabase
    .from('games')
    .select('id, slug, title, type, status, topic, item_count, updated_at, difficulty', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, ' ')}%,topic.ilike.%${q.replace(/[%,()]/g, ' ')}%`);
  if (isGameType(type)) query = query.eq('type', type);
  if (status === 'draft' || status === 'published') query = query.eq('status', status);
  if (grade) {
    const { data: ids } = await supabase.from('game_targets').select('game_id').eq('grade_id', grade);
    query = query.in('id', [...new Set((ids ?? []).map((r) => r.game_id as string))].concat('00000000-0000-0000-0000-000000000000'));
  }
  const { data, count } = await query;
  const games = (data ?? []) as Pick<GameRow, 'id' | 'slug' | 'title' | 'type' | 'status' | 'topic' | 'item_count' | 'updated_at' | 'difficulty'>[];

  const ids = games.map((g) => g.id);
  const [{ data: targets }, { data: stats }] = ids.length
    ? await Promise.all([
        supabase.from('game_targets').select('game_id, grade_id, track_id').in('game_id', ids),
        supabase.from('game_stats').select('game_id, plays, avg_percent').in('game_id', ids),
      ])
    : [{ data: [] }, { data: [] }];
  const targetsOf = (id: string) => ((targets ?? []) as GameTarget[]).filter((t) => t.game_id === id);
  const statsOf = new Map((stats ?? []).map((s) => [s.game_id as string, s as { plays: number; avg_percent: number }]));
  const filtered = Boolean(q || type || status || grade);

  return (
    <>
      <AdminTop title="الألعاب" sub={`${num(count ?? 0)} لعبة${filtered ? ' بالفلتر ده' : ''}`}>
        <Link href="/admin/games/new" className="btn btn-gold">
          <PlusIcon size={20} />
          لعبة جديدة
        </Link>
      </AdminTop>

      <section className="ad-panel">
        <FilterForm action="/admin/games">
          <input className="input grow" type="search" name="q" defaultValue={q} placeholder="دوّر باسم اللعبة أو الدرس" aria-label="بحث" />
          <select className="select" name="type" defaultValue={type} aria-label="نوع اللعبة">
            <option value="">كل الأنواع</option>
            {GAME_TYPE_LIST.map((d) => (
              <option key={d.type} value={d.type}>
                {d.label}
              </option>
            ))}
          </select>
          <select className="select" name="grade" defaultValue={grade} aria-label="المرحلة">
            <option value="">كل المراحل</option>
            {catalog.grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select className="select" name="status" defaultValue={status} aria-label="الحالة">
            <option value="">منشورة ومسودات</option>
            <option value="published">المنشورة بس</option>
            <option value="draft">المسودات بس</option>
          </select>
          {filtered && (
            <Link href="/admin/games" className="btn btn-sm btn-ghost">
              شيل الفلتر
            </Link>
          )}
        </FilterForm>
      </section>

      {games.length === 0 ? (
        <section className="ad-panel empty">
          <div className="e-ic">
            <GamepadIcon size={30} />
          </div>
          <h3>{filtered ? 'مفيش ألعاب بالفلتر ده' : 'لسه مفيش ألعاب'}</h3>
          <p>{filtered ? 'جرّب تغيّر الفلتر أو تشيله.' : 'اعمل أول لعبة واختار هتظهر لأنهي مرحلة وشعبة.'}</p>
          <Link href="/admin/games/new" className="btn btn-gold">
            <PlusIcon size={20} />
            لعبة جديدة
          </Link>
        </section>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>اللعبة</th>
                <th>النوع</th>
                <th>لمين</th>
                <th>الحالة</th>
                <th>اللعب</th>
                <th>آخر تعديل</th>
                <th>
                  <span className="visually-hidden">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const def = getDef(g.type);
                const who = describeTargets(catalog, targetsOf(g.id));
                const st = statsOf.get(g.id);
                return (
                  <tr key={g.id}>
                    <td>
                      <Link href={`/admin/games/${g.id}`} className="t-title">
                        {g.title}
                      </Link>
                      <span className="t-sub">
                        {[g.topic, itemsLabel(g.type, g.item_count)].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td>
                      <span className="ad-type">
                        <GameTypeIcon type={g.type} size={18} />
                        {def.label}
                      </span>
                    </td>
                    <td>{who.length ? who.join('، ') : <span className="badge badge-bad">مش متحدد</span>}</td>
                    <td>
                      <span className={`ad-status${g.status === 'published' ? ' pub' : ''}`}>
                        <span className="dot" />
                        {g.status === 'published' ? 'منشورة' : 'مسودة'}
                      </span>
                    </td>
                    <td className="num">{st?.plays ? `${num(st.plays)} · ${num(Math.round(st.avg_percent))}٪` : '—'}</td>
                    <td className="num">{formatDate(g.updated_at)}</td>
                    <td>
                      <GameRowActions id={g.id} slug={g.slug} title={g.title} status={g.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={count ?? 0} pageSize={PAGE_SIZE} path="/admin/games" params={{ q, type, status, grade }} />
    </>
  );
}
