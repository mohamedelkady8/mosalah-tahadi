'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { CheckIcon, RefreshIcon, StarIcon, TrophyIcon, XIcon } from '@/components/ui/icons';
import { durationText, num, percent } from '@/lib/format';
import type { ScoreResult } from '@/lib/games/types';

export interface Outcome {
  result: ScoreResult;
  durationMs: number;
  saved: boolean;
  note?: string;
  error?: string;
  best?: number | null;
  points?: number | null;
}

export function starsFor(p: number): number {
  if (p >= 90) return 3;
  if (p >= 70) return 2;
  if (p >= 40) return 1;
  return 0;
}

const TITLES = ['ولا يهمك، جرّب تاني', 'مش بطال، تقدر أحسن', 'شغل حلو!', 'عاش يا بطل!'];
const CONFETTI_COLORS = ['#E8C46F', '#7A2A3A', '#F4E6CF', '#2F8F5B', '#1F6FB5', '#FFF6E8'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="gm-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function ResultView({
  outcome,
  mode,
  canReplay,
  replayNote,
  onReplay,
  onRetrySave,
  backHref,
  backLabel,
  onClose,
}: {
  outcome: Outcome;
  mode: 'play' | 'preview' | 'practice' | 'daily';
  canReplay: boolean;
  replayNote?: string;
  onReplay: () => void;
  onRetrySave?: () => void;
  backHref?: string;
  backLabel: string;
  onClose?: () => void;
}) {
  const { result } = outcome;
  const p = percent(result.score, result.maxScore);
  const stars = starsFor(p);
  const wrongCount = result.review.filter((r) => !r.correct).length;
  const [onlyWrong, setOnlyWrong] = useState(false);
  const review = onlyWrong ? result.review.filter((r) => !r.correct) : result.review;

  return (
    <div className="gm-board">
      {stars === 3 && <Confetti />}
      <div className="gm-result">
        <div className="gm-score a-pop" style={{ '--p': p } as CSSProperties}>
          <div>
            <strong>{num(p)}٪</strong>
            <span>
              {num(result.score)} من {num(result.maxScore)} نقطة
            </span>
          </div>
        </div>
        <div className="gm-stars" aria-label={`${num(stars)} من ٣ نجوم`}>
          {[1, 2, 3].map((i) => (
            <StarIcon key={i} filled={i <= stars} className={i <= stars ? 'a-pop' : 'off'} style={{ animationDelay: `${0.2 + i * 0.15}s` }} />
          ))}
        </div>
        <h2>{TITLES[stars]}</h2>
        <p className="sum">
          {result.summary ?? `جاوبت ${num(result.correctCount)} من ${num(result.totalCount)} صح`}
        </p>
        {result.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="gm-result-pic a-pop" src={result.picture} alt="الصورة بعد ما اتركّبت" />
        )}

        <div className="gm-kpis">
          <div className="gm-kpi">
            <b>{durationText(outcome.durationMs)}</b>
            <span>الوقت</span>
          </div>
          {outcome.saved && outcome.best != null && (
            <div className="gm-kpi">
              <b>
                {num(outcome.best)}/{num(result.maxScore)}
              </b>
              <span>أحسن نتيجة ليك</span>
            </div>
          )}
          {outcome.saved && outcome.points != null && (
            <div className="gm-kpi">
              <b>{num(outcome.points)}</b>
              <span>مجموع نقطك</span>
            </div>
          )}
        </div>

        {outcome.saved && <div className="form-ok">نتيجتك اتحفظت، وأحسن نتيجة ليك هي اللي بتتحسب في النقط.</div>}
        {outcome.note && <div className="notice form-ok" style={{ margin: 0 }}>{outcome.note}</div>}
        {outcome.error && (
          <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {outcome.error}
            {onRetrySave && (
              <button type="button" className="btn btn-ink btn-sm" onClick={onRetrySave}>
                حاول تحفظ تاني
              </button>
            )}
          </div>
        )}
        {mode === 'preview' && <div className="badge badge-blue">دي معاينة، النتيجة مش بتتحفظ</div>}
        {mode === 'practice' && (
          <div className="gm-how" style={{ alignItems: 'center' }}>
            <span>دي لعبة تجريبية. اعمل حساب عشان نتيجتك تتحفظ وتدخل لوحة الشرف.</span>
            <Link href="/signup" className="btn btn-wine btn-sm">
              اعمل حساب
            </Link>
          </div>
        )}

        <div className="gm-actions" style={{ justifyContent: 'center' }}>
          {canReplay && (
            <button type="button" className="btn btn-gold" onClick={onReplay}>
              <RefreshIcon size={18} /> العب تاني
            </button>
          )}
          {onClose ? (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {backLabel}
            </button>
          ) : (
            backHref && (
              <Link href={backHref} className="btn btn-ghost">
                {backLabel}
              </Link>
            )
          )}
          {mode === 'play' && (
            <Link href="/leaderboard" className="btn btn-ghost">
              <TrophyIcon size={18} /> لوحة الشرف
            </Link>
          )}
        </div>
        {replayNote && <p className="muted" style={{ margin: 0 }}>{replayNote}</p>}

        {result.review.length > 0 && (
          <div className="gm-review">
            <div className="gm-review-head">
              <h3>المراجعة</h3>
              {wrongCount > 0 && wrongCount < result.review.length && (
                <div className="tabs" role="tablist">
                  <button type="button" className={onlyWrong ? '' : 'on'} onClick={() => setOnlyWrong(false)}>
                    الكل
                  </button>
                  <button type="button" className={onlyWrong ? 'on' : ''} onClick={() => setOnlyWrong(true)}>
                    الغلط بس ({num(wrongCount)})
                  </button>
                </div>
              )}
            </div>
            {review.map((r, i) => (
              <div key={i} className={`gm-rv ${r.correct ? 'ok' : 'bad'}`}>
                <span className="ic">{r.correct ? <CheckIcon size={16} /> : <XIcon size={16} />}</span>
                <div>
                  <div className="q">{r.prompt}</div>
                  {r.given !== undefined && (
                    <div className="a">
                      إجابتك: <b>{r.given}</b>
                    </div>
                  )}
                  {!r.correct && r.expected !== undefined && (
                    <div className="a">
                      الصح: <b>{r.expected}</b>
                    </div>
                  )}
                  {r.explanation && <div className="ex">{r.explanation}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
