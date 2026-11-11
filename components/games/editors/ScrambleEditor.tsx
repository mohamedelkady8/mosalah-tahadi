'use client';

import { newScrambleItem, scrambleDef, scrambleTiles, type ScrambleContent, type ScrambleItem } from '@/lib/games/defs/scramble';
import { num } from '@/lib/format';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';
import { BulkImport, ItemList, mergeItems } from './parts';

export default function ScrambleEditor({ value, onChange }: EditorProps<ScrambleContent>) {
  const setItems = (items: ScrambleItem[]) => onChange({ ...value, items });
  const letters = value.mode === 'letters';
  return (
    <div className="stack">
      <div className="field">
        <span className="field-label">الطالب هيرتّب إيه؟</span>
        <div className="chips">
          <button type="button" className={`chip${!letters ? ' on' : ''}`} onClick={() => onChange({ ...value, mode: 'words' })}>
            كلمات جملة
          </button>
          <button type="button" className={`chip${letters ? ' on' : ''}`} onClick={() => onChange({ ...value, mode: 'letters' })}>
            حروف كلمة
          </button>
        </div>
        <span className="hint">
          {letters ? 'الحروف هتتلخبط، والتشكيل بيفضل مع الحرف بتاعه.' : 'كلمات الجملة هتتلخبط، والطالب يرتبها. من ٢ لـ ١٦ كلمة.'}
        </span>
      </div>
      <div className="row">
        <BulkImport
          title={letters ? 'الصق كلمات كتير مرة واحدة' : 'الصق جمل كتير مرة واحدة'}
          help={
            <>
              كل {letters ? 'كلمة' : 'جملة'} في سطر. ولو عايز تلميح، اكتبه بعد علامة <b>|</b>.
            </>
          }
          example={letters ? 'استعارة | من فنون البلاغة\nكناية | لفظ أُريد به لازم معناه' : 'العلمُ نورٌ والجهلُ ظلامٌ | فيها طباق\nالصبرُ مفتاحُ الفرجِ | مثل مشهور'}
          parse={(text) =>
            text
              .split('\n')
              .map((l) => l.split('|'))
              .filter((p) => p[0].trim())
              .map((p) => ({ id: uid(), answer: p[0].trim(), hint: (p[1] ?? '').trim() }))
          }
          forms={scrambleDef.itemForms}
          onImport={(items, mode) => setItems(mergeItems(value.items, items, mode, (it) => !it.answer.trim()))}
        />
      </div>
      <ItemList
        items={value.items}
        onChange={setItems}
        make={newScrambleItem}
        noun={letters ? 'الكلمة' : 'الجملة'}
        addLabel={letters ? 'ضيف كلمة' : 'ضيف جملة'}
        max={50}
        render={(it, update) => {
          const tiles = it.answer.trim() ? scrambleTiles(value.mode, it.answer) : [];
          return (
            <div className="stack" style={{ gap: 10 }}>
              <input
                className="input"
                placeholder={letters ? 'الكلمة الصح، مثلًا: استعارة' : 'الجملة الصح بالترتيب'}
                value={it.answer}
                onChange={(e) => update({ answer: e.target.value })}
              />
              <input className="input input-sm" placeholder="تلميح (اختياري)" value={it.hint} onChange={(e) => update({ hint: e.target.value })} />
              {tiles.length > 0 && (
                <div className="ad-tiles" aria-label="القطع">
                  {tiles.map((t, i) => (
                    <span key={i} className="ad-tile">
                      {t}
                    </span>
                  ))}
                  <span className={`badge ${tiles.length < 2 || tiles.length > 16 ? 'badge-bad' : ''}`}>{num(tiles.length)} قطعة</span>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
