import { TrophyIcon } from '@/components/ui/icons';
import { durationText, num } from '@/lib/format';
import type { RankingRow } from '@/lib/hub';

const shortName = (full: string) => full.trim().split(/\s+/).slice(0, 2).join(' ');

/** Top of a contest: podium for the first three, then the list. Your own row shows even when you're further down. */
export function ContestRanking({ rows, meId, live }: { rows: RankingRow[]; meId: string; live: boolean }) {
  if (!rows.length) {
    return (
      <section className="lb-board ct-board" aria-label="الترتيب">
        <div className="lb-empty">
          <TrophyIcon size={40} />
          <h3>لسه محدش شارك</h3>
          <p>{live ? 'أول ما حد يخلّص هيظهر هنا.' : 'المسابقة خلصت من غير مشاركات.'}</p>
        </div>
      </section>
    );
  }
  const podium = rows.filter((r) => r.rank <= 3).slice(0, 3);
  const rest = rows.filter((r) => !podium.includes(r));
  const order = [podium[1], podium[0], podium[2]];
  const total = rows[0].participants;

  return (
    <section className="lb-board ct-board a-fadeup" aria-label="الترتيب">
      <p className="ct-board-k">
        {live ? 'الترتيب لحد دلوقتي' : 'الترتيب النهائي'} · {num(total)} {total === 1 ? 'مشارك' : total === 2 ? 'مشاركين' : 'مشارك'}
      </p>
      <ol className="lb-podium" aria-label="المراكز الأولى">
        {order.map((r, i) =>
          r ? (
            <li key={r.user_id} className={`lb-step r${Math.min(r.rank, 3)}${r.user_id === meId ? ' me' : ''}`} style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
              <span className="av" aria-hidden="true">
                {r.full_name.trim().slice(0, 1)}
              </span>
              <span className="name">{r.user_id === meId ? 'إنت' : shortName(r.full_name)}</span>
              <span className="block">
                <b>{num(r.rank)}</b>
                <small>
                  {num(r.score)}/{num(r.max_score)}
                </small>
              </span>
            </li>
          ) : (
            <li key={`empty-${i}`} className="lb-step ghost" aria-hidden="true" />
          ),
        )}
      </ol>
      {rest.length > 0 && (
        <ol className="lb-list">
          {rest.flatMap((r, i) => {
            const mine = r.user_id === meId;
            const row = (
              <li key={r.user_id} className={`lb-row${mine ? ' me' : ''}`}>
                <span className="rk">{num(r.rank)}</span>
                <span className="nm">
                  {mine ? `إنت (${shortName(r.full_name)})` : shortName(r.full_name)}
                  <small>في {durationText(r.duration_ms)}</small>
                </span>
                <span className="pts">
                  {num(r.score)}/{num(r.max_score)}
                </span>
              </li>
            );
            const prev = i > 0 ? rest[i - 1] : podium[podium.length - 1];
            const gap = mine && prev && r.rank > prev.rank + 1;
            return gap ? [<li key="gap" className="lb-gap" aria-hidden="true">…</li>, row] : [row];
          })}
        </ol>
      )}
      <p className="ct-board-note">الترتيب بالدرجة، ولو اتعادلتوا الأسرع هو اللي قدّام. أول محاولة بس هي اللي بتتحسب.</p>
    </section>
  );
}
