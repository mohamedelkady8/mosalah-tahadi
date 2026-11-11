'use client';

import { memoryDef, newMemoryPair, type MemoryContent, type MemoryPair } from '@/lib/games/defs/memory';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';
import { BulkImport, ItemList, mergeItems, splitPairLines } from './parts';

export default function MemoryEditor({ value, onChange }: EditorProps<MemoryContent>) {
  const setPairs = (pairs: MemoryPair[]) => onChange({ ...value, pairs });
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        كل زوج = كارتين بيكمّلوا بعض: كلمة وعكسها، كلمة ومعناها، أو مصطلح وتعريفه. الكلام على الكارت يفضل يكون قصير.
      </p>
      <div className="row">
        <BulkImport
          title="الصق أزواج كتير مرة واحدة"
          help={
            <>
              كل زوج في سطر، وافصل بينهم بـ <b>=</b> أو <b>|</b>. مثلًا: الصدق = الكذب
            </>
          }
          example={'الصدق = الكذب\nالشجاعة = الجبن\nالكرم = البخل'}
          parse={(text) => splitPairLines(text).map(([a, b]) => ({ id: uid(), a: a.slice(0, 80), b: b.slice(0, 80) }))}
          forms={memoryDef.itemForms}
          onImport={(items, mode) => setPairs(mergeItems(value.pairs, items, mode, (p) => !p.a.trim() && !p.b.trim()).slice(0, 12))}
        />
        <span className="muted">من ٢ لـ ١٢ زوج (يعني لحد ٢٤ كارت)</span>
      </div>
      <ItemList
        items={value.pairs}
        onChange={setPairs}
        make={newMemoryPair}
        noun="الزوج"
        addLabel="ضيف زوج"
        min={2}
        max={12}
        render={(p, update) => (
          <div className="ad-pair">
            <input className="input input-sm" placeholder="الكارت الأول" maxLength={80} value={p.a} onChange={(e) => update({ a: e.target.value })} />
            <span className="ad-pair-sep" aria-hidden="true">⟷</span>
            <input className="input input-sm" placeholder="الكارت اللي يكمّله" maxLength={80} value={p.b} onChange={(e) => update({ b: e.target.value })} />
          </div>
        )}
      />
    </div>
  );
}
