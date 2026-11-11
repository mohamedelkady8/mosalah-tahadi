import { AdminTop } from '@/components/admin/AdminShell';
import { DailyManager } from '@/components/admin/DailyManager';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { cairoDayKey } from '@/lib/format';
import type { DailyQuestion } from '@/lib/types';

export const metadata = { title: 'سؤال اليوم' };

export default async function AdminDaily() {
  const { supabase } = await requireAdmin();
  const today = cairoDayKey();
  const [{ data: coming }, { data: past }, catalog] = await Promise.all([
    supabase.from('daily_questions').select('*').gte('day', today).order('day'),
    supabase.from('daily_questions').select('*').lt('day', today).order('day', { ascending: false }).limit(30),
    getCatalog(),
  ]);
  return (
    <>
      <AdminTop title="سؤال اليوم" sub="سؤال كل يوم، الطالب بيشوفه في الموقع ويجاوب عليه في الكومنتات على جروب الفيس." />
      <DailyManager
        questions={[...((coming ?? []) as DailyQuestion[]), ...((past ?? []) as DailyQuestion[])]}
        grades={catalog.grades.map((g) => ({ id: g.id, name: g.name }))}
        today={today}
      />
    </>
  );
}
