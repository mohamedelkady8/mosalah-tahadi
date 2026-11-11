'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, XIcon } from '@/components/ui/icons';
import type { McqAnswers, McqContent } from '@/lib/games/defs/mcq';
import { shuffle } from '@/lib/games/random';
import { digitKey, Feedback, Highlighted, StepHead, Streak, TimerRing, useCountdown } from '../parts';
import type { PlayerProps } from '../types';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export default function McqPlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<McqContent, McqAnswers>) {
  const [order] = useState(() =>
    (settings.shuffle ? shuffle(content.questions) : content.questions).map((q) => ({
      q,
      opts: settings.shuffle ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i),
    })),
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const answers = useRef<McqAnswers['answers']>([]);
  const lockedRef = useRef(false);
  const { q, opts } = order[idx];
  const last = idx === order.length - 1;
  const limit = settings.questionTimeSec;

  function lock(choice: number | null) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setPicked(choice);
    setLocked(true);
    answers.current.push({ id: q.id, choice });
    setStreak((s) => (choice === q.correct ? s + 1 : 0));
    onProgress?.(idx + 1, order.length);
  }

  function next() {
    if (last) {
      onFinish({ answers: answers.current });
      return;
    }
    lockedRef.current = false;
    setIdx(idx + 1);
    setPicked(null);
    setLocked(false);
  }

  const left = useCountdown(limit, !locked, idx, () => lock(null));

  useEffect(() => {
    if (timeUp) onFinish({ answers: answers.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = digitKey(e);
      if (n && !lockedRef.current && n <= opts.length) lock(opts[n - 1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ok = picked === q.correct;

  return (
    <div className="gm-board">
      <StepHead index={idx} total={order.length} label="سؤال">
        <Streak count={streak} />
        {limit > 0 && <TimerRing left={left} total={limit} />}
      </StepHead>
      {q.image && <img className="gm-qimg" src={q.image} alt="" />}
      <h2 className="gm-prompt">
        <Highlighted text={q.prompt} />
      </h2>
      <div className="gm-options">
        {opts.map((oi, k) => {
          let cls = 'gm-opt';
          if (locked) {
            if (oi === q.correct) cls += ' ok';
            else if (oi === picked) cls += ' bad a-shake';
            else cls += ' dim';
          }
          return (
            <button key={oi} type="button" className={cls} disabled={locked} onClick={() => lock(oi)}>
              <span className="k">{LETTERS[k]}</span>
              <span>{q.options[oi]}</span>
              {locked && oi === q.correct && <CheckIcon className="mark" size={22} />}
              {locked && oi === picked && oi !== q.correct && <XIcon className="mark" size={22} />}
            </button>
          );
        })}
      </div>
      {locked && (
        <Feedback ok={ok} title={ok ? 'إجابة صح!' : picked === null ? 'الوقت خلص!' : 'إجابة غلط'} onNext={next} last={last}>
          {!ok && (
            <p>
              الإجابة الصح: <b>{q.options[q.correct]}</b>
            </p>
          )}
          {settings.showExplanations && q.explanation && <p>{q.explanation}</p>}
        </Feedback>
      )}
    </div>
  );
}
