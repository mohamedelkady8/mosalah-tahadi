'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteQuote, moveQuote, saveQuote, type ActionResult } from '@/lib/actions/admin';
import { num } from '@/lib/format';
import type { Quote } from '@/lib/types';

type Change = { kind: 'active'; id: string; active: boolean } | { kind: 'move'; id: string; dir: -1 | 1 } | { kind: 'delete'; id: string };

function applyChange(state: Quote[], change: Change): Quote[] {
  if (change.kind === 'active') return state.map((q) => (q.id === change.id ? { ...q, active: change.active } : q));
  if (change.kind === 'delete') return state.filter((q) => q.id !== change.id);
  const i = state.findIndex((q) => q.id === change.id);
  const j = i + change.dir;
  if (i < 0 || j < 0 || j >= state.length) return state;
  const next = [...state];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function QuotesManager({ quotes: serverQuotes, todayId }: { quotes: Quote[]; todayId: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [quotes, optimistic] = useOptimistic(serverQuotes, applyChange);
  const [draft, setDraft] = useState('');
  const [texts, setTexts] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<ActionResult>, after?: () => void, change?: Change) =>
    start(async () => {
      if (change) optimistic(change);
      const r = await fn();
      if (!r.ok) return toast(r.error);
      if (r.message) toast(r.message);
      after?.();
      router.refresh();
    });

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="ad-panel">
        <h2>جملة جديدة</h2>
        <form
          className="ad-quote-row"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveQuote({ text: draft, active: true }), () => setDraft(''));
          }}
        >
          <textarea
            className="textarea"
            rows={2}
            maxLength={200}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="جملة تشجيع قصيرة للطلاب..."
            aria-label="جملة جديدة"
            required
          />
          <button type="submit" className="btn btn-gold" disabled={pending || draft.trim().length < 3}>
            <PlusIcon size={18} /> ضيف
          </button>
        </form>
      </section>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>كل الجمل</h2>
          <span className="muted">{num(quotes.filter((q) => q.active).length)} ظاهرة من {num(quotes.length)}</span>
        </div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          كل يوم بتظهر جملة واحدة بالترتيب على الصفحة الرئيسية. الجملة المخفية بتتنط.
        </p>
        {quotes.length ? (
          <ul className="ad-list">
            {quotes.map((q, i) => {
              const text = texts[q.id] ?? q.text;
              const changed = text.trim() !== q.text;
              return (
                <li key={q.id} style={{ alignItems: 'flex-start', opacity: q.active ? 1 : 0.65 }}>
                  <span className="badge" style={{ marginTop: 12 }}>
                    {num(i + 1)}
                  </span>
                  <div className="grow stack" style={{ gap: 8 }}>
                    <textarea
                      className="textarea"
                      rows={2}
                      maxLength={200}
                      value={text}
                      onChange={(e) => setTexts({ ...texts, [q.id]: e.target.value })}
                      aria-label={`الجملة ${num(i + 1)}`}
                    />
                    <div className="row" style={{ gap: 8 }}>
                      {q.id === todayId && <span className="badge badge-gold">دي اللي ظاهرة النهارده</span>}
                      <label className="check" style={{ fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={q.active}
                          disabled={pending}
                          onChange={(e) => {
                            const active = e.target.checked;
                            run(() => saveQuote({ id: q.id, text: q.text, active }), undefined, { kind: 'active', id: q.id, active });
                          }}
                        />
                        ظاهرة
                      </label>
                      {changed && (
                        <>
                          <button type="button" className="btn btn-sm btn-gold" disabled={pending} onClick={() => run(() => saveQuote({ id: q.id, text, active: q.active }), () => setTexts(({ [q.id]: _, ...rest }) => rest))}>
                            احفظ
                          </button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTexts(({ [q.id]: _, ...rest }) => rest)}>
                            رجّعها زي ما كانت
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ad-item-tools" style={{ marginTop: 6 }}>
                    <button type="button" className="icon-btn" disabled={pending || i === 0} onClick={() => run(() => moveQuote(q.id, -1), undefined, { kind: 'move', id: q.id, dir: -1 })} aria-label="لفوق" title="لفوق">
                      <ArrowUpIcon size={16} />
                    </button>
                    <button type="button" className="icon-btn" disabled={pending || i === quotes.length - 1} onClick={() => run(() => moveQuote(q.id, 1), undefined, { kind: 'move', id: q.id, dir: 1 })} aria-label="لتحت" title="لتحت">
                      <ArrowDownIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      disabled={pending}
                      onClick={() => confirm('تمسح الجملة دي؟') && run(() => deleteQuote(q.id), undefined, { kind: 'delete', id: q.id })}
                      aria-label="امسح"
                      title="امسح"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">مفيش جمل، والصفحة الرئيسية هتعرض الجمل الافتراضية.</p>
        )}
      </section>
    </div>
  );
}
