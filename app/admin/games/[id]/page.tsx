import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminTop } from '@/components/admin/AdminShell';
import { GameForm, type GameFormStats } from '@/components/admin/GameForm';
import { ChevronStart } from '@/components/ui/icons';
import { getTopics, isUuid, requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { getDef } from '@/lib/games/registry';
import { parseSettings } from '@/lib/games/settings';
import type { GameRow, GameTarget } from '@/lib/types';

export const metadata = { title: 'تعديل لعبة' };

export default async function EditGame({ params }: { params: Promise<{ id: string }> }) {
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
  const def = getDef(row.type);
  const parsed = def.contentSchema.safeParse(row.content);
  const content = parsed.success
    ? parsed.data
    : { ...(def.defaultContent() as object), ...(row.content && typeof row.content === 'object' ? (row.content as object) : {}) };

  return (
    <>
      <AdminTop title={row.title} sub={`${def.label}${row.status === 'published' ? ' · منشورة' : ' · مسودة'}`}>
        <Link href="/admin/games" className="btn btn-sm btn-ghost">
          <ChevronStart size={16} /> كل الألعاب
        </Link>
      </AdminTop>
      <GameForm
        key={row.id}
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
        }}
      />
    </>
  );
}
