'use client';

import { useId } from 'react';
import { CheckIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { mcqDef, newMcqQuestion, problemOf, type McqContent, type McqQuestion } from '@/lib/games/defs/mcq';
import { uid } from '@/lib/games/random';
import type { EditorProps } from '../types';
import { BulkImport, ImageField, ItemList, mergeItems } from './parts';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

/** The mistakes the team usually names in a wrong option's explanation. */
const PROBLEMS = ['عدم التركيز', 'مش عارف القاعدة', 'حكمت بالظاهر', 'التسرع'];

const EXAMPLE = `ما إعراب «العلمُ» في: العلمُ نورٌ؟
* مبتدأ مرفوع
خبر مرفوع
فاعل مرفوع
= لأنه جه في أول الجملة الاسمية

علامة رفع المثنى هي:
الواو
* الألف
الضمة`;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** One question from the old «ع السريع» data ({s, q, o, a, e}) or from this site's own format. */
function fromJson(item: unknown): McqQuestion | null {
  if (!item || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const options = (Array.isArray(r.o) ? r.o : Array.isArray(r.options) ? r.options : []).map(str).filter(Boolean).slice(0, 6);
  const prompt = str(r.q ?? r.prompt);
  if (!prompt || options.length < 2) return null;
  const correct = Number(r.a ?? r.correct);
  const whys = (Array.isArray(r.e) ? r.e : Array.isArray(r.whys) ? r.whys : []).map(str).slice(0, options.length);
  return {
    id: uid(),
    passage: str(r.s ?? r.passage),
    prompt,
    image: str(r.image),
    options,
    correct: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0,
    explanation: str(r.explanation),
    whys: whys.some(Boolean) ? whys : [],
  };
}

/** Accepts a JSON array, an object with a "Q" array, or the old site's whole `const D = {...}` snippet. */
function parseJson(text: string): McqQuestion[] | null {
  const clean = text.replace(/^\s*\/\/.*$/gm, '');
  const start = clean.search(/[[{]/);
  const end = Math.max(clean.lastIndexOf(']'), clean.lastIndexOf('}'));
  if (start < 0 || end <= start) return null;
  try {
    const data: unknown = JSON.parse(clean.slice(start, end + 1));
    const list = Array.isArray(data) ? data : data && typeof data === 'object' && Array.isArray((data as { Q?: unknown }).Q) ? (data as { Q: unknown[] }).Q : null;
    if (!list) return null;
    return list.map(fromJson).filter((q): q is McqQuestion => q !== null);
  } catch {
    return null;
  }
}

function parseLines(text: string): McqQuestion[] {
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
      return { id: uid(), passage: '', prompt, image: '', options: opts, correct: Math.min(correct, Math.max(0, opts.length - 1)), explanation, whys: [] };
    })
    .filter((q) => q.options.length >= 2);
}

function parseBulk(text: string): McqQuestion[] {
  return /^\s*(\/\/|const\s|\[|\{)/.test(text) ? (parseJson(text) ?? []) : parseLines(text);
}

/** Puts "(مشكلتك: X)" right after a leading "خطأ؛", replacing any problem the explanation already names. */
function withProblem(why: string, problem: string): string {
  const rest = why.replace(/\(\s*مشكلتك\s*[:：][^)]*\)\s*[؛;]?\s*/g, '');
  const lead = /^\s*(خطأ|غلط)\s*[؛;:]\s*/.exec(rest);
  const body = lead ? rest.slice(lead[0].length) : rest;
  return `خطأ؛ (مشكلتك: ${problem})؛ ${body}`.trimEnd();
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
              <br />
              وتقدر كمان تلصق أسئلة موقع «ع السريع» القديم زي ما هي (<span dir="ltr">s, q, o, a, e</span>)، وهتتنقل بالنص والشرح ومشاكل كل اختيار.
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
        render={(q, update) => <QuestionEditor q={q} update={update} />}
      />
    </div>
  );
}

function QuestionEditor({ q, update }: { q: McqQuestion; update: (patch: Partial<McqQuestion>) => void }) {
  const domId = useId();
  const perOption = q.whys.length > 0;
  const whyOf = (i: number) => q.whys[i] ?? '';
  const setWhy = (i: number, text: string) => update({ whys: q.options.map((_, k) => (k === i ? text : whyOf(k))) });

  function togglePerOption(on: boolean) {
    if (on) {
      const whys = q.options.map((_, k) => (k === q.correct && q.explanation ? `صواب؛ ${q.explanation}` : ''));
      update({ whys: whys.some(Boolean) ? whys : q.options.map(() => ''), explanation: '' });
    } else {
      update({ whys: [], explanation: q.explanation || whyOf(q.correct).replace(/^\s*(صواب|صح)\s*[؛;:]\s*/, '') });
    }
  }

  function removeOption(oi: number) {
    update({
      options: q.options.filter((_, k) => k !== oi),
      whys: q.whys.filter((_, k) => k !== oi),
      correct: q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct,
    });
  }

  function addOption() {
    update({ options: [...q.options, ''], whys: perOption ? [...q.options.map((_, k) => whyOf(k)), ''] : q.whys });
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="field">
        <label className="field-label" htmlFor={`${domId}-passage`}>
          نص أو جملة السؤال عليها <span className="muted">(اختياري)</span>
        </label>
        <textarea
          id={`${domId}-passage`}
          className="textarea"
          rows={q.passage ? 2 : 1}
          style={{ minHeight: q.passage ? 70 : 48 }}
          placeholder="مثلًا: لا تتعجّل الحكم على تجربة أخفقت؛ فقد تقودك أفكار [أُخَر] إلى حلّ [أنفع]."
          value={q.passage}
          onChange={(e) => update({ passage: e.target.value })}
        />
        <span className="hint">الكلمة اللي بين [ ] هيتحط تحتها خط، واللي بين « » هتتلوّن.</span>
      </div>
      <textarea
        className="textarea"
        rows={2}
        placeholder="اكتب السؤال... ولو عايز تلوّن كلمة حطها بين « »"
        value={q.prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        aria-label="السؤال"
      />
      <ImageField value={q.image} onChange={(image) => update({ image })} />
      <div className="ad-options">
        {q.options.map((opt, oi) => {
          const why = whyOf(oi);
          const problem = problemOf(why);
          return (
            <div key={oi} className={`ad-opt-block${perOption ? ' with-why' : ''}`}>
              <div className={`ad-option${q.correct === oi ? ' on' : ''}`}>
                <label className="ad-correct" title="دي الإجابة الصح">
                  <input type="radio" name={`${domId}-correct`} checked={q.correct === oi} onChange={() => update({ correct: oi })} />
                  <CheckIcon size={16} />
                  <span className="visually-hidden">الإجابة الصح</span>
                </label>
                <input
                  className="input input-sm"
                  value={opt}
                  placeholder={`الاختيار ${LETTERS[oi]}`}
                  onChange={(e) => update({ options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                />
                <button type="button" className="icon-btn danger" disabled={q.options.length <= 2} aria-label="امسح الاختيار" onClick={() => removeOption(oi)}>
                  <XIcon size={16} />
                </button>
              </div>
              {perOption && (
                <div className="ad-why">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={why}
                    onChange={(e) => setWhy(oi, e.target.value)}
                    placeholder={q.correct === oi ? 'صواب؛ لأن...' : 'خطأ؛ (مشكلتك: ...)؛ لأن...'}
                    aria-label={`شرح الاختيار ${LETTERS[oi]}`}
                  />
                  {q.correct !== oi && (
                    <div className="ad-why-tags" role="group" aria-label={`مشكلة الاختيار ${LETTERS[oi]}`}>
                      <span>مشكلته:</span>
                      {PROBLEMS.map((p) => (
                        <button key={p} type="button" className={`chip${problem === p ? ' on' : ''}`} aria-pressed={problem === p} onClick={() => setWhy(oi, withProblem(why, p))}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {q.options.length < 6 && (
          <button type="button" className="btn btn-ghost btn-sm ad-add-inline" onClick={addOption}>
            <PlusIcon size={16} /> ضيف اختيار
          </button>
        )}
      </div>
      <label className="check" style={{ fontSize: 15 }}>
        <input type="checkbox" checked={perOption} onChange={(e) => togglePerOption(e.target.checked)} />
        اشرح كل اختيار لوحده (الطالب هيشوف ليه اختياره غلط، ومشكلته فين)
      </label>
      {!perOption && (
        <textarea
          className="textarea"
          rows={2}
          placeholder="الشرح اللي يظهر بعد الإجابة (اختياري)"
          value={q.explanation}
          onChange={(e) => update({ explanation: e.target.value })}
          aria-label="الشرح"
        />
      )}
    </div>
  );
}
