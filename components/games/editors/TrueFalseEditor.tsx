'use client';

import { CheckIcon, XIcon } from '@/components/ui/icons';
import { newTfStatement, trueFalseDef, type TfContent, type TfStatement } from '@/lib/games/defs/trueFalse';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';
import { BulkImport, ItemList, mergeItems } from './parts';

const EXAMPLE = `صح: التشبيه البليغ حُذفت منه الأداة ووجه الشبه = مثل: العلمُ نورٌ
غلط: الجناس التام اختلاف الكلمتين في نوع الحروف`;

function parseBulk(text: string): TfStatement[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .map((line) => {
      const m = line.match(/^(صح|صحيح|ص|✓|غلط|خطأ|خطا|غ|✗)\s*[:：\-–]\s*(.+)$/);
      if (!m) return null;
      const [body, explanation = ''] = m[2].split(/\s+=\s+/);
      return { id: uid(), text: body.trim(), answer: /^(صح|صحيح|ص|✓)$/.test(m[1]), explanation: explanation.trim() };
    })
    .filter((s): s is TfStatement => Boolean(s?.text));
}

export default function TrueFalseEditor({ value, onChange }: EditorProps<TfContent>) {
  const setStatements = (statements: TfStatement[]) => onChange({ ...value, statements });
  return (
    <div className="stack">
      <div className="row">
        <BulkImport
          title="الصق جمل كتير مرة واحدة"
          help={
            <>
              كل جملة في سطر، وابدأ السطر بـ <b>صح:</b> أو <b>غلط:</b>. ولو عايز شرح، اكتبه بعد علامة <b>=</b>.
            </>
          }
          example={EXAMPLE}
          parse={parseBulk}
          forms={trueFalseDef.itemForms}
          onImport={(items, mode) => setStatements(mergeItems(value.statements, items, mode, (s) => !s.text.trim()))}
        />
      </div>
      <ItemList
        items={value.statements}
        onChange={setStatements}
        make={newTfStatement}
        noun="الجملة"
        addLabel="ضيف جملة"
        max={100}
        render={(s, update) => (
          <div className="stack" style={{ gap: 10 }}>
            <textarea className="textarea" rows={2} placeholder="اكتب الجملة..." value={s.text} onChange={(e) => update({ text: e.target.value })} />
            <div className="row">
              <span className="field-label">الجملة دي:</span>
              <div className="chips" role="radiogroup">
                <button type="button" className={`chip${s.answer ? ' on ok' : ''}`} aria-pressed={s.answer} onClick={() => update({ answer: true })}>
                  <CheckIcon size={15} /> صح
                </button>
                <button type="button" className={`chip${!s.answer ? ' on bad' : ''}`} aria-pressed={!s.answer} onClick={() => update({ answer: false })}>
                  <XIcon size={15} /> غلط
                </button>
              </div>
            </div>
            <textarea
              className="textarea"
              rows={2}
              placeholder="الشرح (اختياري)"
              value={s.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}
