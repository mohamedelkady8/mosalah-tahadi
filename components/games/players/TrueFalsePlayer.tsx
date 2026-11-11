'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, XIcon } from '@/components/ui/icons';
import { tfLabel, type TfAnswers, type TfContent } from '@/lib/games/defs/trueFalse';
import { shuffle } from '@/lib/games/random';
import { digitKey, Feedback, Highlighted, StepHead, Streak, TimerBar, useCountdown } from '../parts';
import type { PlayerProps } from '../types';

export default function TrueFalsePlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<TfContent, TfAnswers>) {
  const [order] = useState(() => (settings.shuffle ? shuffle(content.statements) : content.statements));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const answers = useRef<TfAnswers['answers']>([]);
  const lockedRef = useRef(false);
  const s = order[idx];
  const last = idx === order.length - 1;
  const limit = settings.questionTimeSec;
  const showExplanation = settings.showExplanations && Boolean(s.explanation);

  function lock(value: boolean | null) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setPicked(value);
    setLocked(true);
    answers.current.push({ id: s.id, value });
    setStreak((n) => (value === s.answer ? n + 1 : 0));
    onProgress?.(idx + 1, order.length);
  }

  function next() {
    if (last) {
      onFinish({ answers: answers.current });
      return;
    }
    lockedRef.current = false;
    setIdx((i) => i + 1);
    setPicked(null);
    setLocked(false);
  }

  const left = useCountdown(limit, !locked, idx, () => lock(null));

  useEffect(() => {
    if (!locked || picked !== s.answer || showExplanation) return;
    const t = setTimeout(next, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  useEffect(() => {
    if (timeUp) onFinish({ answers: answers.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = digitKey(e);
      if (!lockedRef.current && (n === 1 || n === 2)) lock(n === 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ok = picked === s.answer;
  const autoNext = locked && ok && !showExplanation;

  return (
    <div className="gm-board">
      <StepHead index={idx} total={order.length} label="جملة">
        <Streak count={streak} />
      </StepHead>
      {limit > 0 && <TimerBar left={left} total={limit} />}
      <div className="gm-tf-card a-fade" key={s.id}>
        <Highlighted text={s.text} />
      </div>
      <div className="gm-tf">
        {[true, false].map((v) => {
          const cls = [v ? 'yes' : 'no', locked && picked === v ? 'picked' : '', locked && v !== s.answer ? 'dim' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button key={String(v)} type="button" className={cls} disabled={locked} onClick={() => lock(v)}>
              {v ? <CheckIcon size={30} /> : <XIcon size={30} />}
              {tfLabel(v)}
            </button>
          );
        })}
      </div>
      {locked && (
        <Feedback
          ok={ok}
          title={ok ? 'برافو عليك!' : picked === null ? 'الوقت خلص!' : 'لأ، مش كده'}
          onNext={autoNext ? undefined : next}
          last={last}
        >
          {!ok && (
            <p>
              الجملة دي <b>{tfLabel(s.answer)}</b>.
            </p>
          )}
          {showExplanation && <p>{s.explanation}</p>}
        </Feedback>
      )}
    </div>
  );
}
