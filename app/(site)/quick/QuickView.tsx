import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { PlayableGame } from '@/components/games/types';
import { Challenge } from '@/components/hub/Challenge';
import { SitePage } from '@/components/site/SiteHeader';
import { BoltIcon, CheckIcon } from '@/components/ui/icons';
import { getCatalog, gradeName, requireSession } from '@/lib/data';
import { countLabel, formatLongDay, num } from '@/lib/format';
import { kindOf, studentHref } from '@/lib/kinds';
import { sectionBack } from '@/lib/sections';
import { createClient } from '@/lib/supabase/server';

const PLAY_COLUMNS = 'id, slug, title, description, type, content, settings, item_count, cover_url, topic, difficulty, status, kind, published_at';

const questionsLabel = (n: number) => countLabel(n, { one: 'سؤال واحد', two: 'سؤالين', few: 'أسئلة', many: 'سؤال' });

type Stat = { used: number; best: { score: number; max: number } };

/** «ع السريع»: the chosen challenge (or the newest one you haven't done) and the rest under it. */
export async function QuickView({ slug }: { slug?: string }) {
  const { profile } = await requireSession(slug ? `/quick/${slug}` : '/quick');
  const [catalog, supabase] = await Promise.all([getCatalog(), createClient()]);
  const isAdmin = profile.role === 'admin';

  const { data: listData } = await supabase
    .from('games')
    .select('id, slug, title, item_count, published_at')
    .eq('kind', 'quick')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(60);
  const list = (listData ?? []) as { id: string; slug: string; title: string; item_count: number; published_at: string | null }[];

  const stats = new Map<string, Stat>();
  if (list.length) {
    const { data: tries } = await supabase
      .from('attempts')
      .select('game_id, score, max_score')
      .eq('user_id', profile.id)
      .in(
        'game_id',
        list.map((g) => g.id),
      );
    for (const t of tries ?? []) {
      const cur = stats.get(t.game_id as string);
      const best = { score: t.score as number, max: t.max_score as number };
      if (!cur) stats.set(t.game_id as string, { used: 1, best });
      else stats.set(t.game_id as string, { used: cur.used + 1, best: best.score > cur.best.score ? best : cur.best });
    }
  }

  const back = slug && !isAdmin ? { href: '/quick', label: 'ع السريع' } : sectionBack(profile, '/admin/quick');
  const target = slug ?? (list.find((g) => !stats.has(g.id)) ?? list[0])?.slug;
  const { data: row } = target && /^[a-z0-9-]{1,80}$/.test(target) ? await supabase.from('games').select(PLAY_COLUMNS).eq('slug', target).maybeSingle() : { data: null };
  if (row && kindOf(row.kind) !== 'quick') redirect(studentHref(kindOf(row.kind), row.slug as string));
  const game = row && (row.status === 'published' || isAdmin) ? (row as PlayableGame & { published_at: string | null }) : null;

  if (!game) {
    return (
      <SitePage back={back}>
        <h1 className="gp-title">ع السريع</h1>
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
          <div className="e-ic">
            <BoltIcon size={30} />
          </div>
          <h3>{slug ? 'التحدي ده مش متاح' : 'لسه مفيش تحديات'}</h3>
          <p>{slug ? 'ممكن يكون اتشال أو مش معمول لمرحلتك.' : 'أول ما التيم ينزّل تحدي لمرحلتك هتلاقيه هنا.'}</p>
          <Link href={slug ? '/quick' : '/wheel'} className="btn btn-gold">
            {slug ? 'شوف التحديات التانية' : 'لف العجلة'}
          </Link>
        </div>
      </SitePage>
    );
  }

  const stat = stats.get(game.id);
  const others = list.filter((g) => g.id !== game.id);
  const grade = gradeName(catalog, profile.grade_id);

  return (
    <SitePage back={back}>
      <div className="qz-page">
        <Challenge
          key={game.id}
          game={game}
          variant="quick"
          heading="ع السريع"
          audience={!isAdmin && grade ? `طلاب ${grade}` : 'الطلاب'}
          dateLabel={formatLongDay(game.published_at ?? new Date())}
          attemptsUsed={stat?.used ?? 0}
          best={stat?.best ?? null}
        />
        {others.length > 0 && (
          <section className="qz-more" aria-labelledby="qz-more-title">
            <h2 id="qz-more-title">تحديات تانية</h2>
            <ul className="qz-list">
              {others.map((g) => {
                const s = stats.get(g.id);
                return (
                  <li key={g.id}>
                    <Link href={`/quick/${g.slug}`} className="qz-item">
                      <span className="qz-item-ic">
                        <BoltIcon size={20} />
                      </span>
                      <span className="qz-item-t">
                        <b>{g.title}</b>
                        <small>
                          {questionsLabel(g.item_count)}
                          {g.published_at ? ` · ${formatLongDay(g.published_at)}` : ''}
                        </small>
                      </span>
                      {s ? (
                        <span className="badge badge-ok">
                          <CheckIcon size={14} /> {num(Math.round((s.best.score / Math.max(1, s.best.max)) * g.item_count))}/{num(g.item_count)}
                        </span>
                      ) : (
                        <span className="badge badge-gold">جديد</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </SitePage>
  );
}
