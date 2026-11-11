import Link from 'next/link';
import { AdminTop } from '@/components/admin/AdminShell';
import { FilterForm } from '@/components/admin/Filters';
import { Pager } from '@/components/admin/Pager';
import { NewStudentButton } from '@/components/admin/StudentTools';
import { UsersIcon } from '@/components/ui/icons';
import { PAGE_SIZE, pageParam, requireAdmin, strParam } from '@/lib/admin';
import { displayContact } from '@/lib/auth/identifier';
import { getCatalog, gradeName, trackName } from '@/lib/data';
import { formatDate, num } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'الطلاب' };

const SORTS: Record<string, { column: string; ascending: boolean; label: string }> = {
  new: { column: 'created_at', ascending: false, label: 'الأحدث' },
  points: { column: 'points', ascending: false, label: 'الأكتر نقط' },
  name: { column: 'full_name', ascending: true, label: 'بالاسم' },
};

export default async function AdminStudents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const grade = strParam(sp.grade);
  const role = strParam(sp.role);
  const sortKey = SORTS[strParam(sp.sort)] ? strParam(sp.sort) : 'new';
  const page = pageParam(sp.page);
  const catalog = await getCatalog();
  const sort = SORTS[sortKey];

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, phone, grade_id, track_id, role, points, created_at', { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const safe = q.replace(/[%,()]/g, ' ');
    query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (grade === 'none') query = query.is('grade_id', null);
  else if (grade) query = query.eq('grade_id', grade);
  if (role === 'admin' || role === 'student') query = query.eq('role', role);
  const { data, count } = await query;
  const students = (data ?? []) as Profile[];
  const filtered = Boolean(q || grade || role);

  return (
    <>
      <AdminTop title="الطلاب" sub={`${num(count ?? 0)} حساب${filtered ? ' بالفلتر ده' : ''}`}>
        <NewStudentButton catalog={catalog} canCreate={createAdminClient() !== null} />
      </AdminTop>

      <section className="ad-panel">
        <FilterForm action="/admin/students">
          <input className="input grow" type="search" name="q" defaultValue={q} placeholder="دوّر بالاسم أو الموبايل أو الإيميل" aria-label="بحث" />
          <select className="select" name="grade" defaultValue={grade} aria-label="المرحلة">
            <option value="">كل المراحل</option>
            {catalog.grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="none">من غير مرحلة</option>
          </select>
          <select className="select" name="role" defaultValue={role} aria-label="النوع">
            <option value="">الطلاب والأدمن</option>
            <option value="student">الطلاب بس</option>
            <option value="admin">الأدمن بس</option>
          </select>
          <select className="select" name="sort" defaultValue={sortKey} aria-label="الترتيب">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
          {filtered && (
            <Link href="/admin/students" className="btn btn-sm btn-ghost">
              شيل الفلتر
            </Link>
          )}
        </FilterForm>
      </section>

      {students.length === 0 ? (
        <section className="ad-panel empty">
          <div className="e-ic">
            <UsersIcon size={30} />
          </div>
          <h3>{filtered ? 'مفيش حد بالفلتر ده' : 'لسه محدش سجّل'}</h3>
          <p>{filtered ? 'جرّب تدوّر بطريقة تانية.' : 'أول ما الطلاب يعملوا حسابات هيظهروا هنا.'}</p>
        </section>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>بيدخل بـ</th>
                <th>المرحلة</th>
                <th>النقط</th>
                <th>اتسجّل</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/students/${s.id}`} className="t-title">
                      {s.full_name}
                    </Link>
                    {s.role !== 'student' && (
                      <>
                        {' '}
                        <span className="badge badge-wine">{ROLE_LABELS[s.role]}</span>
                      </>
                    )}
                  </td>
                  <td className="num" dir="ltr" style={{ textAlign: 'right' }}>
                    {displayContact(s.email, s.phone)}
                  </td>
                  <td>
                    {gradeName(catalog, s.grade_id) || '—'}
                    {s.track_id && catalog.grades.find((g) => g.id === s.grade_id)?.trackIds.length !== 1 && (
                      <span className="t-sub">{trackName(catalog, s.track_id)}</span>
                    )}
                  </td>
                  <td className="num">{num(s.points)}</td>
                  <td className="num">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={count ?? 0} pageSize={PAGE_SIZE} path="/admin/students" params={{ q, grade, role, sort: sortKey === 'new' ? '' : sortKey }} />
    </>
  );
}
