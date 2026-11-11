'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, ImageIcon, PlusIcon, TrashIcon, UploadIcon, XIcon } from '@/components/ui/icons';
import { countLabel, num } from '@/lib/format';
import { uid } from '@/lib/games/random';

/** Lets editors upload images without knowing about Supabase. Returns the public URL. */
export const UploadContext = createContext<((file: File) => Promise<string>) | null>(null);

export function ItemList<T extends { id: string }>({
  items,
  onChange,
  make,
  render,
  noun,
  addLabel,
  min = 1,
  max = 100,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  noun: string;
  addLabel: string;
  min?: number;
  max?: number;
}) {
  const update = (i: number, patch: Partial<T>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => {
    const next = items.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const duplicate = (i: number) => {
    const copy = { ...structuredClone(items[i]), id: uid() };
    onChange([...items.slice(0, i + 1), copy, ...items.slice(i + 1)]);
  };
  const remove = (i: number) => onChange(items.filter((_, k) => k !== i));

  return (
    <div className="ad-items">
      {items.map((item, i) => (
        <div className="ad-item" key={item.id}>
          <div className="ad-item-head">
            <span className="ad-item-n">
              {noun} {num(i + 1)}
            </span>
            <div className="ad-item-tools">
              <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} title="طلّعه لفوق" aria-label="لفوق">
                <ArrowUpIcon size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                title="نزّله لتحت"
                aria-label="لتحت"
              >
                <ArrowDownIcon size={16} />
              </button>
              <button type="button" className="icon-btn" disabled={items.length >= max} onClick={() => duplicate(i)} title="كرّره" aria-label="كرّر">
                <CopyIcon size={16} />
              </button>
              <button type="button" className="icon-btn danger" disabled={items.length <= min} onClick={() => remove(i)} title="امسحه" aria-label="امسح">
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
          {render(item, (patch) => update(i, patch), i)}
        </div>
      ))}
      <button type="button" className="btn btn-ghost ad-add" disabled={items.length >= max} onClick={() => onChange([...items, make()])}>
        <PlusIcon size={18} /> {addLabel}
      </button>
    </div>
  );
}

export function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const upload = useContext(UploadContext);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!upload) return null;

  async function pick(file: File | undefined) {
    if (!file || !upload) return;
    setBusy(true);
    setError('');
    try {
      onChange(await upload(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'الصورة ماترفعتش.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="ad-image">
      {value ? (
        <div className="ad-image-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" />
          <button type="button" className="icon-btn danger" onClick={() => onChange('')} title="شيل الصورة" aria-label="شيل الصورة">
            <XIcon size={16} />
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <span className="spinner" /> : <ImageIcon size={16} />} {busy ? 'بنرفع الصورة...' : 'ضيف صورة (اختياري)'}
        </button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

/** "Paste many at once" box. `parse` turns the text into items; the admin can add them or replace the list. */
export function BulkImport<T>({
  title,
  help,
  example,
  parse,
  onImport,
  forms,
}: {
  title: string;
  help: ReactNode;
  example: string;
  parse: (text: string) => T[];
  onImport: (items: T[], mode: 'append' | 'replace') => void;
  forms: { one: string; two: string; few: string; many: string };
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const parsed = text.trim() ? parse(text) : [];

  function done(mode: 'append' | 'replace') {
    if (!parsed.length) return;
    onImport(parsed, mode);
    setText('');
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        <UploadIcon size={16} /> {title}
      </button>
      {open && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal card" style={{ maxWidth: 640 }}>
            <button type="button" className="icon-btn modal-close" onClick={() => setOpen(false)} aria-label="قفل">
              <XIcon size={18} />
            </button>
            <h3 className="display" style={{ fontSize: 30, marginBottom: 8 }}>
              {title}
            </h3>
            <div className="muted" style={{ marginBottom: 10 }}>
              {help}
            </div>
            <textarea
              className="textarea"
              rows={10}
              value={text}
              placeholder={example}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <div className="row" style={{ marginTop: 12 }}>
              <span className="badge">{parsed.length ? `هيتضاف ${countLabel(parsed.length, forms)}` : 'لسه مفيش حاجة مفهومة'}</span>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost btn-sm" disabled={!parsed.length} onClick={() => done('replace')}>
                استبدل الموجود
              </button>
              <button type="button" className="btn btn-gold btn-sm" disabled={!parsed.length} onClick={() => done('append')}>
                ضيفهم للآخر
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Splits "a = b" / "a | b" / "a<TAB>b" lines into pairs. */
export function splitPairLines(text: string): [string, string][] {
  return text
    .split('\n')
    .map((line) => line.split(/\s*(?:\t|\||=|:)\s*/))
    .filter((p) => p.length >= 2 && p[0].trim() && p[1].trim())
    .map((p) => [p[0].trim(), p.slice(1).join(' ').trim()] as [string, string]);
}

/** Merges imported items into a list that may only contain one untouched empty item. */
export function mergeItems<T>(current: T[], incoming: T[], mode: 'append' | 'replace', isEmpty: (item: T) => boolean): T[] {
  if (mode === 'replace') return incoming;
  return [...current.filter((it) => !isEmpty(it)), ...incoming];
}
