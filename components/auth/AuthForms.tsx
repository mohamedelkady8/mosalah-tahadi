'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { GradeIcon } from '@/components/ui/icons';
import { signInAction, signUpAction, type FormState } from '@/lib/actions/auth';
import type { Catalog } from '@/lib/types';

export function PasswordInput({
  name = 'password',
  autoComplete,
  defaultValue,
  placeholder,
}: {
  name?: string;
  autoComplete: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pass-wrap">
      <input
        id={name}
        name={name}
        type={show ? 'text' : 'password'}
        className="input ltr"
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required
        minLength={6}
      />
      <button type="button" className="pass-toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
        {show ? 'إخفاء' : 'إظهار'}
      </button>
    </div>
  );
}

function FormMessages({ state }: { state: FormState }) {
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

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, {} as FormState);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next ?? ''} />
      <FormMessages state={state} />
      <div className="field">
        <label htmlFor="identifier">رقم الموبايل أو الإيميل</label>
        <input
          id="identifier"
          name="identifier"
          className="input ltr"
          inputMode="email"
          autoComplete="username"
          placeholder="01012345678"
          defaultValue={state.values?.identifier}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">كلمة السر</label>
        <PasswordInput autoComplete="current-password" />
      </div>
      <button type="submit" className="btn btn-gold btn-lg btn-block" disabled={pending}>
        {pending ? <span className="spinner" /> : 'دخول'}
      </button>
      <p className="auth-foot">
        معندكش حساب؟ <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>اعمل حساب جديد</Link>
      </p>
    </form>
  );
}

export function SignupForm({ catalog, defaultGradeId }: { catalog: Catalog; defaultGradeId?: string }) {
  const [state, action, pending] = useActionState(signUpAction, {} as FormState);
  const grades = catalog.grades.filter((g) => g.active);
  const [gradeId, setGradeId] = useState(state.values?.grade_id || defaultGradeId || '');
  const [trackId, setTrackId] = useState(state.values?.track_id || '');
  const grade = grades.find((g) => g.id === gradeId);
  const gradeTracks = grade ? catalog.tracks.filter((t) => grade.trackIds.includes(t.id)) : [];

  return (
    <form action={action} className="form">
      <FormMessages state={state} />
      <div className="field">
        <label htmlFor="full_name">اسمك بالكامل</label>
        <input id="full_name" name="full_name" className="input" autoComplete="name" defaultValue={state.values?.full_name} required minLength={2} maxLength={60} />
      </div>
      <div className="field">
        <label htmlFor="identifier">رقم الموبايل أو الإيميل</label>
        <input
          id="identifier"
          name="identifier"
          className="input ltr"
          inputMode="email"
          autoComplete="username"
          placeholder="01012345678"
          defaultValue={state.values?.identifier}
          required
        />
        <span className="hint">هتسجل دخولك بيه بعد كده.</span>
      </div>
      <div className="field">
        <label htmlFor="password">كلمة السر</label>
        <PasswordInput autoComplete="new-password" placeholder="٦ حروف أو أرقام على الأقل" />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 7 }}>
          مرحلتك
        </legend>
        <div className="choice-grid">
          {grades.map((g) => (
            <label key={g.id} className="choice">
              <input
                type="radio"
                name="grade_id"
                value={g.id}
                checked={gradeId === g.id}
                onChange={() => {
                  setGradeId(g.id);
                  setTrackId('');
                }}
                required
              />
              <span className="c-ic" aria-hidden="true">
                <GradeIcon icon={g.icon} />
              </span>
              <span>
                <span className="c-t" style={{ display: 'block' }}>
                  {g.name}
                </span>
                <span className="c-s">{g.subtitle}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {gradeTracks.length > 1 && (
        <fieldset className="field a-fade" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label" style={{ marginBottom: 7 }}>
            الشعبة
          </legend>
          <div className="chips">
            {gradeTracks.map((t) => (
              <label key={t.id} className="chip">
                <input type="radio" name="track_id" value={t.id} checked={trackId === t.id} onChange={() => setTrackId(t.id)} required />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {gradeTracks.length === 1 && (
        <>
          <input type="hidden" name="track_id" value={gradeTracks[0].id} />
          <p className="hint" style={{ margin: 0, fontWeight: 600, color: '#6A4438' }}>
            الشعبة: {gradeTracks[0].name}
          </p>
        </>
      )}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button type="submit" className="btn btn-gold btn-lg btn-block" disabled={pending}>
        {pending ? <span className="spinner" /> : 'يلا نبدأ'}
      </button>
      <p className="auth-foot">
        عندك حساب؟ <Link href="/login">سجّل دخولك</Link>
      </p>
    </form>
  );
}
