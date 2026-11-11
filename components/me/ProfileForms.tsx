'use client';

import { useActionState, useState } from 'react';
import { changePasswordAction, updateProfileAction, type FormState } from '@/lib/actions/auth';
import type { Catalog } from '@/lib/types';

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="form-ok" role="status">
          {state.message}
        </p>
      )}
    </>
  );
}

export function ProfileForm({
  catalog,
  initial,
}: {
  catalog: Catalog;
  initial: { full_name: string; phone: string; grade_id: string; track_id: string };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, {} as FormState);
  const [gradeId, setGradeId] = useState(initial.grade_id);
  const [trackId, setTrackId] = useState(initial.track_id);
  const grades = catalog.grades.filter((g) => g.active || g.id === initial.grade_id);
  const grade = grades.find((g) => g.id === gradeId);
  const tracks = grade ? catalog.tracks.filter((t) => grade.trackIds.includes(t.id)) : [];

  return (
    <form action={action} className="form">
      <Messages state={state} />
      <div className="field">
        <label htmlFor="me-name">الاسم</label>
        <input id="me-name" name="full_name" className="input" defaultValue={initial.full_name} required minLength={2} maxLength={60} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="me-phone">رقم الموبايل (اختياري)</label>
        <input id="me-phone" name="phone" className="input ltr" dir="ltr" inputMode="tel" defaultValue={initial.phone} maxLength={20} autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="me-grade">المرحلة</label>
        <select
          id="me-grade"
          name="grade_id"
          className="select"
          value={gradeId}
          onChange={(e) => {
            setGradeId(e.target.value);
            setTrackId('');
          }}
          required
        >
          <option value="" disabled>
            اختار مرحلتك
          </option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      {tracks.length > 1 ? (
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label" style={{ marginBottom: 7 }}>
            الشعبة
          </legend>
          <div className="chips">
            {tracks.map((t) => (
              <label key={t.id} className="chip">
                <input type="radio" name="track_id" value={t.id} checked={trackId === t.id} onChange={() => setTrackId(t.id)} required />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="track_id" value={tracks[0]?.id ?? ''} />
      )}
      {gradeId !== initial.grade_id && <p className="hint muted">لو غيّرت المرحلة، هتشوف ألعاب المرحلة الجديدة، ونقطك هتفضل معاك.</p>}
      <button type="submit" className="btn btn-gold" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? <span className="spinner" /> : 'احفظ التعديلات'}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {} as FormState);
  return (
    <form action={action} className="form" key={state.message ? 'done' : 'form'}>
      <Messages state={state} />
      <div className="field">
        <label htmlFor="me-pass">كلمة السر الجديدة</label>
        <input id="me-pass" name="password" type="password" className="input ltr" dir="ltr" minLength={6} maxLength={72} required autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="me-pass2">اكتبها تاني</label>
        <input id="me-pass2" name="confirm" type="password" className="input ltr" dir="ltr" minLength={6} maxLength={72} required autoComplete="new-password" />
      </div>
      <button type="submit" className="btn btn-ink" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? <span className="spinner light" /> : 'غيّر كلمة السر'}
      </button>
    </form>
  );
}
