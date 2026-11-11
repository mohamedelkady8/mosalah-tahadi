'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteTip, saveTip, type ActionResult } from '@/lib/actions/admin';
import { countLabel, num } from '@/lib/format';
import type { Tip } from '@/lib/types';
import { GradeSelect, type GradeOption } from './GradeSelect';

type Change = { kind: 'save'; tip: Pick<Tip, 'id' | 'body' | 'grade_id' | 'active'> } | { kind: 'delete'; id: string };

function applyChange(state: Tip[], change: Change): Tip[] {
  if (change.kind === 'delete') return state.filter((t) => t.id !== change.id);
  return state.map((t) => (t.id === change.tip.id ? { ...t, ...change.tip } : t));
}

const tipsLabel = (n: number) => countLabel(n, { one: 'نصيحة', two: 'نصيحتين', few: 'نصايح', many: 'نصيحة' });

export function TipsManager({ tips: serverTips, grades }: { tips: Tip[]; grades: GradeOption[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tips, optimistic] = useOptimistic(serverTips, applyChange);
  const [draft, setDraft] = useState('');
  const [draftGrade, setDraftGrade] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { body: string; grade_id: string | null }>>({});
  const [filter, setFilter] = useState<string>('all');

  const batch = draft
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  const run = (fn: () => Promise<ActionResult>, change?: Change, after?: () => void) =>
    start(async () => {
      if (change) optimistic(change);
      const r = await fn();
      if (!r.ok) return toast(r.error);
      if (r.message) toast(r.message);
      after?.();
      router.refresh();
    });

  function addAll() {
    start(async () => {
      let added = 0;
      for (const body of batch) {
        const r = await saveTip({ body, grade_id: draftGrade, active: true });
        if (!r.ok) {
          toast(added ? `اتضاف ${tipsLabel(added)} بس. ${r.error}` : r.error);
          router.refresh();
          return;
        }
        added++;
      }
      toast(added > 1 ? `اتضاف ${tipsLabel(added)}.` : 'النصيحة اتضافت.');
      setDraft('');
      router.refresh();
    });
  }

  const dropEdit = (id: string) => setEdits(({ [id]: _, ...rest }) => rest);
  const shown = tips.filter((t) => filter === 'all' || (filter === 'common' ? !t.grade_id : t.grade_id === filter));
  const usedGrades = grades.filter((g) => tips.some((t) => t.grade_id === g.id));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="ad-panel stack" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}>نصيحة جديدة</h2>
        <textarea
          className="textarea"
          rows={3}
          maxLength={6000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="مثلًا: ذاكر درس النحو بإيدك: اكتب القاعدة وطلّع عليها ٣ أمثلة من عندك."
          aria-label="نصيحة جديدة"
        />
        <span className="hint">عايز تضيف كذا نصيحة مرة واحدة؟ سيب سطر فاضي بين كل نصيحة والتانية.</span>
        <div className="row" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 8, fontWeight: 600 }}>
            لمين؟
            <GradeSelect grades={grades} value={draftGrade} onChange={setDraftGrade} />
          </label>
          <button type="button" className="btn btn-gold" disabled={pending || batch.length === 0} onClick={addAll} style={{ marginInlineStart: 'auto' }}>
            {pending ? <span className="spinner" /> : <PlusIcon size={18} />} {batch.length > 1 ? `ضيف ${tipsLabel(batch.length)}` : 'ضيف'}
          </button>
        </div>
      </section>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>كل النصايح</h2>
          <span className="muted">
            {num(tips.filter((t) => t.active).length)} ظاهرة من {num(tips.length)}
          </span>
        </div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          لما العجلة تختار «نصايح»، الطالب بيشوف نصيحة عشوائية من نصايح مرحلته واللي لكل المراحل، ويقدر يقلّب فيهم.
        </p>
        {tips.length > 0 && (usedGrades.length > 0 || tips.some((t) => !t.grade_id)) && (
          <div className="chips" role="group" aria-label="فلتر بالمرحلة" style={{ marginBottom: 12 }}>
            <button type="button" className={`chip${filter === 'all' ? ' on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              الكل
            </button>
            <button type="button" className={`chip${filter === 'common' ? ' on' : ''}`} aria-pressed={filter === 'common'} onClick={() => setFilter('common')}>
              لكل المراحل
            </button>
            {usedGrades.map((g) => (
              <button key={g.id} type="button" className={`chip${filter === g.id ? ' on' : ''}`} aria-pressed={filter === g.id} onClick={() => setFilter(g.id)}>
                {g.name}
              </button>
            ))}
          </div>
        )}
        {shown.length ? (
          <ul className="ad-list">
            {shown.map((t) => {
              const edit = edits[t.id] ?? { body: t.body, grade_id: t.grade_id };
              const changed = edit.body.trim() !== t.body || edit.grade_id !== t.grade_id;
              return (
                <li key={t.id} style={{ alignItems: 'flex-start', opacity: t.active ? 1 : 0.65 }}>
                  <div className="grow stack" style={{ gap: 8 }}>
                    <textarea
                      className="textarea"
                      rows={2}
                      maxLength={600}
                      value={edit.body}
                      onChange={(e) => setEdits({ ...edits, [t.id]: { ...edit, body: e.target.value } })}
                      aria-label="النصيحة"
                    />
                    <div className="row" style={{ gap: 8 }}>
                      <GradeSelect grades={grades} value={edit.grade_id} small onChange={(grade_id) => setEdits({ ...edits, [t.id]: { ...edit, grade_id } })} />
                      <label className="check" style={{ fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={t.active}
                          disabled={pending}
                          onChange={(e) => {
                            const tip = { id: t.id, body: t.body, grade_id: t.grade_id, active: e.target.checked };
                            run(() => saveTip(tip), { kind: 'save', tip });
                          }}
                        />
                        ظاهرة
                      </label>
                      {changed && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-gold"
                            disabled={pending || edit.body.trim().length < 3}
                            onClick={() => {
                              const tip = { id: t.id, body: edit.body.trim(), grade_id: edit.grade_id, active: t.active };
                              run(() => saveTip(tip), { kind: 'save', tip }, () => dropEdit(t.id));
                            }}
                          >
                            احفظ
                          </button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => dropEdit(t.id)}>
                            رجّعها زي ما كانت
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ad-item-tools" style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className="icon-btn danger"
                      disabled={pending}
                      onClick={() => confirm('تمسح النصيحة دي؟') && run(() => deleteTip(t.id), { kind: 'delete', id: t.id })}
                      aria-label="امسح النصيحة"
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
          <p className="ad-empty">{tips.length ? 'مفيش نصايح بالفلتر ده.' : 'لسه مفيش نصايح. ضيف أول نصيحة من فوق.'}</p>
        )}
      </section>
    </div>
  );
}
