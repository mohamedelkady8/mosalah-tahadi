'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { RefreshIcon } from '@/components/ui/icons';
import type { WordSearchContent } from '@/lib/games/defs/wordSearch';
import { num } from '@/lib/format';
import { randomSeed } from '@/lib/games/random';
import { generateWordSearch, lineCells, wordLetters } from '@/lib/games/wordsearch';
import type { EditorProps } from '../types';

const SIZES = [6, 7, 8, 9, 10, 11, 12, 13, 14];

export default function WordSearchEditor({ value, onChange }: EditorProps<WordSearchContent>) {
  const [text, setText] = useState(() => value.words.filter(Boolean).join('\n'));
  const [seed, setSeed] = useState(randomSeed);
  const words = value.words.filter((w) => w.trim());
  const grid = useMemo(
    () => (words.length ? generateWordSearch(words, value.size, value.directions, seed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words.join('|'), value.size, value.directions, seed],
  );
  const placed = new Set(grid?.placements.map((p) => p.index));
  const inWords = new Set<string>();
  for (const p of grid?.placements ?? []) for (const [r, c] of lineCells(p.start, p.end) ?? []) inWords.add(`${r},${c}`);
  const longest = Math.max(0, ...words.map((w) => wordLetters(w).length));

  function setWords(next: string) {
    setText(next);
    onChange({
      ...value,
      words: next
        .split(/[\n،,]/)
        .map((w) => w.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="ad-ws">
      <div className="stack">
        <label className="field">
          <span className="field-label">الكلمات (كل كلمة في سطر)</span>
          <textarea className="textarea" rows={9} value={text} placeholder={'تشبيه\nاستعارة\nكناية'} onChange={(e) => setWords(e.target.value)} />
          <span className="hint">من ٢ لـ ١٥ كلمة. التشكيل والمسافات بيتشالوا من الجدول.</span>
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field-label">حجم الجدول</span>
            <select className="select" value={value.size} onChange={(e) => onChange({ ...value, size: Number(e.target.value) })}>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {num(s)} × {num(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">الاتجاهات</span>
            <select
              className="select"
              value={value.directions}
              onChange={(e) => onChange({ ...value, directions: e.target.value as WordSearchContent['directions'] })}
            >
              <option value="easy">سهل: يمين لشمال ومن فوق لتحت</option>
              <option value="hard">صعب: كل الاتجاهات والمايل والمعكوس</option>
            </select>
          </label>
        </div>
        {longest > value.size && <div className="form-error">فيه كلمة أطول من الجدول، فالجدول هيكبر لوحده لـ {num(Math.min(14, longest))}.</div>}
        {grid && placed.size < words.length && (
          <div className="form-error">
            مش كل الكلمات دخلت الجدول: {words.filter((_, i) => !placed.has(i)).join('، ')}. كبّر الجدول أو قلل الكلمات.
          </div>
        )}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">
          <span className="field-label">شكل الجدول</span>
          <span className="spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSeed(randomSeed())}>
            <RefreshIcon size={15} /> شكل تاني
          </button>
        </div>
        {grid ? (
          <div className="ad-ws-grid" style={{ '--n': grid.size } as CSSProperties}>
            {grid.cells.map((ch, i) => {
              const k = `${Math.floor(i / grid.size)},${i % grid.size}`;
              return (
                <span key={k} className={inWords.has(k) ? 'on' : ''}>
                  {ch}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="ad-ws-grid empty">اكتب الكلمات وهيظهر الجدول هنا</div>
        )}
        <span className="hint">كل طالب بيطلعله ترتيب مختلف. الحروف الملوّنة هنا عشان توضحلك مكان الكلمات بس.</span>
      </div>
    </div>
  );
}
