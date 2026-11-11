import 'server-only';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminTop } from '@/components/admin/AdminShell';
import { FilterForm } from '@/components/admin/Filters';
import { GameForm, type GameFormStats } from '@/components/admin/GameForm';
import { GameRowActions } from '@/components/admin/GameRowActions';
import { Pager } from '@/components/admin/Pager';
import { BoltIcon, ChevronStart, GameTypeIcon, GamepadIcon, PlusIcon, TrophyIcon } from '@/components/ui/icons';
import { getTopics, isUuid, PAGE_SIZE, pageParam, requireAdmin, strParam } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { countLabel, formatDate, formatWhen, num } from '@/lib/format';
import { GAME_TYPE_LIST, getDef, itemsLabel } from '@/lib/games/registry';
import { parseSettings } from '@/lib/games/settings';
import { isGameType } from '@/lib/games/types';
import { adminHref, contestPhase, KIND_INFO, kindOf, type GameKind } from '@/lib/kinds';
import { describeTargets } from '@/lib/targets';
import type { GameRow, GameTarget } from '@/lib/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const COPY: Record<GameKind, { count: (n: number) => string; sub: string; search: string; empty: string; none: string; emptyHelp: string; newSub: string }> = {
  game: {
    count: (n) => countLabel(n, { one: 'لعبة واحدة', two: 'لعبتين', few: 'ألعاب', many: 'لعبة' }),
    sub: 'الألعاب اللي الطالب بيلاقيها في قسم «ألعاب».',
    search: 'دوّر باسم اللعبة أو الدرس',
    empty: 'لسه مفيش ألعاب',
    none: 'مفيش ألعاب بالفلتر ده',
    emptyHelp: 'اعمل أول لعبة واختار هتظهر لأنهي مرحلة وشعبة.',
    newSub: 'اختار النوع، اكتب المحتوى، وحدد هتظهر لأنهي مرحلة وشعبة.',
  },
  quick: {
    count: (n) => countLabel(n, { one: 'تحدي واحد', two: 'تحديين', few: 'تحديات', many: 'تحدي' }),
    sub: 'أسئلة اختيار من متعدد بتايمر وشرح لكل اختيار، زي موقع «ع السريع».',
    search: 'دوّر باسم التحدي أو الدرس',
    empty: 'لسه مفيش تحديات',
    none: 'مفيش تحديات بالفلتر ده',
    emptyHelp: 'اعمل أول تحدي، أو الصق أسئلة موقع «ع السريع» القديم زي ما هي.',
    newSub: 'اكتب الأسئلة والشرح، أو الصقها كلها مرة واحدة، وحدد هيظهر لأنهي مرحلة.',
  },
  contest: {
    count: (n) => countLabel(n, { one: 'مسابقة واحدة', two: 'مسابقتين', few: 'مسابقات', many: 'مسابقة' }),
    sub: 'مسابقات بميعاد، كل طالب ليه محاولة واحدة، والترتيب بالدرجة وبعدين السرعة.',
    search: 'دوّر باسم المسابقة',
    empty: 'لسه مفيش مسابقات',
    none: 'مفيش مسابقات بالفلتر ده',
    emptyHelp: 'اعمل مسابقة وحدد ميعادها، وهتظهر للطلاب في «جاية قريب» لحد ما تبدأ.',
    newSub: 'حدد الميعاد والجايزة واكتب الأسئلة. الطلاب مش هيشوفوا الأسئلة غير لما تبدأ.',
  },
};

const KIND_ICON: Record<GameKind, typeof GamepadIcon> = { game: GamepadIcon, quick: BoltIcon, contest: TrophyIcon };

const PHASE_BADGE = {
  upcoming: { cls: 'badge-blue', text: 'جاية' },
  live: { cls: 'badge-ok', text: 'شغالة دلوقتي' },
  ended: { cls: '', text: 'خلصت' },
} as const;

type ListRow = Pick<GameRow, 'id' | 'slug' | 'title' | 'type' | 'status' | 'topic' | 'item_count' | 'updated_at' | 'starts_at' | 'ends_at' | 'prize'>;

export async function GamesList({ kind, searchParams }: { kind: GameKind; searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const type = kind === 'quick' ? '' : strParam(sp.type);
  const status = strParam(sp.status);
  const grade = strParam(sp.grade);
  const page = pageParam(sp.page);
  const catalog = await getCatalog();
  const k = KIND_INFO[kind];
  const copy = COPY[kind];
  const fem = kind !== 'quick';
  const Icon = KIND_ICON[kind];

  let query = supabase
    .from('games')
    .select('id, slug, title, type, status, topic, item_count, updated_at, starts_at, ends_at, prize', { count: 'exact' })
    .eq('kind', kind)
    .order(kind === 'contest' ? 'starts_at' : 'updated_at', { ascending: false, nullsFirst: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, ' ')}%,topic.ilike.%${q.replace(/[%,()]/g, ' ')}%`);
  if (isGameType(type)) query = query.eq('type', type);
  if (status === 'draft' || status === 'published') query = query.eq('status', status);
  if (grade) {
    const { data: ids } = await supabase.from('game_targets').select('game_id').eq('grade_id', grade);
    query = query.in('id', [...new Set((ids ?? []).map((r) => r.game_id as string))].concat('00000000-0000-0000-0000-000000000000'));
  }
  const { data, count } = await query;
  const games = (data ?? []) as ListRow[];

  const ids = games.map((g) => g.id);
  const [{ data: targets }, { data: stats }] = ids.length
    ? await Promise.all([
        supabase.from('game_targets').select('game_id, grade_id, track_id').in('game_id', ids),
        supabase.from('game_stats').select('game_id, plays, players, avg_percent').in('game_id', ids),
      ])
    : [{ data: [] }, { data: [] }];
  const targetsOf = (id: string) => ((targets ?? []) as GameTarget[]).filter((t) => t.game_id === id);
  const statsOf = new Map((stats ?? []).map((s) => [s.game_id as string, s as { plays: number; players: number; avg_percent: number }]));
  const filtered = Boolean(q || type || status || grade);
  const newHref = `${k.adminBase}/new`;

  return (
    <>
      <AdminTop title={k.plural} sub={`${copy.count(count ?? 0)}${filtered ? ' بالفلتر ده' : ''}. ${copy.sub}`}>
        <Link href={newHref} className="btn btn-gold">
          <PlusIcon size={20} />
          {k.newLabel}
        </Link>
      </AdminTop>

      <section className="ad-panel">
        <FilterForm action={k.adminBase}>
          <input className="input grow" type="search" name="q" defaultValue={q} placeholder={copy.search} aria-label="بحث" />
          {kind !== 'quick' && (
            <select className="select" name="type" defaultValue={type} aria-label="النوع">
              <option value="">كل الأنواع</option>
              {GAME_TYPE_LIST.map((d) => (
                <option key={d.type} value={d.type}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
          <select className="select" name="grade" defaultValue={grade} aria-label="المرحلة">
            <option value="">كل المراحل</option>
            {catalog.grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select className="select" name="status" defaultValue={status} aria-label="الحالة">
            <option value="">{fem ? 'منشورة ومسودات' : 'منشور ومسودات'}</option>
            <option value="published">{fem ? 'المنشورة بس' : 'المنشور بس'}</option>
            <option value="draft">المسودات بس</option>
          </select>
          {filtered && (
            <Link href={k.adminBase} className="btn btn-sm btn-ghost">
              شيل الفلتر
            </Link>
          )}
        </FilterForm>
      </section>

      {games.length === 0 ? (
        <section className="ad-panel empty">
          <div className="e-ic">
            <Icon size={30} />
          </div>
          <h3>{filtered ? copy.none : copy.empty}</h3>
          <p>{filtered ? 'جرّب تغيّر الفلتر أو تشيله.' : copy.emptyHelp}</p>
          <Link href={newHref} className="btn btn-gold">
            <PlusIcon size={20} />
            {k.newLabel}
          </Link>
        </section>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>{k.the}</th>
                {kind === 'contest' ? <th>الميعاد</th> : kind === 'game' && <th>النوع</th>}
                <th>لمين</th>
                <th>الحالة</th>
                <th>{kind === 'contest' ? 'شارك' : 'اللعب'}</th>
                {kind !== 'contest' && <th>آخر تعديل</th>}
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
                const phase = kind === 'contest' && g.starts_at ? PHASE_BADGE[contestPhase(g.starts_at, g.ends_at)] : null;
                return (
                  <tr key={g.id}>
                    <td>
                      <Link href={adminHref(kind, g.id)} className="t-title">
                        {g.title}
                      </Link>
                      <span className="t-sub">
                        {[kind === 'contest' && def.label, g.topic, itemsLabel(g.type, g.item_count), kind === 'contest' && g.prize ? `الجايزة: ${g.prize}` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </td>
                    {kind === 'contest' ? (
                      <td>
                        {g.starts_at && g.ends_at ? (
                          <span className="ad-when">
                            {phase && <span className={`badge ${phase.cls}`}>{phase.text}</span>}
                            <span>{formatWhen(g.starts_at)}</span>
                            <span className="muted">لحد {formatWhen(g.ends_at)}</span>
                          </span>
                        ) : (
                          <span className="badge badge-bad">من غير ميعاد</span>
                        )}
                      </td>
                    ) : (
                      kind === 'game' && (
                        <td>
                          <span className="ad-type">
                            <GameTypeIcon type={g.type} size={18} />
                            {def.label}
                          </span>
                        </td>
                      )
                    )}
                    <td>{who.length ? who.join('، ') : <span className="badge badge-bad">مش متحدد</span>}</td>
                    <td>
                      <span className={`ad-status${g.status === 'published' ? ' pub' : ''}`}>
                        <span className="dot" />
                        {g.status === 'published' ? (fem ? 'منشورة' : 'منشور') : 'مسودة'}
                      </span>
                    </td>
                    <td className="num">
                      {kind === 'contest'
                        ? st?.players
                          ? countLabel(st.players, { one: 'طالب واحد', two: 'طالبين', few: 'طلاب', many: 'طالب' })
                          : '—'
                        : st?.plays
                          ? `${num(st.plays)} · ${num(Math.round(st.avg_percent))}٪`
                          : '—'}
                    </td>
                    {kind !== 'contest' && <td className="num">{formatDate(g.updated_at)}</td>}
                    <td>
                      <GameRowActions id={g.id} slug={g.slug} title={g.title} status={g.status} kind={kind} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={count ?? 0} pageSize={PAGE_SIZE} path={k.adminBase} params={{ q, type, status, grade }} />
    </>
  );
}

export async function NewGamePage({ kind, searchParams }: { kind: GameKind; searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const type = strParam(sp.type);
  const grade = strParam(sp.grade);
  const [catalog, topics] = await Promise.all([getCatalog(), getTopics(supabase)]);
  const k = KIND_INFO[kind];
  return (
    <>
      <AdminTop title={k.newLabel} sub={COPY[kind].newSub}>
        <Link href={k.adminBase} className="btn btn-sm btn-ghost">
          <ChevronStart size={16} /> {kind === 'quick' ? 'كل التحديات' : `كل ${k.plural}`}
        </Link>
      </AdminTop>
      <GameForm kind={kind} catalog={catalog} topics={topics} initialType={isGameType(type) ? type : undefined} initialGrade={grade || undefined} />
    </>
  );
}

export async function EditGamePage({ kind, params }: { kind: GameKind; params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [{ data: game }, { data: targets }, { data: stats }, catalog, topics] = await Promise.all([
    supabase.from('games').select('*').eq('id', id).maybeSingle(),
    supabase.from('game_targets').select('grade_id, track_id').eq('game_id', id),
    supabase.from('game_stats').select('plays, players, avg_percent, last_played_at').eq('game_id', id).maybeSingle(),
    getCatalog(),
    getTopics(supabase),
  ]);
  if (!game) notFound();
  const row = game as GameRow;
  const rowKind = kindOf(row.kind);
  if (rowKind !== kind) redirect(adminHref(rowKind, row.id));

  const k = KIND_INFO[kind];
  const def = getDef(row.type);
  const parsed = def.contentSchema.safeParse(row.content);
  const content = parsed.success
    ? parsed.data
    : { ...(def.defaultContent() as object), ...(row.content && typeof row.content === 'object' ? (row.content as object) : {}) };
  const fem = kind !== 'quick';

  return (
    <>
      <AdminTop title={row.title} sub={`${kind === 'game' ? def.label : k.one}${row.status === 'published' ? (fem ? ' · منشورة' : ' · منشور') : ' · مسودة'}`}>
        <Link href={k.adminBase} className="btn btn-sm btn-ghost">
          <ChevronStart size={16} /> {kind === 'quick' ? 'كل التحديات' : `كل ${k.plural}`}
        </Link>
      </AdminTop>
      <GameForm
        key={row.id}
        kind={kind}
        catalog={catalog}
        topics={topics}
        stats={(stats as GameFormStats | null) ?? null}
        initial={{
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description ?? '',
          type: row.type,
          topic: row.topic ?? '',
          difficulty: row.difficulty,
          cover_url: row.cover_url,
          status: row.status,
          content,
          settings: parseSettings(row.settings, row.type),
          targets: (targets ?? []) as Pick<GameTarget, 'grade_id' | 'track_id'>[],
          updated_at: row.updated_at,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          prize: row.prize,
        }}
      />
    </>
  );
}
