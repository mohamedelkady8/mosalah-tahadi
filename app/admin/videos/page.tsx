import { AdminTop } from '@/components/admin/AdminShell';
import { VideosManager } from '@/components/admin/VideosManager';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import type { Video } from '@/lib/types';

export const metadata = { title: 'الفيديوهات' };

export default async function AdminVideos() {
  const { supabase } = await requireAdmin();
  const [{ data }, catalog] = await Promise.all([
    supabase.from('videos').select('id, title, url, description, cover_url, grade_id, active, created_at').order('created_at', { ascending: false }),
    getCatalog(),
  ]);
  return (
    <>
      <AdminTop title="الفيديوهات التحفيزية" sub="فيديوهات قصيرة تشجّع الطلاب، بيتفرجوا عليها جوه الموقع." />
      <VideosManager videos={(data ?? []) as Video[]} grades={catalog.grades.map((g) => ({ id: g.id, name: g.name }))} />
    </>
  );
}
