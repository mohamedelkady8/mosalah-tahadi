'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FillAnswers, FillContent, FillItem } from '@/lib/games/defs/fillBlank';
import { shuffle } from '@/lib/games/random';
import { normalizeAnswer, parseBlanks, type BlankPart } from '@/lib/games/text';
import { Feedback, StepHead } from '../parts';
import type { PlayerProps } from '../types';

type Blank = Extract<BlankPart, { kind: 'blank' }>;

interface Chip {
  id: string;
  text: string;
}

function bankFor(item: FillItem, distractors: string[], ignoreDiacritics: boolean): Chip[] {
  const blanks = parseBlanks(item.text).filter((p): p is Blank => p.kind === 'blank');
  const answers = blanks.map((b) => b.answers[0]);
  const taken = new Set(blanks.flatMap((b) => b.answers.map((a) => normalizeAnswer(a, ignoreDiacritics))));
  const extra = shuffle(distractors.filter((d) => !taken.has(normalizeAnswer(d, ignoreDiacritics)))).slice(0, Math.max(2, 4 - blanks.length));
  return shuffle([...answers, ...extra]).map((text, i) => ({ id: `c${i}`, text }));
}

export default function FillBlankPlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<FillContent, FillAnswers>) {
  const [order] = useState(() => (settings.shuffle ? shuffle(content.items) : content.items));
  const [idx, setIdx] = useState(0);
  const item = order[idx];
  const parts = useMemo(() => parseBlanks(item.text), [item.text]);
  const blanks = parts.filter((p): p is Blank => p.kind === 'blank');
  const bankMode = content.mode === 'bank';
  const [bank, setBank] = useState<Chip[]>(() => (bankMode ? bankFor(order[0], content.distractors, content.ignoreDiacritics) : []));
  const [values, setValues] = useState<string[]>(() => blanks.map(() => ''));
  const [chipOf, setChipOf] = useState<(string | null)[]>(() => blanks.map(() => null));
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<boolean[] | null>(null);
  const answers = useRef<FillAnswers['answers']>([]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const last = idx === order.length - 1;

  const isRight = (b: Blank, v: string) => {
    const n = normalizeAnswer(v, content.ignoreDiacritics);
    return n !== '' && b.answers.some((a) => normalizeAnswer(a, content.ignoreDiacritics) === n);
  };

  function check() {
    answers.current.push({ id: item.id, values });
    setResults(blanks.map((b, i) => isRight(b, values[i])));
    onProgress?.(idx + 1, order.length);
  }

  function next() {
    if (last) {
      onFinish({ answers: answers.current });
      return;
    }
    const n = idx + 1;
    const count = parseBlanks(order[n].text).filter((p) => p.kind === 'blank').length;
    setIdx(n);
    setValues(Array(count).fill(''));
    setChipOf(Array(count).fill(null));
    setActive(0);
    setResults(null);
    if (bankMode) setBank(bankFor(order[n], content.distractors, content.ignoreDiacritics));
  }

  function setValue(i: number, v: string) {
    setValues((vs) => vs.map((x, k) => (k === i ? v : x)));
  }

  function pickChip(chip: Chip) {
    const target = values[active] === '' ? active : values.findIndex((v) => v === '');
    const slot = target === -1 ? active : target;
    setValue(slot, chip.text);
    const nextChips = chipOf.map((c, k) => (k === slot ? chip.id : c));
    setChipOf(nextChips);
    const nextEmpty = values.findIndex((v, k) => k !== slot && v === '');
    if (nextEmpty !== -1) setActive(nextEmpty);
  }

  function clearBlank(i: number) {
    setValue(i, '');
    setChipOf((cs) => cs.map((c, k) => (k === i ? null : c)));
    setActive(i);
  }

  useEffect(() => {
    if (!bankMode && results === null) inputs.current[0]?.focus();
  }, [idx, bankMode, results]);

  useEffect(() => {
    if (!timeUp) return;
    const pending = results === null && values.some(Boolean) ? [...answers.current, { id: item.id, values }] : answers.current;
    onFinish({ answers: pending });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const done = results !== null;
  const ready = values.every((v) => v.trim() !== '');
  const allOk = done && results.every(Boolean);

  return (
    <div className="gm-board">
      <StepHead index={idx} total={order.length} label="جملة" />
      <p className="gm-fill">
        {parts.map((p, k) => {
          if (p.kind === 'text') return <Fragment key={k}>{p.text}</Fragment>;
          const i = p.index;
          const state = done ? (results[i] ? ' ok' : ' bad') : '';
          const fix = done && !results[i] ? <span className="gm-fix">{p.answers[0]}</span> : null;
          if (bankMode) {
            return (
              <Fragment key={k}>
                <button
                  type="button"
                  className={`gm-blank${values[i] ? ' filled' : ''}${!done && active === i ? ' active' : ''}${state}`}
                  disabled={done}
                  onClick={() => (values[i] ? clearBlank(i) : setActive(i))}
                  aria-label={`الفراغ ${i + 1}`}
                >
                  {values[i] || '\u00A0'}
                </button>
                {fix}
              </Fragment>
            );
          }
          return (
            <Fragment key={k}>
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                className={`gm-blank${state}`}
                value={values[i]}
                disabled={done}
                aria-label={`الفراغ ${i + 1}`}
                autoComplete="off"
                style={{ width: `${Math.max(7, values[i].length + 2)}ch` }}
                onChange={(e) => setValue(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (i + 1 < blanks.length) inputs.current[i + 1]?.focus();
                  else if (ready) check();
                }}
              />
              {fix}
            </Fragment>
          );
        })}
      </p>

      {bankMode && !done && (
        <div className="gm-wordbank">
          {bank.map((chip) => {
            const used = chipOf.includes(chip.id);
            return (
              <button key={chip.id} type="button" className={`gm-tile${used ? ' ghost' : ''}`} disabled={used} onClick={() => pickChip(chip)}>
                {chip.text}
              </button>
            );
          })}
        </div>
      )}

      {!done && (
        <div className="gm-actions">
          <button type="button" className="btn btn-gold" disabled={!ready} onClick={check}>
            تأكيد
          </button>
        </div>
      )}

      {done && (
        <Feedback
          ok={allOk}
          title={allOk ? 'كله صح!' : results.some(Boolean) ? 'فيه حاجة مش مظبوطة' : 'مش صح المرة دي'}
          onNext={next}
          last={last}
        >
          {settings.showExplanations && item.explanation && <p>{item.explanation}</p>}
        </Feedback>
      )}
    </div>
  );
}
