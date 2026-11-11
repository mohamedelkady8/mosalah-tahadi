'use client';

import { matchingDef, newPair, type MatchingContent, type MatchingPair } from '@/lib/games/defs/matching';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';
import { BulkImport, ItemList, mergeItems, splitPairLines } from './parts';

export default function MatchingEditor({ value, onChange }: EditorProps<MatchingContent>) {
  const setPairs = (pairs: MatchingPair[]) => onChange({ ...value, pairs });
  return (
    <div className="stack">
      <div className="field-row">
        <label className="field">
          <span className="field-label">اسم العمود الأول</span>
          <input className="input" value={value.leftLabel} maxLength={40} onChange={(e) => onChange({ ...value, leftLabel: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">اسم العمود التاني</span>
          <input className="input" value={value.rightLabel} maxLength={40} onChange={(e) => onChange({ ...value, rightLabel: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <BulkImport
          title="الصق أزواج كتير مرة واحدة"
          help={
            <>
              كل زوج في سطر، وافصل بينهم بـ <b>=</b> أو <b>|</b>. مثلًا: الوغى = الحرب
            </>
          }
          example={'الوغى = الحرب\nالسغب = الجوع\nالوجل = الخوف'}
          parse={(text) => splitPairLines(text).map(([left, right]) => ({ id: uid(), left, right }))}
          forms={matchingDef.itemForms}
          onImport={(items, mode) => setPairs(mergeItems(value.pairs, items, mode, (p) => !p.left.trim() && !p.right.trim()).slice(0, 12))}
        />
        <span className="muted">من ٢ لـ ١٢ زوج</span>
      </div>
      <ItemList
        items={value.pairs}
        onChange={setPairs}
        make={newPair}
        noun="الزوج"
        addLabel="ضيف زوج"
        min={2}
        max={12}
        render={(p, update) => (
          <div className="ad-pair">
            <input className="input input-sm" placeholder={value.leftLabel || 'الكلمة'} value={p.left} onChange={(e) => update({ left: e.target.value })} />
            <span className="ad-pair-sep" aria-hidden="true">⟵</span>
            <input className="input input-sm" placeholder={value.rightLabel || 'المعنى'} value={p.right} onChange={(e) => update({ right: e.target.value })} />
          </div>
        )}
      />
    </div>
  );
}
