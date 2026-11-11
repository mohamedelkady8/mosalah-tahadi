'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClockIcon, GameTypeIcon, LockIcon, XIcon } from '@/components/ui/icons';
import { submitAttempt } from '@/lib/actions/play';
import { clock, countLabel, DIFFICULTY_LABELS, durationText, num } from '@/lib/format';
import { getDef, itemsLabel } from '@/lib/games/registry';
import { parseSettings } from '@/lib/games/settings';
import type { ScoreResult } from '@/lib/games/types';
import { PLAYERS, preloadPlayer } from './players';
import { ResultView, type Outcome } from './ResultView';
import type { PlayableGame } from './types';

type Phase = 'intro' | 'playing' | 'saving' | 'result';

const attemptsText = (n: number) => countLabel(n, { one: 'محاولة واحدة', two: 'محاولتين', few: 'محاولات', many: 'محاولة' });

export interface PlayStats {
  attemptsUsed: number;
  best: number | null;
  /** Admins can always replay. */
  unlimited?: boolean;
}

export default function GameShell({
  game,
  mode,
  backHref,
  backLabel = 'ألعاب تانية',
  stats,
  onClose,
}: {
  game: PlayableGame;
  mode: 'play' | 'preview' | 'practice';
  backHref?: string;
  backLabel?: string;
  stats?: PlayStats;
  onClose?: () => void;
}) {
  const def = getDef(game.type);
  const settings = useMemo(() => parseSettings(game.settings, game.type), [game.settings, game.type]);
  const parsed = useMemo(() => def.contentSchema.safeParse(game.content), [def, game.content]);
  const Player = PLAYERS[game.type];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(settings.timeLimitSec);
  const [timeUp, setTimeUp] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, setPending] = useState<{ answers: unknown; durationMs: number; local: ScoreResult } | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(stats?.attemptsUsed ?? 0);
  const [best, setBest] = useState<number | null>(stats?.best ?? null);
  const startedAt = useRef(0);
  const finishing = useRef(false);
  const total = parsed.success ? def.itemCount(parsed.data) : game.item_count;

  const limited = mode === 'play' && !stats?.unlimited && settings.attemptsAllowed > 0;
  const attemptsLeft = limited ? Math.max(0, settings.attemptsAllowed - attemptsUsed) : null;
  const canPlay = attemptsLeft === null || attemptsLeft > 0;

  // The player's code is a separate download; fetch it while the student reads the start screen.
  useEffect(() => {
    preloadPlayer(game.type);
  }, [game.type]);

  function start() {
    if (!canPlay) return;
    finishing.current = false;
    startedAt.current = Date.now();
    setTimeUp(false);
    setTimeLeft(settings.timeLimitSec);
    setProgress(0);
    setOutcome(null);
    setPending(null);
    setRound((r) => r + 1);
    setPhase('playing');
    if (!onClose) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (phase !== 'playing' || !settings.timeLimitSec) return;
    const end = startedAt.current + settings.timeLimitSec * 1000;
    const t = setInterval(() => {
      const l = Math.ceil((end - Date.now()) / 1000);
      setTimeLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(t);
        setTimeUp(true);
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase, round, settings.timeLimitSec]);

  async function save(answers: unknown, durationMs: number, local: ScoreResult) {
    setPhase('saving');
    try {
      const res = await submitAttempt({ gameId: game.id, answers, durationMs });
      if (res.ok) {
        setOutcome({ result: res.result, durationMs, saved: res.saved, note: res.note, best: res.best, points: res.points });
        setPending(null);
        if (res.saved) {
          setAttemptsUsed(res.attemptsUsed);
          setBest(res.best);
        }
      } else {
        setOutcome({ result: local, durationMs, saved: false, error: res.error });
        setPending(res.retry ? { answers, durationMs, local } : null);
        if (res.attemptsUsed !== undefined) setAttemptsUsed(res.attemptsUsed);
      }
    } catch {
      setOutcome({ result: local, durationMs, saved: false, error: 'النت فصل واحنا بنحفظ النتيجة.' });
      setPending({ answers, durationMs, local });
    }
    setPhase('result');
  }

  function finish(answers: unknown) {
    if (finishing.current || !parsed.success) return;
    finishing.current = true;
    const durationMs = Date.now() - startedAt.current;
    const checked = def.answersSchema.safeParse(answers);
    const local: ScoreResult = checked.success
      ? def.score(parsed.data, checked.data, settings)
      : { score: 0, maxScore: total * settings.pointsPerItem, correctCount: 0, totalCount: total, review: [] };
    if (mode === 'play') {
      void save(answers, durationMs, local);
    } else {
      setOutcome({ result: local, durationMs, saved: false });
      setPhase('result');
    }
  }

  if (!parsed.success) {
    return (
      <div className="gm-wrap">
        <div className="gm-board">
          <div className="empty">
            <div className="e-ic">
              <XIcon size={30} />
            </div>
            <h3>اللعبة دي مش جاهزة</h3>
            <p>فيه مشكلة في محتوى اللعبة. لو إنت الأدمن، افتحها من لوحة التحكم وظبّطها.</p>
          </div>
        </div>
      </div>
    );
  }

  const exit = onClose ? (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
      قفل
    </button>
  ) : (
    backHref && (
      <Link href={backHref} className="btn btn-ghost btn-sm">
        خروج
      </Link>
    )
  );

  return (
    <div className="gm-wrap">
      {phase === 'intro' && (
        <div className="gm-board a-fadeup">
          <div className="gm-intro">
            {mode === 'preview' && <div className="gm-banner">معاينة: العب كأنك طالب، النتيجة مش هتتحفظ</div>}
            {game.cover_url ? (
              <img className="gm-cover" src={game.cover_url} alt="" />
            ) : (
              <div className="gm-intro-ic">
                <GameTypeIcon type={game.type} />
              </div>
            )}
            <span className="badge badge-wine">{def.label}</span>
            <h1>{game.title}</h1>
            {game.description && <p className="desc">{game.description}</p>}
            <div className="gm-meta">
              <span className="badge">{itemsLabel(game.type, total)}</span>
              <span className="badge">{DIFFICULTY_LABELS[game.difficulty] ?? DIFFICULTY_LABELS[1]}</span>
              {game.topic && <span className="badge">{game.topic}</span>}
              {settings.timeLimitSec > 0 && (
                <span className="badge badge-gold">
                  <ClockIcon size={14} /> {durationText(settings.timeLimitSec * 1000)}
                </span>
              )}
              {def.usesQuestionTimer && settings.questionTimeSec > 0 && (
                <span className="badge badge-gold">
                  <ClockIcon size={14} /> {num(settings.questionTimeSec)} ثانية لكل سؤال
                </span>
              )}
              <span className="badge">
                {num(settings.pointsPerItem)} نقط لكل {def.pointsUnit ?? 'إجابة صح'}
              </span>
              {attemptsLeft !== null && (
                <span className={`badge ${attemptsLeft ? 'badge-blue' : 'badge-bad'}`}>
                  {attemptsLeft ? `فاضلك ${attemptsText(attemptsLeft)} من ${num(settings.attemptsAllowed)}` : 'خلصت محاولاتك'}
                </span>
              )}
              {mode === 'play' && best !== null && (
                <span className="badge badge-ok">
                  أحسن نتيجة ليك: {num(best)}/{num(total * settings.pointsPerItem)}
                </span>
              )}
            </div>
            <div className="gm-how">
              <GameTypeIcon type={game.type} size={22} style={{ flex: 'none', marginTop: 4 }} />
              <span>{def.howTo}</span>
            </div>
            {mode === 'practice' && <p className="muted">دي لعبة تجريبية، نتيجتها مش بتتحفظ.</p>}
            <div className="gm-actions" style={{ justifyContent: 'center', marginTop: 4 }}>
              {canPlay ? (
                <button type="button" className="btn btn-gold btn-lg" onClick={start} autoFocus>
                  يلا نبدأ
                </button>
              ) : (
                <span className="btn btn-ghost btn-lg" aria-disabled="true">
                  <LockIcon size={18} /> خلصت المحاولات المسموحة
                </span>
              )}
              {onClose ? (
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  قفل المعاينة
                </button>
              ) : (
                backHref && (
                  <Link href={backHref} className="btn btn-ghost">
                    {backLabel}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="gm-top">
            <span className="t">{game.title}</span>
            <span className="gm-chip">
              {num(progress)} / {num(total)}
            </span>
            {settings.timeLimitSec > 0 && (
              <span className={`gm-chip gm-timer${timeLeft <= 15 ? ' low' : ''}`} role="timer">
                <ClockIcon size={16} /> {clock(timeLeft)}
              </span>
            )}
            {exit}
          </div>
          {timeUp && <div className="gm-banner">الوقت خلص! بنجمع إجاباتك...</div>}
          <Player key={round} content={parsed.data} settings={settings} timeUp={timeUp} onFinish={finish} onProgress={(done) => setProgress(done)} />
        </>
      )}

      {phase === 'saving' && (
        <div className="gm-board">
          <div className="empty">
            <span className="spinner" />
            <h3>بنحسب نتيجتك...</h3>
          </div>
        </div>
      )}

      {phase === 'result' && outcome && (
        <ResultView
          outcome={outcome}
          mode={mode}
          canReplay={canPlay}
          replayNote={
            !canPlay ? 'خلصت عدد المحاولات المسموحة للعبة دي.' : attemptsLeft !== null ? `فاضلك ${attemptsText(attemptsLeft)}.` : undefined
          }
          onReplay={start}
          onRetrySave={pending ? () => void save(pending.answers, pending.durationMs, pending.local) : undefined}
          backHref={backHref}
          backLabel={onClose ? 'قفل المعاينة' : backLabel}
          onClose={onClose}
        />
      )}
    </div>
  );
}
