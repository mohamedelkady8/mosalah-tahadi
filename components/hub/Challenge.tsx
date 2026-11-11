'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Highlighted, OPTION_LETTERS, optionKey, RichText, TimerRing, useCountdown, WhyText } from '@/components/games/parts';
import { Confetti } from '@/components/games/ResultView';
import type { PlayableGame } from '@/components/games/types';
import { CalendarIcon, CheckIcon, ChevronEnd, ClockIcon, FacebookIcon, GiftIcon, LockIcon, RefreshIcon, XIcon } from '@/components/ui/icons';
import { submitAttempt } from '@/lib/actions/play';
import { countLabel, num, percent } from '@/lib/format';
import { mcqContent, pickProblem, type McqQuestion } from '@/lib/games/defs/mcq';
import { shuffle } from '@/lib/games/random';
import { parseSettings } from '@/lib/games/settings';
import { FACEBOOK_GROUP } from '@/lib/sections';
import { ShareButton } from './ShareButton';

type Phase = 'intro' | 'play' | 'saving' | 'result';
type Round = { q: McqQuestion; opts: number[] }[];

const questionsLabel = (n: number) => countLabel(n, { one: 'سؤال واحد', two: 'سؤالين', few: 'أسئلة', many: 'سؤال' });
const timesLabel = (n: number) => countLabel(n, { one: 'مرة واحدة', two: 'مرتين', few: 'مرات', many: 'مرة' });

function verdictFor(correct: number, total: number, contest: boolean): string {
  if (correct === total) return contest ? 'الدرجة النهائية! برافو عليك' : 'الدرجة النهائية، وع السريع كمان!';
  if (correct >= total - 1) return 'ممتاز، قربت جدًا';
  if (correct >= total / 2) return 'كويس، بس راجع غلطاتك';
  return 'محتاج تراجع المحاضرة تاني';
}

export interface ChallengeProps {
  game: PlayableGame;
  variant: 'quick' | 'contest';
  /** An admin trying it out: nothing is saved and there's no attempt limit. */
  preview?: boolean;
  /** Big title on the start card: "ع السريع" or the contest's name. */
  heading: string;
  /** Who it's for, e.g. "طلاب تانية بكالوريا". */
  audience?: string;
  dateLabel?: string;
  prize?: string | null;
  /** Shown under the start button of a live contest, e.g. a countdown to its end. */
  extra?: ReactNode;
  attemptsUsed?: number;
  best?: { score: number; max: number } | null;
  /** Where a finished contest sends the student to see the ranking. */
  doneHref?: string;
  onClose?: () => void;
}

/** «ع السريع»: one question at a time with a timer, an explanation for every option, then a result with your weak spots. */
export function Challenge({ game, variant, preview = false, heading, audience, dateLabel, prize, extra, attemptsUsed = 0, best = null, doneHref, onClose }: ChallengeProps) {
  const settings = useMemo(() => parseSettings(game.settings, 'mcq'), [game.settings]);
  const parsed = useMemo(() => mcqContent.safeParse(game.content), [game.content]);
  const questions = parsed.success ? parsed.data.questions : [];
  const total = questions.length;
  const limit = settings.questionTimeSec;
  const contest = variant === 'contest';
  const allowed = contest ? 1 : settings.attemptsAllowed;

  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState<Round>([]);
  const [roundNo, setRoundNo] = useState(0);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>([]);
  const [used, setUsed] = useState(attemptsUsed);
  const [bestScore, setBestScore] = useState(best);
  const [save, setSave] = useState<{ saved: boolean; note?: string; error?: string; retry?: boolean } | null>(null);
  const startedAt = useRef(0);
  const lockedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const attemptsLeft = !preview && allowed > 0 ? Math.max(0, allowed - used) : null;
  const canPlay = total > 0 && (attemptsLeft === null || attemptsLeft > 0);
  const hasWhys = questions.some((q) => q.whys.some(Boolean));
  const hasExplanations = settings.showExplanations && questions.some((q) => q.whys.some(Boolean) || q.explanation);

  const current = round[idx];
  const locked = picks.length > idx;
  const picked = locked ? picks[idx] : null;
  const correctSoFar = picks.reduce<number>((n, p, i) => (round[i] && p === round[i].q.correct ? n + 1 : n), 0);

  const left = useCountdown(limit, phase === 'play' && !locked, `${roundNo}-${idx}`, () => lock(null));

  function scrollTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = cardRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }

  function start() {
    if (!canPlay) return;
    const order = settings.shuffle ? shuffle(questions) : questions;
    setRound(order.map((q) => ({ q, opts: settings.shuffle ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i) })));
    setRoundNo((r) => r + 1);
    setIdx(0);
    setPicks([]);
    setSave(null);
    lockedRef.current = false;
    startedAt.current = Date.now();
    setPhase('play');
    requestAnimationFrame(scrollTop);
  }

  function lock(choice: number | null) {
    if (lockedRef.current || phase !== 'play') return;
    lockedRef.current = true;
    setPicks((p) => (p.length > idx ? p : [...p.slice(0, idx), choice]));
  }

  async function submit(answers: { id: string; choice: number | null }[], durationMs: number) {
    setPhase('saving');
    try {
      const res = await submitAttempt({ gameId: game.id, answers: { answers }, durationMs });
      if (res.ok) {
        setSave({ saved: res.saved, note: res.note });
        if (res.saved) {
          setUsed(res.attemptsUsed);
          setBestScore({ score: res.best, max: res.result.maxScore });
        }
      } else {
        setSave({ saved: false, error: res.error, retry: res.retry });
        if (res.attemptsUsed !== undefined) setUsed(res.attemptsUsed);
      }
    } catch {
      setSave({ saved: false, error: 'النت فصل واحنا بنحفظ النتيجة.', retry: true });
    }
    setPhase('result');
  }

  function next() {
    if (!locked) return;
    if (idx < round.length - 1) {
      lockedRef.current = false;
      setIdx(idx + 1);
      requestAnimationFrame(scrollTop);
      return;
    }
    const answers = round.map((r, i) => ({ id: r.q.id, choice: picks[i] ?? null }));
    const durationMs = Date.now() - startedAt.current;
    requestAnimationFrame(scrollTop);
    if (preview) {
      setSave({ saved: false, note: 'دي معاينة، النتيجة مش بتتحفظ.' });
      setPhase('result');
    } else {
      void submit(answers, durationMs);
    }
  }

  useEffect(() => {
    if (phase !== 'play') return;
    function onKey(e: KeyboardEvent) {
      if (lockedRef.current || !current) return;
      const n = optionKey(e);
      if (n && n <= current.opts.length) lock(current.opts[n - 1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!parsed.success || !total) {
    return (
      <div className="qz-card qz-empty">
        <XIcon size={30} />
        <h3>التحدي ده مش جاهز</h3>
        <p>فيه مشكلة في أسئلته. لو إنت الأدمن، افتحه من لوحة التحكم وظبّطه.</p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div ref={cardRef} className={`qz-card qz-intro a-fadeup${contest ? ' is-contest' : ''}`}>
        {preview && <div className="gm-banner">{contest ? 'معاينة: جرّبها كأنك طالب، النتيجة مش هتتحفظ' : 'معاينة: جرّبه كأنك طالب، النتيجة مش هتتحفظ'}</div>}
        <div className="qz-hero" aria-hidden="true">
          {game.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.cover_url} alt="" className="qz-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/assets/mr-salah.webp" alt="" className="qz-teacher" />
          )}
        </div>
        <span className="qz-kicker">{contest ? 'مسابقة' : 'تحدّي'}</span>
        <h1 className="qz-title">
          {heading}
          <svg aria-hidden="true" viewBox="0 0 220 14" preserveAspectRatio="none" className="qz-doodle">
            <path d="M216 8 C 190 3, 160 1, 120 6 C 80 11, 40 3, 4 9" pathLength={100} />
          </svg>
        </h1>
        {heading !== game.title && <p className="qz-topic">{game.title}</p>}
        <div className="qz-vs">
          <span className="qz-team">تيم حمثلاح</span>
          <span className="qz-vs-k">VS</span>
          <span className="qz-them">{audience || 'الطلاب'}</span>
        </div>
        {dateLabel && (
          <span className="qz-date">
            <CalendarIcon size={16} /> {dateLabel}
          </span>
        )}
        {prize && (
          <span className="qz-prize">
            <GiftIcon size={18} /> الجايزة: {prize}
          </span>
        )}
        <ul className="qz-meta">
          <li>{questionsLabel(total)}</li>
          {limit > 0 && (
            <li>
              <ClockIcon size={16} /> <b>{num(limit)}</b> ثانية للسؤال
            </li>
          )}
          {hasExplanations && <li>{hasWhys ? 'شرح لكل اختيار' : 'شرح بعد كل سؤال'}</li>}
          {contest && <li>محاولة واحدة بس</li>}
        </ul>
        {game.description && <p className="qz-desc">{game.description}</p>}
        {contest && <p className="qz-rule">الترتيب بالدرجة، ولو اتعادلتوا الأسرع هو اللي يكسب. أول محاولة بس هي اللي بتتحسب.</p>}
        {bestScore && !contest && (
          <span className="badge badge-ok">
            أحسن نتيجة ليك قبل كده: {num(Math.round((bestScore.score / Math.max(1, bestScore.max)) * total))}/{num(total)}
          </span>
        )}
        {canPlay ? (
          <button type="button" className="btn btn-gold btn-lg qz-start" onClick={start} autoFocus>
            {contest ? 'ابدأ المسابقة' : 'ابدأ التحدي'}
          </button>
        ) : (
          <span className="btn btn-ghost btn-lg qz-start" aria-disabled="true">
            <LockIcon size={18} /> {contest ? 'إنت شاركت خلاص' : 'خلصت المحاولات المسموحة'}
          </span>
        )}
        {attemptsLeft !== null && attemptsLeft > 0 && !contest && <span className="muted">فاضلك {timesLabel(attemptsLeft)}.</span>}
        {extra}
        {onClose ? (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            قفل المعاينة
          </button>
        ) : (
          <a className="qz-group" href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer">
            <FacebookIcon size={22} /> انضم للجروب الرسمي
          </a>
        )}
      </div>
    );
  }

  if (phase === 'play' && current) {
    const { q, opts } = current;
    const ok = locked && picked === q.correct;
    const letter = (oi: number) => OPTION_LETTERS[opts.indexOf(oi)];
    const problem = locked ? pickProblem(q, picked) : null;
    const pickedWhy = locked && picked !== null && !ok ? q.whys[picked] : '';
    const correctWhy = q.whys[q.correct] || q.explanation;
    const last = idx === round.length - 1;
    return (
      <div ref={cardRef} className="qz-card qz-play" key={`${roundNo}-${idx}`}>
        <div className="qz-top">
          <span className="qz-count">
            السؤال <b>{num(idx + 1)}</b> من {num(round.length)}
          </span>
          {limit > 0 && <TimerRing left={left} total={limit} />}
          <span className="qz-score">
            درجتك <b>{num(correctSoFar)}</b>/{num(round.length)}
          </span>
        </div>
        <div className="qz-steps" aria-hidden="true">
          {round.map((r, i) => (
            <span key={r.q.id} className={i < picks.length ? (picks[i] === r.q.correct ? 'ok' : 'bad') : i === idx ? 'on' : undefined} />
          ))}
        </div>
        {q.passage && (
          <blockquote className="qz-passage">
            <RichText text={q.passage} />
          </blockquote>
        )}
        {q.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="gm-qimg" src={q.image} alt="" />
        )}
        <h2 className="qz-q">
          <Highlighted text={q.prompt} />
        </h2>
        <div className="qz-opts">
          {opts.map((oi, k) => {
            let cls = 'qz-opt';
            if (locked) {
              if (oi === q.correct) cls += ' ok';
              else if (oi === picked) cls += ' bad a-shake';
              else cls += ' dim';
            }
            return (
              <button key={oi} type="button" className={cls} disabled={locked} onClick={() => lock(oi)}>
                <span className="k">{OPTION_LETTERS[k]}</span>
                <span className="t">{q.options[oi]}</span>
                {locked && oi === q.correct && <CheckIcon className="mark" size={22} />}
                {locked && oi === picked && oi !== q.correct && <XIcon className="mark" size={22} />}
              </button>
            );
          })}
        </div>
        {locked && (
          <div className="qz-feedback a-pop" role="status">
            <div className={`qz-verdict ${ok ? 'ok' : picked === null ? 'late' : 'bad'}`}>
              {ok ? <CheckIcon size={20} /> : picked === null ? <ClockIcon size={20} /> : <XIcon size={20} />}
              {ok ? 'برافو، إجابة صح!' : picked === null ? `خلص الوقت! الإجابة الصح كانت (${letter(q.correct)})` : `إجابة غلط، الصح كانت (${letter(q.correct)})`}
            </div>
            {problem && <span className="why-problem">مشكلتك: {problem}</span>}
            {settings.showExplanations && (pickedWhy || correctWhy) && (
              <div className="qz-whys">
                {pickedWhy && (
                  <p className="qz-why bad">
                    <b className="qz-why-k">({letter(picked!)})</b> <WhyText text={pickedWhy} hideProblem={Boolean(problem)} />
                  </p>
                )}
                {correctWhy && (
                  <p className="qz-why ok">
                    {q.whys[q.correct] && <b className="qz-why-k">({letter(q.correct)})</b>} <WhyText text={correctWhy} />
                  </p>
                )}
              </div>
            )}
            <button type="button" className="btn btn-ink btn-lg qz-next" onClick={next} autoFocus>
              {last ? 'شوف نتيجتك' : 'السؤال اللي بعده'} <ChevronEnd size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'saving') {
    return (
      <div ref={cardRef} className="qz-card qz-empty">
        <span className="spinner" />
        <h3>بنحسب نتيجتك...</h3>
      </div>
    );
  }

  const results = round.map((r, i) => ({ ...r, choice: picks[i] ?? null }));
  const correct = results.filter((r) => r.choice === r.q.correct).length;
  const timedOut = results.filter((r) => r.choice === null).length;
  const wrong = results.length - correct - timedOut;
  const p = percent(correct, results.length);
  const problems = new Map<string, number>();
  for (const r of results) {
    const prob = pickProblem(r.q, r.choice);
    if (prob) problems.set(prob, (problems.get(prob) ?? 0) + 1);
  }
  const problemList = [...problems.entries()].sort((a, b) => b[1] - a[1]);
  const canRetry = preview || (!contest && (attemptsLeft === null || attemptsLeft > 0));

  return (
    <div ref={cardRef} className="qz-card qz-result a-fadeup">
      {correct === results.length && <Confetti />}
      <div className="qz-ring" style={{ '--p': p } as CSSProperties}>
        <div>
          <b>
            {num(correct)}/{num(results.length)}
          </b>
          <small>{num(p)}٪</small>
        </div>
      </div>
      <h2 className="qz-msg">{verdictFor(correct, results.length, contest)}</h2>
      <div className="qz-kpis">
        <span className="ok">
          <b>{num(correct)}</b> صح
        </span>
        <span className="bad">
          <b>{num(wrong)}</b> غلط
        </span>
        <span className="late">
          <b>{num(timedOut)}</b> خلص وقتها
        </span>
      </div>

      {save?.saved && <div className="form-ok">{contest ? 'إجابتك اتسجلت في المسابقة.' : 'نتيجتك اتحفظت، وأحسن نتيجة ليك هي اللي بتتحسب في النقط.'}</div>}
      {save?.note && <div className="form-ok">{save.note}</div>}
      {save?.error && (
        <div className="form-error qz-save-error">
          {save.error}
          {save.retry && (
            <button
              type="button"
              className="btn btn-ink btn-sm"
              onClick={() => void submit(results.map((r) => ({ id: r.q.id, choice: r.choice })), Date.now() - startedAt.current)}
            >
              حاول تحفظ تاني
            </button>
          )}
        </div>
      )}

      {problemList.length > 0 && (
        <section className="qz-problems" aria-labelledby="qz-problems-title">
          <h3 id="qz-problems-title">مشاكلك في {contest ? 'المسابقة دي' : 'التحدي ده'}</h3>
          <ul>
            {problemList.map(([prob, count]) => (
              <li key={prob}>
                <span>{prob}</span>
                <b>{timesLabel(count)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="qz-review">
        <summary>راجع إجاباتك</summary>
        <ol>
          {results.map((r) => {
            const ok = r.choice === r.q.correct;
            const letter = (oi: number) => OPTION_LETTERS[r.opts.indexOf(oi)];
            const why = r.choice !== null && !ok ? r.q.whys[r.choice] : '';
            return (
              <li key={r.q.id} className={ok ? 'ok' : 'bad'}>
                <span className="qz-rv-ic">{ok ? <CheckIcon size={16} /> : <XIcon size={16} />}</span>
                <div>
                  {r.q.passage && (
                    <p className="qz-rv-passage">
                      <RichText text={r.q.passage} />
                    </p>
                  )}
                  <p className="qz-rv-q">
                    <Highlighted text={r.q.prompt} />
                  </p>
                  <p className="qz-rv-a">
                    إجابتك: <b>{r.choice === null ? 'خلص الوقت' : `(${letter(r.choice)}) ${r.q.options[r.choice]}`}</b>
                  </p>
                  {!ok && (
                    <p className="qz-rv-a">
                      الصح: <b>({letter(r.q.correct)}) {r.q.options[r.q.correct]}</b>
                    </p>
                  )}
                  {why && (
                    <p className="qz-why bad">
                      <WhyText text={why} />
                    </p>
                  )}
                  {(r.q.whys[r.q.correct] || r.q.explanation) && (
                    <p className="qz-why ok">
                      <WhyText text={r.q.whys[r.q.correct] || r.q.explanation} />
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </details>

      {!preview && (
        <div className="qz-fb">
          <FacebookIcon size={34} />
          <div>
            <b>صوّر نتيجتك وابعتها على الجروب الرسمي</b>
            <span>ورّي التيم وصحابك وصلت لفين.</span>
          </div>
          <a href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer" className="btn btn-sm qz-fb-btn">
            افتح الجروب
          </a>
        </div>
      )}

      <div className="qz-actions">
        {canRetry && (
          <button type="button" className="btn btn-gold" onClick={start}>
            <RefreshIcon size={18} /> {contest ? 'جرّبها تاني' : 'أعد التحدي'}
          </button>
        )}
        {contest && doneHref && (
          <Link href={doneHref} className="btn btn-gold">
            شوف ترتيبك
          </Link>
        )}
        {!preview && (
          <ShareButton text={`جبت ${num(correct)}/${num(results.length)} في ${contest ? `مسابقة «${heading}»` : 'تحدي «ع السريع»'} مع تيم حمثلاح`} label="شارك نتيجتك" />
        )}
        {onClose && (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            قفل المعاينة
          </button>
        )}
      </div>
      {!canRetry && !contest && attemptsLeft === 0 && <p className="muted">خلصت عدد المحاولات المسموحة للتحدي ده.</p>}
    </div>
  );
}
