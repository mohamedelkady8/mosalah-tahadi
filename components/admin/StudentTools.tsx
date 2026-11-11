'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { KeyIcon, PlusIcon, RefreshIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { Modal } from './Modal';
import {
  clearStudentAttempts,
  createStudent,
  deleteAttempt,
  deleteStudent,
  resetStudentPassword,
  setUserRole,
  updateStudent,
  type ActionResult,
} from '@/lib/actions/admin';
import type { Catalog, UserRole } from '@/lib/types';

const randomPassword = () => {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(10_000_000 + (bytes[0] % 90_000_000));
};

function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: (r: Extract<ActionResult, { ok: true }>) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error);
      if (r.message) toast(r.message);
      if (after) after(r);
      else router.refresh();
    });
  return { pending, run, router };
}

export function GradeTrackFields({
  catalog,
  gradeId,
  trackId,
  onChange,
  allowNone = false,
}: {
  catalog: Catalog;
  gradeId: string;
  trackId: string;
  onChange: (gradeId: string, trackId: string) => void;
  allowNone?: boolean;
}) {
  const grade = catalog.grades.find((g) => g.id === gradeId);
  const tracks = (grade?.trackIds ?? []).map((id) => catalog.tracks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <>
      <div className="field">
        <label htmlFor="st-grade">المرحلة</label>
        <select id="st-grade" className="select" value={gradeId} onChange={(e) => onChange(e.target.value, '')}>
          {allowNone ? <option value="">من غير مرحلة</option> : <option value="">اختار المرحلة</option>}
          {catalog.grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.active ? '' : ' (مخفية)'}
            </option>
          ))}
        </select>
      </div>
      {tracks.length > 1 && (
        <div className="field">
          <span className="field-label">الشعبة</span>
          <div className="chips" role="radiogroup" aria-label="الشعبة">
            {tracks.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={trackId === t.id}
                className={`chip${trackId === t.id ? ' on' : ''}`}
                onClick={() => onChange(gradeId, t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function NewStudentButton({ catalog, canCreate }: { catalog: Catalog; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState(randomPassword);
  const [gradeId, setGradeId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [error, setError] = useState('');
  const { pending, run, router } = useAction();

  if (!canCreate) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    run(
      async () => {
        const r = await createStudent({ full_name: name, identifier, password, grade_id: gradeId, track_id: trackId || null });
        if (!r.ok) setError(r.error);
        return r;
      },
      (r) => {
        setOpen(false);
        router.push(`/admin/students/${r.id}`);
      },
    );
  };

  return (
    <>
      <button type="button" className="btn btn-gold" onClick={() => setOpen(true)}>
        <PlusIcon size={20} /> طالب جديد
      </button>
      {open && (
        <Modal title="حساب طالب جديد" onClose={() => setOpen(false)}>
          <form className="stack" onSubmit={submit}>
            <div className="field">
              <label htmlFor="ns-name">اسم الطالب</label>
              <input id="ns-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="ns-id">رقم الموبايل أو الإيميل</label>
              <input
                id="ns-id"
                className="input ltr"
                dir="ltr"
                inputMode="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="01012345678"
              />
              <span className="hint">الطالب هيدخل بيه.</span>
            </div>
            <div className="field">
              <label htmlFor="ns-pass">كلمة السر</label>
              <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                <input
                  id="ns-pass"
                  className="input ltr"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={72}
                />
                <button type="button" className="icon-btn" onClick={() => setPassword(randomPassword())} title="كلمة سر جديدة" aria-label="كلمة سر جديدة">
                  <RefreshIcon size={18} />
                </button>
              </div>
              <span className="hint">ابعتها للطالب، ويقدر يغيّرها من صفحته.</span>
            </div>
            <GradeTrackFields
              catalog={catalog}
              gradeId={gradeId}
              trackId={trackId}
              onChange={(g, t) => {
                setGradeId(g);
                setTrackId(t);
              }}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-gold btn-block" disabled={pending}>
              {pending ? <span className="spinner" /> : <PlusIcon size={18} />} اعمل الحساب
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export interface StudentDetails {
  id: string;
  full_name: string;
  phone: string | null;
  grade_id: string | null;
  track_id: string | null;
  role: UserRole;
  contact: string;
}

export function StudentEditor({ student, catalog, isSelf, serviceKey }: { student: StudentDetails; catalog: Catalog; isSelf: boolean; serviceKey: boolean }) {
  const [name, setName] = useState(student.full_name);
  const [phone, setPhone] = useState(student.phone ?? '');
  const [gradeId, setGradeId] = useState(student.grade_id ?? '');
  const [trackId, setTrackId] = useState(student.track_id ?? '');
  const [password, setPassword] = useState('');
  const { pending, run, router } = useAction();

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="ad-panel">
        <h2>البيانات</h2>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateStudent(student.id, { full_name: name, phone, grade_id: gradeId || null, track_id: trackId || null }));
          }}
        >
          <div className="field">
            <label htmlFor="st-name">الاسم</label>
            <input id="st-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="st-phone">الموبايل</label>
            <input id="st-phone" className="input ltr" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            <span className="hint">الدخول بيفضل بـ {student.contact} حتى لو غيّرت الرقم هنا.</span>
          </div>
          <GradeTrackFields
            catalog={catalog}
            gradeId={gradeId}
            trackId={trackId}
            allowNone={student.role === 'admin'}
            onChange={(g, t) => {
              setGradeId(g);
              setTrackId(t);
            }}
          />
          <button type="submit" className="btn btn-gold" disabled={pending} style={{ alignSelf: 'flex-start' }}>
            احفظ البيانات
          </button>
        </form>
      </section>

      <section className="ad-panel stack">
        <h2>كلمة السر</h2>
        {serviceKey ? (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => resetStudentPassword(student.id, password),
                () => setPassword(''),
              );
            }}
          >
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <input
                className="input ltr"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة سر جديدة"
                aria-label="كلمة سر جديدة"
                minLength={6}
                maxLength={72}
                required
              />
              <button type="button" className="icon-btn" onClick={() => setPassword(randomPassword())} title="اعمل كلمة سر" aria-label="اعمل كلمة سر">
                <RefreshIcon size={18} />
              </button>
            </div>
            <button type="submit" className="btn btn-ink" disabled={pending} style={{ alignSelf: 'flex-start' }}>
              <KeyIcon size={18} /> غيّر كلمة السر
            </button>
            <span className="hint muted">لو الطالب نسي كلمة السر، اعمله واحدة جديدة وابعتهاله.</span>
          </form>
        ) : (
          <p className="muted">تغيير كلمة السر محتاج SUPABASE_SERVICE_ROLE_KEY على السيرفر.</p>
        )}
      </section>

      <section className="ad-panel stack">
        <h2>الصلاحية</h2>
        <p className="muted">
          {student.role === 'admin' ? 'الحساب ده أدمن: يقدر يدخل لوحة التحكم ويعدّل كل حاجة.' : 'الحساب ده طالب. لو خليته أدمن هيقدر يدخل لوحة التحكم ويعدّل كل حاجة.'}
        </p>
        {isSelf ? (
          <span className="badge">ده حسابك</span>
        ) : (
          <button
            type="button"
            className={`btn ${student.role === 'admin' ? 'btn-ghost' : 'btn-wine'}`}
            style={{ alignSelf: 'flex-start' }}
            disabled={pending}
            onClick={() => {
              const next = student.role === 'admin' ? 'student' : 'admin';
              if (confirm(next === 'admin' ? `تخلّي ${student.full_name} أدمن؟` : `ترجّع ${student.full_name} طالب؟`)) run(() => setUserRole(student.id, next));
            }}
          >
            {student.role === 'admin' ? 'رجّعه طالب' : 'خلّيه أدمن'}
          </button>
        )}
      </section>

      {!isSelf && (
        <section className="ad-panel ad-danger-zone stack">
          <h2>منطقة خطر</h2>
          <div className="row">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={pending}
              onClick={() => confirm('تمسح كل محاولات الطالب؟ نقطه هتبقى صفر.') && run(() => clearStudentAttempts(student.id))}
            >
              <RefreshIcon size={16} /> صفّر النقط وامسح المحاولات
            </button>
            {serviceKey && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={pending}
                onClick={() =>
                  confirm(`تمسح حساب ${student.full_name} خالص؟ مش هيقدر يدخل تاني وكل نتايجه هتتمسح.`) &&
                  run(
                    () => deleteStudent(student.id),
                    () => router.push('/admin/students'),
                  )
                }
              >
                <TrashIcon size={16} /> امسح الحساب
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export function DeleteAttemptButton({ id }: { id: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      className="icon-btn danger"
      title="امسح المحاولة"
      aria-label="امسح المحاولة"
      disabled={pending}
      onClick={() => confirm('تمسح المحاولة دي؟ نقط الطالب هتتحسب من جديد.') && run(() => deleteAttempt(id))}
    >
      <TrashIcon size={16} />
    </button>
  );
}
