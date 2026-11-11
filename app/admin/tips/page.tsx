import { AdminTop } from '@/components/admin/AdminShell';
import { TipsManager } from '@/components/admin/TipsManager';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import type { Tip } from '@/lib/types';

export const metadata = { title: 'النصايح' };

export default async function AdminTips() {
  const { supabase } = await requireAdmin();
  const [{ data }, catalog] = await Promise.all([supabase.from('tips').select('id, body, grade_id, active, created_at').order('created_at', { ascending: false }), getCatalog()]);
  return (
    <>
      <AdminTop title="النصايح" sub="نصايح قصيرة في المذاكرة والامتحانات، بتظهر للطالب لما العجلة تختار «نصايح»." />
      <TipsManager tips={(data ?? []) as Tip[]} grades={catalog.grades.map((g) => ({ id: g.id, name: g.name }))} />
    </>
  );
}
