import Link from 'next/link';
import { AdminTop } from '@/components/admin/AdminShell';
import { FilterForm } from '@/components/admin/Filters';
import { ATTEMPT_COLUMNS, StudentProfile, studentSub, type StudentAttempt } from '@/components/admin/StudentProfile';
import { SearchIcon, UsersIcon } from '@/components/ui/icons';
import { isUuid, requireStaff, strParam } from '@/lib/admin';
import { displayContact, parseIdentifier } from '@/lib/auth/identifier';
import { getCatalog } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'دوّر على طالب' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ad-panel empty">
      <div className="e-ic">
        <UsersIcon size={30} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </section>
  );
}

/** One student at a time, by their exact phone number or email. There is deliberately no list of students here. */
export default async function StudentLookup({ searchParams }: { searchParams: SearchParams }) {
  const { userId, profile: me } = await requireStaff();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const pickedId = strParam(sp.id);
  const support = me.role === 'support';

  const top = (
    <>
      <AdminTop title="دوّر على طالب" sub="اكتب رقم موبايل الطالب أو الإيميل اللي بيدخل بيه بالظبط." />
      <section className="ad-panel">
        <FilterForm action="/admin/lookup">
          <input
            className="input grow ltr"
            dir="ltr"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="01012345678"
            aria-label="رقم الموبايل أو الإيميل"
            inputMode="email"
            autoComplete="off"
            autoFocus={!q}
            required
          />
          <button type="submit" className="btn btn-gold">
            <SearchIcon size={18} /> دوّر
          </button>
        </FilterForm>
      </section>
    </>
  );

  if (!q) return top;

  const id = parseIdentifier(q);
  if (!id) {
    return (
      <>
        {top}
        <Empty title="الرقم أو الإيميل مش مظبوط">اكتب رقم موبايل مصري (زي 01012345678) أو إيميل كامل.</Empty>
      </>
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return (
      <>
        {top}
        <Empty title="البحث مش شغال دلوقتي">البحث محتاج SUPABASE_SERVICE_ROLE_KEY على السيرفر.</Empty>
      </>
    );
  }

  const base = () => admin.from('profiles').select('*').eq('role', 'student').limit(5);
  const results = await Promise.all(id.kind === 'phone' ? [base().eq('phone', id.phone), base().eq('email', id.email)] : [base().eq('email', id.email)]);
  const matches = [...new Map(results.flatMap((r) => (r.data ?? []) as Profile[]).map((p) => [p.id, p])).values()];

  if (!matches.length) {
    return (
      <>
        {top}
        <Empty title="مفيش طالب بالبيانات دي">اتأكد من الرقم أو الإيميل، لازم يكون نفس اللي الطالب بيدخل بيه.</Empty>
      </>
    );
  }

  const student = matches.find((p) => isUuid(pickedId) && p.id === pickedId) ?? (matches.length === 1 ? matches[0] : null);
  const catalog = await getCatalog();

  if (!student) {
    return (
      <>
        {top}
        <section className="ad-panel">
          <h2>فيه أكتر من طالب بالرقم ده، اختار</h2>
          <ul className="ad-list">
            {matches.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/lookup?q=${encodeURIComponent(q)}&id=${p.id}`} className="t-title">
                  {p.full_name}
                </Link>{' '}
                <span className="muted">
                  {studentSub(catalog, p)} · <span dir="ltr">{displayContact(p.email, p.phone)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  }

  const { data: attempts, count } = await admin
    .from('attempts')
    .select(ATTEMPT_COLUMNS, { count: 'exact' })
    .eq('user_id', student.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <>
      {top}
      <AdminTop title={student.full_name} sub={studentSub(catalog, student)}>
        {!support && (
          <Link href={`/admin/students/${student.id}`} className="btn btn-sm btn-ghost">
            افتح صفحته الكاملة
          </Link>
        )}
      </AdminTop>
      <StudentProfile
        profile={student}
        attempts={(attempts ?? []) as unknown as StudentAttempt[]}
        count={count ?? 0}
        catalog={catalog}
        userId={userId}
        serviceKey
        support={support}
      />
    </>
  );
}
