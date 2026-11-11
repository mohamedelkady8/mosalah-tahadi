import Link from 'next/link';
import { DeleteAttemptButton, StudentEditor } from '@/components/admin/StudentTools';
import { displayContact } from '@/lib/auth/identifier';
import { gradeName, trackName } from '@/lib/data';
import { durationText, formatDate, formatDateTime, num, pct } from '@/lib/format';
import { getDef } from '@/lib/games/registry';
import type { GameType } from '@/lib/games/types';
import { adminHref, kindOf } from '@/lib/kinds';
import { ROLE_LABELS } from '@/lib/roles';
import type { Catalog, Profile } from '@/lib/types';

export type StudentAttempt = {
  id: string;
  game_id: string;
  score: number;
  max_score: number;
  duration_ms: number;
  created_at: string;
  games: { title: string; type: GameType; kind: string } | null;
};

export const ATTEMPT_COLUMNS = 'id, game_id, score, max_score, correct_count, total_count, duration_ms, created_at, games(title, type, slug, kind)';

export function studentSub(catalog: Catalog, p: Profile): string {
  if (p.role !== 'student') return ROLE_LABELS[p.role];
  const showTrack = Boolean(p.track_id) && (catalog.grades.find((g) => g.id === p.grade_id)?.trackIds.length ?? 0) > 1;
  return [gradeName(catalog, p.grade_id) || 'من غير مرحلة', showTrack ? trackName(catalog, p.track_id) : ''].filter(Boolean).join(' · ');
}

/**
 * A student's numbers, attempts and account tools.
 * `support`: no links to the game editors, no deleting attempts, no role or account changes.
 */
export function StudentProfile({
  profile: p,
  attempts: list,
  count,
  catalog,
  userId,
  serviceKey,
  support = false,
}: {
  profile: Profile;
  attempts: StudentAttempt[];
  count: number;
  catalog: Catalog;
  userId: string;
  serviceKey: boolean;
  support?: boolean;
}) {
  const gamesPlayed = new Set(list.map((a) => a.game_id)).size;
  const avg = list.length ? Math.round(list.reduce((s, a) => s + (a.max_score ? a.score / a.max_score : 0), 0) * (100 / list.length)) : 0;
  const contact = displayContact(p.email, p.phone);

  return (
    <>
      <section className="ad-stats" aria-label="أرقام الطالب">
        <div className="ad-stat">
          <b>{num(p.points)}</b>
          <span>نقطة</span>
          <small>مجموع أحسن نتيجة في كل لعبة</small>
        </div>
        <div className="ad-stat">
          <b>{num(gamesPlayed)}</b>
          <span>لعبة لعبها</span>
          <small>{num(count)} محاولة</small>
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
            {count > list.length && <span className="muted">آخر {num(list.length)} من {num(count)}</span>}
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
                    {!support && (
                      <th>
                        <span className="visually-hidden">مسح</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const g = a.games;
                    const kind = kindOf(g?.kind);
                    const title = g?.title ?? 'لعبة اتمسحت';
                    return (
                      <tr key={a.id}>
                        <td>
                          {support ? (
                            <span className="t-title">{title}</span>
                          ) : (
                            <Link href={adminHref(kind, a.game_id)} className="t-title">
                              {title}
                            </Link>
                          )}
                          {g && <span className="t-sub">{kind === 'game' ? getDef(g.type).label : kind === 'quick' ? 'ع السريع' : 'مسابقة'}</span>}
                        </td>
                        <td className="num">
                          {num(a.score)}/{num(a.max_score)} <span className="badge badge-gold">{pct(a.score, a.max_score)}</span>
                        </td>
                        <td className="num">{durationText(a.duration_ms)}</td>
                        <td className="num">{formatDateTime(a.created_at)}</td>
                        {!support && (
                          <td>
                            <DeleteAttemptButton id={a.id} />
                          </td>
                        )}
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
              <dd>{ROLE_LABELS[p.role]}</dd>
            </dl>
          </section>
          <StudentEditor
            catalog={catalog}
            isSelf={p.id === userId}
            serviceKey={serviceKey}
            limited={support}
            student={{ id: p.id, full_name: p.full_name, phone: p.phone, grade_id: p.grade_id, track_id: p.track_id, role: p.role, contact }}
          />
        </div>
      </div>
    </>
  );
}
