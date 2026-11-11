import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import type { PlayableGame } from '@/components/games/types';
import { SitePage } from '@/components/site/SiteHeader';
import { GamepadIcon } from '@/components/ui/icons';
import { getCatalog, requireSession } from '@/lib/data';
import { studentHref, type GameKind } from '@/lib/kinds';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ slug: string }>;

const COLUMNS = 'id, slug, title, description, type, content, settings, item_count, cover_url, topic, difficulty, status, kind';

async function loadGame(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('games').select(COLUMNS).eq('slug', slug).maybeSingle();
  return data as (PlayableGame & { status: 'draft' | 'published'; kind: GameKind }) | null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const game = await loadGame((await params).slug);
  return { title: game?.title ?? 'اللعبة' };
}

export default async function PlayPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { userId, profile } = await requireSession(`/play/${slug}`);
  const isAdmin = profile.role === 'admin';
  const [game, catalog] = await Promise.all([loadGame(slug), getCatalog()]);
  const myGrade = catalog.grades.find((g) => g.id === profile.grade_id);
  const backHref = myGrade ? `/grades/${myGrade.slug}` : isAdmin ? '/admin/games' : '/grades';
  const backLabel = myGrade ? 'الألعاب' : 'رجوع';

  if (!game) {
    return (
      <SitePage back={{ href: backHref, label: backLabel }}>
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560, marginTop: 40 }}>
          <div className="e-ic">
            <GamepadIcon size={30} />
          </div>
          <h3>اللعبة دي مش متاحة</h3>
          <p>يمكن اتشالت، أو مش معمولة لمرحلتك أو شعبتك. شوف الألعاب اللي متاحة ليك.</p>
          <Link href={backHref} className="btn btn-gold">
            {myGrade ? `ألعاب ${myGrade.name}` : 'اختار مرحلتك'}
          </Link>
        </div>
      </SitePage>
    );
  }
  if (game.kind !== 'game') redirect(studentHref(game.kind, game.slug));

  const supabase = await createClient();
  const [{ count }, { data: best }] = await Promise.all([
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('game_id', game.id),
    supabase.from('attempts').select('score').eq('user_id', userId).eq('game_id', game.id).order('score', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <SitePage back={{ href: backHref, label: backLabel }}>
      {isAdmin && (
        <p className="notice form-ok" style={{ marginTop: 0, marginBottom: 14 }}>
          إنت داخل كأدمن: تقدر تلعب براحتك، بس نتيجتك مش بتتحفظ.
          {game.status === 'draft' && ' اللعبة دي لسه مسودة، والطلاب مش شايفينها.'}{' '}
          <Link href={`/admin/games/${game.id}`}>عدّلها</Link>
        </p>
      )}
      <GameShell
        game={game}
        mode="play"
        backHref={backHref}
        backLabel={myGrade ? 'ألعاب تانية' : 'رجوع'}
        stats={{ attemptsUsed: count ?? 0, best: (best?.score as number | undefined) ?? null, unlimited: isAdmin }}
      />
    </SitePage>
  );
}
