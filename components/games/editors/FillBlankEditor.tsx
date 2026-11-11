'use client';

import { Fragment, useRef, useState } from 'react';
import { XIcon } from '@/components/ui/icons';
import { fillBlankDef, newFillItem, type FillContent, type FillItem } from '@/lib/games/defs/fillBlank';
import { uid } from '@/lib/games/random';
import { parseBlanks } from '@/lib/games/text';
import type { EditorProps } from '../types';
import { BulkImport, ItemList, mergeItems } from './parts';

function BlankPreview({ text }: { text: string }) {
  const parts = parseBlanks(text);
  if (!parts.some((p) => p.kind === 'blank')) return <span className="badge badge-bad">لسه مفيش فراغ: حدد كلمة ودوس «اعمله فراغ»</span>;
  return (
    <div className="ad-blank-preview">
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          <Fragment key={i}>{p.text}</Fragment>
        ) : (
          <span key={i} className="ad-blank" title={p.answers.length > 1 ? `إجابات مقبولة: ${p.answers.join('، ')}` : undefined}>
            {p.answers[0] || '؟'}
            {p.answers.length > 1 && <small> +{p.answers.length - 1}</small>}
          </span>
        ),
      )}
    </div>
  );
}

function ItemEditor({ item, update }: { item: FillItem; update: (patch: Partial<FillItem>) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function makeBlank() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    if (s === e) {
      el.focus();
      return;
    }
    const picked = value.slice(s, e).trim();
    if (!picked) return;
    const next = `${value.slice(0, s)}[[${picked}]]${value.slice(e)}`;
    update({ text: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + picked.length + 4;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <textarea
        ref={ref}
        className="textarea"
        rows={2}
        placeholder="اكتب الجملة كاملة، وبعدين حدد الكلمة اللي عايزها فراغ ودوس «اعمله فراغ»"
        value={item.text}
        onChange={(e) => update({ text: e.target.value })}
      />
      <div className="row">
        <button type="button" className="btn btn-ink btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={makeBlank}>
          [ ] اعمله فراغ
        </button>
        <span className="muted">أو اكتب الإجابة بين [[ ]]، ولو فيه أكتر من إجابة صح افصل بـ | زي [[الطالب|التلميذ]]</span>
      </div>
      <BlankPreview text={item.text} />
      <textarea
        className="textarea"
        rows={2}
        placeholder="الشرح (اختياري)"
        value={item.explanation}
        onChange={(e) => update({ explanation: e.target.value })}
      />
    </div>
  );
}

function WordChips({ words, onChange }: { words: string[]; onChange: (words: string[]) => void }) {
  const [draft, setDraft] = useState('');
  function add() {
    const fresh = draft
      .split(/[،,\n]/)
      .map((w) => w.trim())
      .filter((w) => w && !words.includes(w));
    if (fresh.length) onChange([...words, ...fresh].slice(0, 30));
    setDraft('');
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input input-sm"
          style={{ flex: 1, minWidth: 180 }}
          placeholder="كلمة غلط تظهر في البنك، ودوس Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={add} disabled={!draft.trim()}>
          ضيف
        </button>
      </div>
      {words.length > 0 && (
        <div className="chips">
          {words.map((w) => (
            <span key={w} className="chip">
              {w}
              <button type="button" className="ad-chip-x" aria-label={`امسح ${w}`} onClick={() => onChange(words.filter((x) => x !== w))}>
                <XIcon size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FillBlankEditor({ value, onChange }: EditorProps<FillContent>) {
  const setItems = (items: FillItem[]) => onChange({ ...value, items });
  const bank = value.mode === 'bank';
  return (
    <div className="stack">
      <div className="field-row">
        <div className="field">
          <span className="field-label">الطالب هيجاوب إزاي؟</span>
          <div className="chips">
            <button type="button" className={`chip${bank ? ' on' : ''}`} onClick={() => onChange({ ...value, mode: 'bank' })}>
              يختار من بنك كلمات
            </button>
            <button type="button" className={`chip${!bank ? ' on' : ''}`} onClick={() => onChange({ ...value, mode: 'type' })}>
              يكتب الإجابة
            </button>
          </div>
        </div>
        <label className="check" style={{ alignSelf: 'end', minHeight: 40 }}>
          <input type="checkbox" checked={value.ignoreDiacritics} onChange={(e) => onChange({ ...value, ignoreDiacritics: e.target.checked })} />
          تجاهل التشكيل في التصحيح
        </label>
      </div>
      {bank && (
        <div className="field">
          <span className="field-label">كلمات زيادة للبنك (عشان يبقى فيه اختيار)</span>
          <WordChips words={value.distractors} onChange={(distractors) => onChange({ ...value, distractors })} />
        </div>
      )}
      <div className="row">
        <BulkImport
          title="الصق جمل كتير مرة واحدة"
          help={
            <>
              كل جملة في سطر، وحط الإجابة بين <b>[[ ]]</b>. ولو عايز شرح، اكتبه بعد علامة <b>=</b>.
            </>
          }
          example={'يُرفع المثنى بـ[[الألف]] نيابة عن الضمة = مثل: حضر الطالبان\nتُرفع الأفعال الخمسة بـ[[ثبوت النون]]'}
          parse={(text) =>
            text
              .split('\n')
              .map((l) => l.split(/\s+=\s+/))
              .filter((p) => /\[\[[^\]]+\]\]/.test(p[0]))
              .map((p) => ({ id: uid(), text: p[0].trim(), explanation: (p[1] ?? '').trim() }))
          }
          forms={fillBlankDef.itemForms}
          onImport={(items, mode) => setItems(mergeItems(value.items, items, mode, (it) => !it.text.trim()))}
        />
      </div>
      <ItemList
        items={value.items}
        onChange={setItems}
        make={newFillItem}
        noun="الجملة"
        addLabel="ضيف جملة"
        max={50}
        render={(item, update) => <ItemEditor item={item} update={update} />}
      />
    </div>
  );
}
