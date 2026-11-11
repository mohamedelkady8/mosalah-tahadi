'use client';

import { CheckIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { mcqDef, newMcqQuestion, type McqContent, type McqQuestion } from '@/lib/games/defs/mcq';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';
import { BulkImport, ImageField, ItemList, mergeItems } from './parts';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const EXAMPLE = `ما إعراب «العلمُ» في: العلمُ نورٌ؟
* مبتدأ مرفوع
خبر مرفوع
فاعل مرفوع
= لأنه جه في أول الجملة الاسمية

علامة رفع المثنى هي:
الواو
* الألف
الضمة`;

function parseBulk(text: string): McqQuestion[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length >= 3)
    .map((lines) => {
      const [prompt, ...rest] = lines;
      const options: string[] = [];
      let correct = 0;
      let explanation = '';
      for (const line of rest) {
        if (line.startsWith('=')) explanation = line.slice(1).trim();
        else if (line.startsWith('*')) {
          correct = options.length;
          options.push(line.slice(1).trim());
        } else options.push(line.replace(/^[-–•]\s*/, ''));
      }
      const opts = options.filter(Boolean).slice(0, 6);
      return { id: uid(), prompt, image: '', options: opts, correct: Math.min(correct, Math.max(0, opts.length - 1)), explanation };
    })
    .filter((q) => q.options.length >= 2);
}

const isBlank = (q: McqQuestion) => !q.prompt.trim() && q.options.every((o) => !o.trim());

export default function McqEditor({ value, onChange }: EditorProps<McqContent>) {
  const setQuestions = (questions: McqQuestion[]) => onChange({ ...value, questions });

  return (
    <div className="stack">
      <div className="row">
        <BulkImport
          title="الصق أسئلة كتير مرة واحدة"
          help={
            <>
              اكتب كل سؤال في سطر، وتحته الاختيارات كل واحد في سطر. حط <b>*</b> قبل الإجابة الصح، و<b>=</b> قبل الشرح لو حابب. وسيب سطر فاضي بين كل سؤال والتاني.
            </>
          }
          example={EXAMPLE}
          parse={parseBulk}
          forms={mcqDef.itemForms}
          onImport={(items, mode) => setQuestions(mergeItems(value.questions, items, mode, isBlank))}
        />
      </div>
      <ItemList
        items={value.questions}
        onChange={setQuestions}
        make={newMcqQuestion}
        noun="السؤال"
        addLabel="ضيف سؤال"
        max={100}
        render={(q, update) => (
          <div className="stack" style={{ gap: 10 }}>
            <textarea
              className="textarea"
              rows={2}
              placeholder="اكتب السؤال... ولو عايز تلوّن كلمة حطها بين « »"
              value={q.prompt}
              onChange={(e) => update({ prompt: e.target.value })}
            />
            <ImageField value={q.image} onChange={(image) => update({ image })} />
            <div className="ad-options">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`ad-option${q.correct === oi ? ' on' : ''}`}>
                  <label className="ad-correct" title="دي الإجابة الصح">
                    <input type="radio" name={`correct-${q.id}`} checked={q.correct === oi} onChange={() => update({ correct: oi })} />
                    <CheckIcon size={16} />
                    <span className="visually-hidden">الإجابة الصح</span>
                  </label>
                  <input
                    className="input input-sm"
                    value={opt}
                    placeholder={`الاختيار ${LETTERS[oi]}`}
                    onChange={(e) => update({ options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={q.options.length <= 2}
                    aria-label="امسح الاختيار"
                    onClick={() =>
                      update({
                        options: q.options.filter((_, k) => k !== oi),
                        correct: q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct,
                      })
                    }
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              ))}
              {q.options.length < 6 && (
                <button type="button" className="btn btn-ghost btn-sm ad-add-inline" onClick={() => update({ options: [...q.options, ''] })}>
                  <PlusIcon size={16} /> ضيف اختيار
                </button>
              )}
            </div>
            <textarea
              className="textarea"
              rows={2}
              placeholder="الشرح اللي يظهر بعد الإجابة (اختياري)"
              value={q.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}
