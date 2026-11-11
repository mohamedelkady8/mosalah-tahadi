'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { RichText } from '@/components/games/parts';
import { ShareButton } from '@/components/hub/ShareButton';
import { CalendarIcon, EditIcon, PlusIcon, QuestionIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteDailyQuestion, saveDailyQuestion } from '@/lib/actions/admin';
import { formatDayKey } from '@/lib/format';
import { FACEBOOK_GROUP } from '@/lib/sections';
import type { DailyQuestion } from '@/lib/types';
import { GradeSelect, gradeName, type GradeOption } from './GradeSelect';
import { Modal } from './Modal';
import { ImageUpload } from './upload';

type Draft = { id?: string; day: string; grade_id: string | null; question: string; image_url: string | null; post_url: string };

function nextDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export function DailyManager({ questions: serverQuestions, grades, today }: { questions: DailyQuestion[]; grades: GradeOption[]; today: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [questions, removeOptimistic] = useOptimistic(serverQuestions, (state: DailyQuestion[], id: string) => state.filter((q) => q.id !== id));
  const [editing, setEditing] = useState<Draft | null>(null);

  const todays = questions.filter((q) => q.day === today);
  const upcoming = questions.filter((q) => q.day > today).sort((a, b) => a.day.localeCompare(b.day));
  const past = questions.filter((q) => q.day < today).sort((a, b) => b.day.localeCompare(a.day));
  const lastPlanned = upcoming.at(-1)?.day ?? today;

  const fresh = (day: string): Draft => ({ day, grade_id: null, question: '', image_url: null, post_url: '' });
  const toDraft = (q: DailyQuestion): Draft => ({ id: q.id, day: q.day, grade_id: q.grade_id, question: q.question, image_url: q.image_url, post_url: q.post_url ?? '' });

  function remove(q: DailyQuestion) {
    if (!confirm(`تمسح سؤال ${formatDayKey(q.day)}؟`)) return;
    start(async () => {
      removeOptimistic(q.id);
      const r = await deleteDailyQuestion(q.id);
      if (!r.ok) return toast(r.error);
      toast(r.message ?? 'اتمسح.');
      router.refresh();
    });
  }

  const item = (q: DailyQuestion) => (
    <li key={q.id} className="ad-dq">
      {q.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.image_url} alt="" className="ad-dq-img" loading="lazy" />
      )}
      <div className="grow stack" style={{ gap: 6 }}>
        <span className="ad-dq-meta">
          <b>{formatDayKey(q.day)}</b>
          <span className="badge">{gradeName(grades, q.grade_id)}</span>
          {q.post_url ? (
            <a href={q.post_url} target="_blank" rel="noopener noreferrer" className="badge badge-ok">
              مربوط ببوست
            </a>
          ) : (
            <span className="badge badge-gold" title="زرار «جاوب» هيودي على الجروب نفسه">
              من غير رابط بوست
            </span>
          )}
        </span>
        <p className="ad-dq-q">
          <RichText text={q.question} />
        </p>
      </div>
      <div className="ad-item-tools">
        <ShareButton text={q.question} label="" copy className="icon-btn" title="انسخ السؤال عشان تنزله على الجروب" />
        <button type="button" className="icon-btn" onClick={() => setEditing(toDraft(q))} title="عدّل" aria-label="عدّل السؤال">
          <EditIcon size={16} />
        </button>
        <button type="button" className="icon-btn danger" disabled={pending} onClick={() => remove(q)} title="امسح" aria-label="امسح السؤال">
          <TrashIcon size={16} />
        </button>
      </div>
    </li>
  );

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>سؤال النهارده</h2>
          <span className="muted">{formatDayKey(today)}</span>
        </div>
        {todays.length ? (
          <ul className="ad-list">{todays.map(item)}</ul>
        ) : (
          <div className="empty" style={{ padding: '18px 12px' }}>
            <div className="e-ic">
              <QuestionIcon size={26} />
            </div>
            <h3>لسه مفيش سؤال النهارده</h3>
            <p>اكتب السؤال هنا، وانزله على الجروب، وبعدين حط رابط البوست عشان الطلاب يجاوبوا في الكومنتات.</p>
            <button type="button" className="btn btn-gold" onClick={() => setEditing(fresh(today))}>
              <PlusIcon size={18} /> نزّل سؤال النهارده
            </button>
          </div>
        )}
        {todays.length > 0 && todays.length <= grades.length && (
          <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => setEditing(fresh(today))}>
            <PlusIcon size={16} /> سؤال تاني النهارده لمرحلة معيّنة
          </button>
        )}
      </section>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>الأيام الجاية</h2>
          <button type="button" className="btn btn-sm btn-gold" onClick={() => setEditing(fresh(nextDay(lastPlanned)))}>
            <CalendarIcon size={16} /> جهّز سؤال ليوم جاي
          </button>
        </div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          جهّز أسئلة الأسبوع مرة واحدة. كل سؤال بيظهر للطلاب في يومه بس.
        </p>
        {upcoming.length ? <ul className="ad-list">{upcoming.map(item)}</ul> : <p className="ad-empty">مفيش أسئلة متجهزة للأيام الجاية.</p>}
      </section>

      {past.length > 0 && (
        <section className="ad-panel">
          <h2>الأيام اللي فاتت</h2>
          <ul className="ad-list">{past.map(item)}</ul>
        </section>
      )}

      {editing && <DailyForm key={editing.id ?? editing.day} initial={editing} grades={grades} today={today} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DailyForm({ initial, grades, today, onClose }: { initial: Draft; grades: GradeOption[]; today: string; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState<Draft>(initial);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const badPost = d.post_url.trim().length > 0 && !/^https:\/\/\S+$/i.test(d.post_url.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveDailyQuestion({ ...d, post_url: d.post_url.trim() });
      if (!r.ok) return toast(r.error);
      toast(r.message ?? 'اتحفظ.');
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal title={initial.id ? 'تعديل السؤال' : 'سؤال جديد'} onClose={onClose} width={620}>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="dq-day">اليوم</label>
            <input id="dq-day" className="input" type="date" value={d.day} onChange={(e) => set({ day: e.target.value })} required />
            <span className="hint">{d.day ? (d.day === today ? 'النهارده' : formatDayKey(d.day)) : 'اختار اليوم'}</span>
          </div>
          <div className="field">
            <label htmlFor="dq-grade">لمين؟</label>
            <GradeSelect id="dq-grade" grades={grades} value={d.grade_id} onChange={(grade_id) => set({ grade_id })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="dq-q">السؤال</label>
          <textarea
            id="dq-q"
            className="textarea"
            rows={4}
            maxLength={800}
            value={d.question}
            onChange={(e) => set({ question: e.target.value })}
            placeholder="مثلًا: أعرب ما تحته خط: قرأتُ [كتابًا] مفيدًا."
            autoFocus={!initial.id}
            required
          />
          <span className="hint">الكلمة اللي بين [ ] هيتحط تحتها خط، واللي بين « » هتتلوّن.</span>
        </div>
        <div className="field">
          <label>
            صورة <span className="muted">(اختياري)</span>
          </label>
          <ImageUpload value={d.image_url} onChange={(image_url) => set({ image_url })} folder="daily" alt="صورة السؤال" emptyText="لو السؤال على صورة أو قطعة، ارفعها هنا" />
        </div>
        <div className="field">
          <label htmlFor="dq-post">
            رابط البوست على الجروب <span className="muted">(اختياري)</span>
          </label>
          <input
            id="dq-post"
            className="input ltr"
            dir="ltr"
            type="url"
            inputMode="url"
            value={d.post_url}
            onChange={(e) => set({ post_url: e.target.value })}
            placeholder={FACEBOOK_GROUP}
          />
          {badPost ? (
            <span className="form-error">الرابط لازم يكون كامل ويبدأ بـ https://</span>
          ) : (
            <span className="hint">انزل السؤال على الجروب وانسخ رابط البوست هنا. لو سبته فاضي، زرار «جاوب على جروب الفيس» هيودي على الجروب نفسه.</span>
          )}
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-gold" disabled={pending || badPost || d.question.trim().length < 3 || !d.day}>
            {pending ? <span className="spinner" /> : null} {initial.id ? 'احفظ التعديلات' : 'ضيف السؤال'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
