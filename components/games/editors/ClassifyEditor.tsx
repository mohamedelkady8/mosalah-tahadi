'use client';

import { useState } from 'react';
import { PlusIcon, TrashIcon, XIcon } from '@/components/ui/icons';
import { newBucket, newClassifyItem, type ClassifyContent, type ClassifyItem } from '@/lib/games/defs/classify';
import { num } from '@/lib/format';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';

export default function ClassifyEditor({ value, onChange }: EditorProps<ClassifyContent>) {
  const { buckets, items } = value;
  const [pasteFor, setPasteFor] = useState<string | null>(null);
  const [paste, setPaste] = useState('');

  const setItems = (next: ClassifyItem[]) => onChange({ ...value, items: next });
  const updateItem = (id: string, patch: Partial<ClassifyItem>) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  function removeBucket(id: string) {
    const count = items.filter((it) => it.bucketId === id).length;
    if (count && !window.confirm(`المجموعة دي فيها ${num(count)} عنصر، هيتمسحوا معاها. متأكد؟`)) return;
    onChange({ buckets: buckets.filter((b) => b.id !== id), items: items.filter((it) => it.bucketId !== id) });
  }

  function importInto(bucketId: string) {
    const fresh = paste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ id: uid(), text: text.slice(0, 160), bucketId }));
    const kept = items.filter((it) => it.text.trim());
    setItems([...kept, ...fresh].slice(0, 40));
    setPaste('');
    setPasteFor(null);
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="badge">
          {num(buckets.length)} مجموعات، {num(items.length)} عنصر
        </span>
        <span className="muted">من ٢ لـ ٥ مجموعات، ولحد ٤٠ عنصر. ولو عايز تلوّن كلمة في العنصر حطها بين « »</span>
      </div>
      <div className="ad-buckets">
        {buckets.map((b, bi) => {
          const mine = items.filter((it) => it.bucketId === b.id);
          return (
            <div key={b.id} className="ad-bucket">
              <div className="ad-bucket-head">
                <input
                  className="input input-sm"
                  placeholder={`اسم المجموعة ${num(bi + 1)}`}
                  value={b.label}
                  maxLength={40}
                  onChange={(e) => onChange({ ...value, buckets: buckets.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)) })}
                />
                <button type="button" className="icon-btn danger" disabled={buckets.length <= 2} onClick={() => removeBucket(b.id)} aria-label="امسح المجموعة">
                  <TrashIcon size={16} />
                </button>
              </div>
              {mine.map((it) => (
                <div key={it.id} className="ad-bucket-item">
                  <input className="input input-sm" placeholder="العنصر" value={it.text} onChange={(e) => updateItem(it.id, { text: e.target.value })} />
                  {buckets.length > 1 && (
                    <select
                      className="select input-sm ad-move"
                      value={it.bucketId}
                      aria-label="انقله لمجموعة تانية"
                      onChange={(e) => updateItem(it.id, { bucketId: e.target.value })}
                    >
                      {buckets.map((x, xi) => (
                        <option key={x.id} value={x.id}>
                          {x.label || `مجموعة ${num(xi + 1)}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <button type="button" className="icon-btn danger" onClick={() => setItems(items.filter((x) => x.id !== it.id))} aria-label="امسح العنصر">
                    <XIcon size={15} />
                  </button>
                </div>
              ))}
              {pasteFor === b.id ? (
                <div className="stack" style={{ gap: 8 }}>
                  <textarea
                    className="textarea"
                    rows={4}
                    placeholder={'كل عنصر في سطر\nمثلًا: كتبَ «الطالبُ» الدرسَ'}
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    autoFocus
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-gold btn-sm" disabled={!paste.trim()} onClick={() => importInto(b.id)}>
                      ضيفهم
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasteFor(null)}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={items.length >= 40}
                    onClick={() => setItems([...items, newClassifyItem(b.id)])}
                  >
                    <PlusIcon size={15} /> ضيف عنصر
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasteFor(b.id)}>
                    الصق كذا عنصر
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {buckets.length < 5 && (
        <button type="button" className="btn btn-ghost ad-add" onClick={() => onChange({ ...value, buckets: [...buckets, newBucket('')] })}>
          <PlusIcon size={18} /> ضيف مجموعة
        </button>
      )}
    </div>
  );
}
