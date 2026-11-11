import { AdminTop } from '@/components/admin/AdminShell';
import { GameForm } from '@/components/admin/GameForm';
import { getTopics, requireAdmin, strParam } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { isGameType } from '@/lib/games/types';

export const metadata = { title: 'لعبة جديدة' };

export default async function NewGame({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const type = strParam(sp.type);
  const grade = strParam(sp.grade);
  const [catalog, topics] = await Promise.all([getCatalog(), getTopics(supabase)]);
  return (
    <>
      <AdminTop title="لعبة جديدة" sub="اختار النوع، اكتب المحتوى، وحدد هتظهر لأنهي مرحلة وشعبة." />
      <GameForm catalog={catalog} topics={topics} initialType={isGameType(type) ? type : undefined} initialGrade={grade || undefined} />
    </>
  );
}
