'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowDownIcon, ArrowUpIcon, EditIcon, GradeIcon, GRADE_ICON_LABELS, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteGrade, deleteTrack, moveGrade, saveGrade, saveTrack, type ActionResult } from '@/lib/actions/admin';
import { num } from '@/lib/format';
import type { Catalog, GradeWithTracks, Track } from '@/lib/types';
import { Modal } from './Modal';

type Counts = Record<string, { students: number; games: number }>;

function useRun() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error);
      if (r.message) toast(r.message);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

export function GradesManager({ catalog, counts, trackCounts }: { catalog: Catalog; counts: Counts; trackCounts: Record<string, number> }) {
  const [editing, setEditing] = useState<GradeWithTracks | 'new' | null>(null);
  const { pending, run } = useRun();
  const trackNames = (g: GradeWithTracks) => g.trackIds.map((id) => catalog.tracks.find((t) => t.id === id)?.name).filter(Boolean);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>المراحل</h2>
          <button type="button" className="btn btn-sm btn-gold" onClick={() => setEditing('new')}>
            <PlusIcon size={18} /> مرحلة جديدة
          </button>
        </div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          بنفس الترتيب ده بتظهر في صفحة «اختار مرحلتك». المرحلة المخفية مش بتظهر للطلاب الجداد، بس الطلاب اللي فيها بيفضلوا شايفين ألعابهم.
        </p>
        {catalog.grades.length ? (
          <ul className="ad-list">
            {catalog.grades.map((g, i) => {
              const c = counts[g.id] ?? { students: 0, games: 0 };
              return (
                <li key={g.id}>
                  <span className="ad-gi" aria-hidden="true">
                    <GradeIcon icon={g.icon} />
                  </span>
                  <div className="grow">
                    <b>
                      {g.name} {!g.active && <span className="badge">مخفية</span>}
                    </b>
                    <small>
                      {g.subtitle} · {trackNames(g).join('، ') || 'من غير شعب'}
                    </small>
                  </div>
                  <span className="badge">{num(c.students)} طالب</span>
                  <span className="badge badge-gold">{num(c.games)} لعبة</span>
                  <div className="ad-item-tools">
                    <button type="button" className="icon-btn" disabled={pending || i === 0} onClick={() => run(() => moveGrade(g.id, -1))} aria-label={`طلّع ${g.name}`} title="لفوق">
                      <ArrowUpIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={pending || i === catalog.grades.length - 1}
                      onClick={() => run(() => moveGrade(g.id, 1))}
                      aria-label={`نزّل ${g.name}`}
                      title="لتحت"
                    >
                      <ArrowDownIcon size={16} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setEditing(g)} aria-label={`عدّل ${g.name}`} title="تعديل">
                      <EditIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      disabled={pending}
                      aria-label={`امسح ${g.name}`}
                      title="امسح"
                      onClick={() => {
                        const warn = c.students || c.games ? ` فيها ${num(c.students)} طالب و${num(c.games)} لعبة، الطلاب هيبقوا من غير مرحلة والألعاب هتتشال منها.` : '';
                        if (confirm(`تمسح ${g.name}؟${warn} لو عايز تخبيها بس، عدّلها وشيل علامة «ظاهرة».`)) run(() => deleteGrade(g.id));
                      }}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">مفيش مراحل لسه.</p>
        )}
      </section>

      <TracksPanel tracks={catalog.tracks} counts={trackCounts} />

      {editing && <GradeModal grade={editing === 'new' ? null : editing} tracks={catalog.tracks} onClose={() => setEditing(null)} />}
    </div>
  );
}

function GradeModal({ grade, tracks, onClose }: { grade: GradeWithTracks | null; tracks: Track[]; onClose: () => void }) {
  const [name, setName] = useState(grade?.name ?? '');
  const [subtitle, setSubtitle] = useState(grade?.subtitle ?? '');
  const [label, setLabel] = useState(grade?.label ?? 'طلاب');
  const [slug, setSlug] = useState(grade?.slug ?? '');
  const [icon, setIcon] = useState(grade?.icon ?? 'cap');
  const [active, setActive] = useState(grade?.active ?? true);
  const [trackIds, setTrackIds] = useState<string[]>(grade?.trackIds ?? []);
  const { pending, run } = useRun();

  return (
    <Modal title={grade ? `تعديل ${grade.name}` : 'مرحلة جديدة'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveGrade({ id: grade?.id, name, subtitle, label, slug, icon, active, trackIds }), onClose);
        }}
      >
        <div className="field-row">
          <div className="field">
            <label htmlFor="gr-name">الاسم</label>
            <input id="gr-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} placeholder="٣ ثانوي" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="gr-label">الكلمة اللي فوق الاسم</label>
            <input id="gr-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} placeholder="طلاب" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="gr-sub">الوصف</label>
          <input id="gr-sub" className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={80} placeholder="الصف الثالث الثانوي" />
        </div>
        <div className="field">
          <label htmlFor="gr-slug">الرابط</label>
          <input
            id="gr-slug"
            className="input ltr"
            dir="ltr"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            required
            maxLength={40}
            placeholder="sec3"
          />
          <span className="hint">بيظهر في رابط الصفحة: /grades/{slug || '...'}</span>
        </div>
        <div className="field">
          <span className="field-label">الأيقونة</span>
          <div className="chips" role="radiogroup" aria-label="الأيقونة">
            {Object.entries(GRADE_ICON_LABELS).map(([key, text]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={icon === key}
                className={`chip${icon === key ? ' on' : ''}`}
                onClick={() => setIcon(key)}
                title={text}
              >
                <span style={{ width: 20, height: 20, display: 'inline-flex' }}>
                  <GradeIcon icon={key} color="currentColor" />
                </span>
                {text}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">الشعب اللي فيها</span>
          <div className="chips">
            {tracks.map((t) => {
              const on = trackIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  className={`chip${on ? ' on' : ''}`}
                  onClick={() => setTrackIds(on ? trackIds.filter((x) => x !== t.id) : [...trackIds, t.id])}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          <span className="hint">لو فيها شعبتين، الطالب هيختار شعبته وهو بيسجّل، وتقدر تعمل ألعاب لشعبة واحدة بس.</span>
        </div>
        <label className="check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          ظاهرة للطلاب
        </label>
        <button type="submit" className="btn btn-gold btn-block" disabled={pending}>
          {pending && <span className="spinner" />} {grade ? 'احفظ التعديلات' : 'ضيف المرحلة'}
        </button>
      </form>
    </Modal>
  );
}

function TracksPanel({ tracks, counts }: { tracks: Track[]; counts: Record<string, number> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const { pending, run } = useRun();

  const begin = (t: Track | null) => {
    setEditing(t?.id ?? 'new');
    setName(t?.name ?? '');
    setSlug(t?.slug ?? '');
  };
  const form = (id?: string) => (
    <form
      className="row"
      style={{ gap: 8, width: '100%' }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveTrack({ id, name, slug }), () => setEditing(null));
      }}
    >
      <input className="input input-sm" style={{ flex: 2, minWidth: 140 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الشعبة" aria-label="اسم الشعبة" required maxLength={40} autoFocus />
      <input
        className="input input-sm ltr"
        dir="ltr"
        style={{ flex: 1, minWidth: 110 }}
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
        placeholder="bac"
        aria-label="رابط الشعبة"
        required
        maxLength={40}
      />
      <button type="submit" className="btn btn-sm btn-gold" disabled={pending}>
        احفظ
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>
        إلغاء
      </button>
    </form>
  );

  return (
    <section className="ad-panel">
      <div className="ad-panel-head">
        <h2>الشعب</h2>
        <button type="button" className="btn btn-sm btn-gold" onClick={() => begin(null)} disabled={editing === 'new'}>
          <PlusIcon size={18} /> شعبة جديدة
        </button>
      </div>
      <ul className="ad-list">
        {tracks.map((t) => (
          <li key={t.id}>
            {editing === t.id ? (
              form(t.id)
            ) : (
              <>
                <div className="grow">
                  <b>{t.name}</b>
                  <small dir="ltr">{t.slug}</small>
                </div>
                <span className="badge">{num(counts[t.id] ?? 0)} طالب</span>
                <div className="ad-item-tools">
                  <button type="button" className="icon-btn" onClick={() => begin(t)} aria-label={`عدّل ${t.name}`} title="تعديل">
                    <EditIcon size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={pending}
                    aria-label={`امسح ${t.name}`}
                    title="امسح"
                    onClick={() =>
                      confirm(`تمسح شعبة ${t.name}؟ هتتشال من كل المراحل، والطلاب اللي فيها هيبقوا من غير شعبة.`) && run(() => deleteTrack(t.id))
                    }
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {editing === 'new' && <li>{form()}</li>}
      </ul>
    </section>
  );
}
