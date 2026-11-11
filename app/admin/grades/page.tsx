import { AdminTop } from '@/components/admin/AdminShell';
import { GradesManager } from '@/components/admin/GradesManager';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';

export const metadata = { title: 'المراحل والشعب' };

export default async function AdminGrades() {
  const { supabase } = await requireAdmin();
  const catalog = await getCatalog();
  const head = { count: 'exact' as const, head: true };

  const [gradeCounts, trackCounts] = await Promise.all([
    Promise.all(
      catalog.grades.map(async (g) => {
        const [students, games] = await Promise.all([
          supabase.from('profiles').select('id', head).eq('grade_id', g.id),
          supabase.from('game_targets').select('game_id').eq('grade_id', g.id),
        ]);
        return [g.id, { students: students.count ?? 0, games: new Set((games.data ?? []).map((r) => r.game_id)).size }] as const;
      }),
    ),
    Promise.all(
      catalog.tracks.map(async (t) => {
        const { count } = await supabase.from('profiles').select('id', head).eq('track_id', t.id);
        return [t.id, count ?? 0] as const;
      }),
    ),
  ]);

  return (
    <>
      <AdminTop title="المراحل والشعب" sub="المراحل اللي الطلاب بيختاروا منها، والشعب اللي جوه كل مرحلة." />
      <GradesManager catalog={catalog} counts={Object.fromEntries(gradeCounts)} trackCounts={Object.fromEntries(trackCounts)} />
    </>
  );
}
