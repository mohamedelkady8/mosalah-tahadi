import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminTop } from '@/components/admin/AdminShell';
import { DeleteAttemptButton, StudentEditor } from '@/components/admin/StudentTools';
import { ChevronStart } from '@/components/ui/icons';
import { isUuid, requireAdmin } from '@/lib/admin';
import { displayContact } from '@/lib/auth/identifier';
import { getCatalog, gradeName, trackName } from '@/lib/data';
import { durationText, formatDate, formatDateTime, num, pct } from '@/lib/format';
import { getDef } from '@/lib/games/registry';
import type { GameType } from '@/lib/games/types';
import { adminHref, kindOf } from '@/lib/kinds';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'بيانات طالب' };

export default async function AdminStudent({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [{ data: profile }, { data: attempts, count }, catalog] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('attempts')
      .select('id, game_id, score, max_score, correct_count, total_count, duration_ms, created_at, games(title, type, slug, kind)', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    getCatalog(),
  ]);
  if (!profile) notFound();
  const p = profile as Profile;
  const list = attempts ?? [];
  const gamesPlayed = new Set(list.map((a) => a.game_id as string)).size;
  const avg = list.length ? Math.round(list.reduce((s, a) => s + (a.max_score ? (a.score as number) / (a.max_score as number) : 0), 0) * (100 / list.length)) : 0;
  const contact = displayContact(p.email, p.phone);
  const showTrack = Boolean(p.track_id) && (catalog.grades.find((g) => g.id === p.grade_id)?.trackIds.length ?? 0) > 1;

  return (
    <>
      <AdminTop title={p.full_name} sub={p.role === 'admin' ? 'أدمن' : [gradeName(catalog, p.grade_id) || 'من غير مرحلة', showTrack ? trackName(catalog, p.track_id) : ''].filter(Boolean).join(' · ')}>
        <Link href="/admin/students" className="btn btn-sm btn-ghost">
          <ChevronStart size={16} /> كل الطلاب
        </Link>
      </AdminTop>

      <section className="ad-stats" aria-label="أرقام الطالب">
        <div className="ad-stat">
          <b>{num(p.points)}</b>
          <span>نقطة</span>
          <small>مجموع أحسن نتيجة في كل لعبة</small>
        </div>
        <div className="ad-stat">
          <b>{num(gamesPlayed)}</b>
          <span>لعبة لعبها</span>
          <small>{num(count ?? 0)} محاولة</small>
        </div>
        <div className="ad-stat">
          <b>{list.length ? `${num(avg)}٪` : '—'}</b>
          <span>متوسط النتيجة</span>
          <small>{list.length ? `في آخر ${num(list.length)} محاولة` : 'لسه ملعبش'}</small>
        </div>
      </section>

      <div className="ad-form">
        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>المحاولات</h2>
            {(count ?? 0) > list.length && <span className="muted">آخر {num(list.length)} من {num(count ?? 0)}</span>}
          </div>
          {list.length ? (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>اللعبة</th>
                    <th>النتيجة</th>
                    <th>الوقت</th>
                    <th>إمتى</th>
                    <th>
                      <span className="visually-hidden">مسح</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const g = a.games as unknown as { title: string; type: GameType; kind: string } | null;
                    const kind = kindOf(g?.kind);
                    return (
                      <tr key={a.id as string}>
                        <td>
                          <Link href={adminHref(kind, a.game_id as string)} className="t-title">
                            {g?.title ?? 'لعبة اتمسحت'}
                          </Link>
                          {g && <span className="t-sub">{kind === 'game' ? getDef(g.type).label : kind === 'quick' ? 'ع السريع' : 'مسابقة'}</span>}
                        </td>
                        <td className="num">
                          {num(a.score as number)}/{num(a.max_score as number)} <span className="badge badge-gold">{pct(a.score as number, a.max_score as number)}</span>
                        </td>
                        <td className="num">{durationText(a.duration_ms as number)}</td>
                        <td className="num">{formatDateTime(a.created_at as string)}</td>
                        <td>
                          <DeleteAttemptButton id={a.id as string} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">لسه ملعبش أي لعبة.</p>
          )}
        </section>

        <div className="ad-form-side">
          <section className="ad-panel">
            <h2>الحساب</h2>
            <dl className="ad-kv">
              <dt>بيدخل بـ</dt>
              <dd dir="ltr" style={{ textAlign: 'right' }}>
                {contact || '—'}
              </dd>
              <dt>اتسجّل</dt>
              <dd>{formatDate(p.created_at)}</dd>
              <dt>النوع</dt>
              <dd>{p.role === 'admin' ? 'أدمن' : 'طالب'}</dd>
            </dl>
          </section>
          <StudentEditor
            catalog={catalog}
            isSelf={p.id === userId}
            serviceKey={createAdminClient() !== null}
            student={{ id: p.id, full_name: p.full_name, phone: p.phone, grade_id: p.grade_id, track_id: p.track_id, role: p.role, contact }}
          />
        </div>
      </div>
    </>
  );
}
