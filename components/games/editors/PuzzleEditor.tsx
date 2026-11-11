'use client';

import { useContext, useRef, useState, type CSSProperties } from 'react';
import { ImageIcon, UploadIcon } from '@/components/ui/icons';
import { countLabel, num } from '@/lib/format';
import { MAX_PIECES, PUZZLE_POSTER, puzzleDef, puzzleLevels, type PuzzleContent } from '@/lib/games/defs/puzzle';
import type { EditorProps } from '../types';
import { UploadContext } from './parts';

const SIZES = [2, 3, 4, 5, 6, 7, 8];

function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('الصورة مش راضية تفتح، جرّب صورة تانية.'));
    img.src = src;
  });
}

export default function PuzzleEditor({ value, onChange }: EditorProps<PuzzleContent>) {
  const upload = useContext(UploadContext);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pieces = value.cols * value.rows;
  const levels = puzzleLevels(value.width, value.height);
  const tileShape = value.width / value.cols / (value.height / value.rows);

  /** A tall grid on a wide picture makes thin strips, so the grid turns with the picture. */
  function withImage(image: string, width: number, height: number, caption: string): PuzzleContent {
    let { cols, rows } = value;
    if ((width > height && cols < rows) || (width < height && cols > rows)) [cols, rows] = [rows, cols];
    return { ...value, image, width, height, cols, rows, caption };
  }

  async function pick(file: File | undefined) {
    if (!file || !upload) return;
    setBusy(true);
    setError('');
    try {
      const url = await upload(file);
      const { width, height } = await imageSize(url);
      onChange(withImage(url, width, height, value.caption));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'الصورة ماترفعتش.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const setGrid = (cols: number, rows: number) => onChange({ ...value, cols, rows });

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        ارفع أي صورة (بوستر، لوحة، بيت شعر مكتوب بخط حلو...) واختار هتتقطّع كام قطعة. الطالب بيبدّل القطع لحد ما الصورة ترجع زي ما كانت.
      </p>
      <div className="ad-pz">
        <div className="ad-pz-media">
          {value.image ? (
            <div className="ad-pz-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value.image} alt="صورة اللعبة" />
              <div className="ad-pz-grid" style={{ '--c': value.cols, '--r': value.rows } as CSSProperties} aria-hidden="true">
                {Array.from({ length: pieces }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="ad-pz-empty">
              <ImageIcon size={30} />
              <span>لسه مفيش صورة</span>
            </div>
          )}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            {upload && (
              <button type="button" className="btn btn-sm btn-gold" disabled={busy} onClick={() => input.current?.click()}>
                {busy ? <span className="spinner" /> : <UploadIcon size={16} />} {busy ? 'بنرفع الصورة...' : value.image ? 'غيّر الصورة' : 'ارفع الصورة'}
              </button>
            )}
            {value.image !== PUZZLE_POSTER.image && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={busy}
                onClick={() => onChange(withImage(PUZZLE_POSTER.image, PUZZLE_POSTER.width, PUZZLE_POSTER.height, value.caption || PUZZLE_POSTER.caption))}
              >
                استخدم بوستر «{PUZZLE_POSTER.caption}»
              </button>
            )}
          </div>
          {error && <span className="form-error">{error}</span>}
        </div>

        <div className="stack ad-pz-side">
          <div className="field">
            <span className="field-label">الصعوبة</span>
            <div className="chips" role="radiogroup" aria-label="الصعوبة">
              {levels.map((l) => {
                const on = l.cols === value.cols && l.rows === value.rows;
                return (
                  <button
                    key={l.label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`chip${on ? ' on' : ''}`}
                    onClick={() => setGrid(l.cols, l.rows)}
                  >
                    {l.label} ({countLabel(l.cols * l.rows, puzzleDef.itemForms)})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="pz-cols">عدد الأعمدة</label>
              <select id="pz-cols" className="select" value={value.cols} onChange={(e) => setGrid(Number(e.target.value), value.rows)}>
                {SIZES.map((n) => (
                  <option key={n} value={n} disabled={n * value.rows > MAX_PIECES}>
                    {num(n)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pz-rows">عدد الصفوف</label>
              <select id="pz-rows" className="select" value={value.rows} onChange={(e) => setGrid(value.cols, Number(e.target.value))}>
                {SIZES.map((n) => (
                  <option key={n} value={n} disabled={value.cols * n > MAX_PIECES}>
                    {num(n)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <span className="muted">
            الصورة هتتقطّع {countLabel(pieces, puzzleDef.itemForms)}
            {value.image && (tileShape > 2.5 || tileShape < 0.4) && '، بس القطع هتطلع رفيعة أوي. جرّب تغيّر عدد الصفوف أو الأعمدة.'}
          </span>
          <div className="field">
            <label htmlFor="pz-caption">اسم الصورة (اختياري)</label>
            <input
              id="pz-caption"
              className="input"
              maxLength={60}
              placeholder={`مثلًا: ${PUZZLE_POSTER.caption}`}
              value={value.caption}
              onChange={(e) => onChange({ ...value, caption: e.target.value })}
            />
            <span className="hint">
              بيظهر لما الطالب يخلّص: ركّبت {value.caption.trim() ? `«${value.caption.trim()}»` : 'الصورة'} في ١٢ حركة.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
