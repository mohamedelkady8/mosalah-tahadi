import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminTop } from '@/components/admin/AdminShell';
import { ATTEMPT_COLUMNS, StudentProfile, studentSub, type StudentAttempt } from '@/components/admin/StudentProfile';
import { ChevronStart } from '@/components/ui/icons';
import { isUuid, requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'بيانات طالب' };

export default async function AdminStudent({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [{ data: profile }, { data: attempts, count }, catalog] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('attempts').select(ATTEMPT_COLUMNS, { count: 'exact' }).eq('user_id', id).order('created_at', { ascending: false }).limit(100),
    getCatalog(),
  ]);
  if (!profile) notFound();
  const p = profile as Profile;

  return (
    <>
      <AdminTop title={p.full_name} sub={studentSub(catalog, p)}>
        <Link href="/admin/students" className="btn btn-sm btn-ghost">
          <ChevronStart size={16} /> كل الطلاب
        </Link>
      </AdminTop>
      <StudentProfile
        profile={p}
        attempts={(attempts ?? []) as unknown as StudentAttempt[]}
        count={count ?? 0}
        catalog={catalog}
        userId={userId}
        serviceKey={createAdminClient() !== null}
      />
    </>
  );
}
