'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { EDITORS } from '@/components/games/editors';
import { UploadContext } from '@/components/games/editors/parts';
import GameShell from '@/components/games/GameShell';
import type { PlayableGame } from '@/components/games/types';
import { CheckIcon, EyeIcon, GameTypeIcon, GradeIcon, ImageIcon, TrashIcon, UploadIcon, XIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteGame, saveGame } from '@/lib/actions/admin';
import { DIFFICULTY_LABELS, durationText, formatDateTime, num } from '@/lib/format';
import { checkContent, GAME_TYPE_LIST, getDef, itemsLabel } from '@/lib/games/registry';
import { uid } from '@/lib/games/random';
import { defaultSettingsFor } from '@/lib/games/settings';
import type { GameSettings, GameType } from '@/lib/games/types';
import { prepareImage } from '@/lib/images';
import { createClient } from '@/lib/supabase/client';
import { MEDIA_BUCKET } from '@/lib/supabase/config';
import type { Catalog, GameStatus } from '@/lib/types';

type Target = { grade_id: string; track_id: string | null };
/** Per grade: the whole grade, or only some of its tracks. */
type TargetValue = Record<string, 'all' | string[]>;

export interface GameFormInitial {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  topic: string;
  difficulty: number;
  cover_url: string | null;
  status: GameStatus;
  content: unknown;
  settings: GameSettings;
  targets: Target[];
  updated_at: string;
}

export interface GameFormStats {
  plays: number;
  players: number;
  avg_percent: number;
  last_played_at: string | null;
}

function toTargetValue(catalog: Catalog, targets: Target[]): TargetValue {
  const value: TargetValue = {};
  for (const g of catalog.grades) {
    const mine = targets.filter((t) => t.grade_id === g.id);
    if (!mine.length) continue;
    const ids = g.trackIds.filter((id) => mine.some((t) => t.track_id === id));
    value[g.id] = mine.some((t) => t.track_id === null) || g.trackIds.length <= 1 || ids.length === g.trackIds.length ? 'all' : ids;
  }
  return value;
}

function fromTargetValue(value: TargetValue): Target[] {
  return Object.entries(value).flatMap(([grade_id, v]): Target[] =>
    v === 'all' ? [{ grade_id, track_id: null }] : v.map((track_id) => ({ grade_id, track_id })),
  );
}

const TOTAL_TIMES = [0, 60, 90, 120, 180, 240, 300, 420, 600, 900, 1200, 1800, 2700, 3600];
const QUESTION_TIMES = [0, 5, 8, 10, 12, 15, 20, 25, 30, 45, 60, 90, 120];
const ATTEMPTS = [0, 1, 2, 3, 5, 10];
const POINTS = [1, 2, 5, 10, 15, 20, 25, 50, 100];
const withValue = (list: number[], v: number) => (list.includes(v) ? list : [...list, v].sort((a, b) => a - b));

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' };

async function uploadImage(file: File): Promise<string> {
  if (!EXT[file.type]) throw new Error('ارفع صورة PNG أو JPG أو WEBP أو GIF.');
  if (file.size > 12 * 1024 * 1024) throw new Error('الصورة كبيرة أوي، صغّرها الأول.');
  const blob = await prepareImage(file);
  if (blob.size > 5 * 1024 * 1024) throw new Error('الصورة أكبر من ٥ ميجا حتى بعد التصغير.');
  const type = EXT[blob.type] ? blob.type : file.type;
  const path = `games/${uid(14)}.${EXT[type]}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error('الصورة ماترفعتش، جرّب تاني.');
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function GameForm({
  catalog,
  topics,
  initial,
  stats,
  initialType,
  initialGrade,
}: {
  catalog: Catalog;
  topics: string[];
  initial?: GameFormInitial;
  stats?: GameFormStats | null;
  initialType?: GameType;
  initialGrade?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<GameType | null>(initial?.type ?? initialType ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1);
  const [cover, setCover] = useState<string | null>(initial?.cover_url ?? null);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [content, setContent] = useState<unknown>(() => initial?.content ?? (type ? getDef(type).defaultContent() : null));
  const [settings, setSettings] = useState<GameSettings>(() => initial?.settings ?? defaultSettingsFor(type ?? 'mcq'));
  const [targets, setTargets] = useState<TargetValue>(() =>
    initial ? toTargetValue(catalog, initial.targets) : initialGrade && catalog.grades.some((g) => g.id === initialGrade) ? { [initialGrade]: 'all' } : {},
  );
  const [status, setStatus] = useState<GameStatus>(initial?.status ?? 'draft');
  const [showIssues, setShowIssues] = useState<null | 'publish' | 'preview'>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string; list?: string[] } | null>(null);
  const [preview, setPreview] = useState<PlayableGame | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const sideRef = useRef<HTMLDivElement>(null);

  const snapshot = JSON.stringify({ type, title, description, topic, difficulty, cover, slug, content, settings, targets });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = Boolean(type) && snapshot !== savedSnapshot;

  const def = type ? getDef(type) : null;
  const Editor = type ? EDITORS[type] : null;
  const check = useMemo(() => (type ? checkContent(type, content) : null), [type, content]);
  const targetList = useMemo(() => fromTargetValue(targets), [targets]);

  const problems = useCallback(
    (publishing: boolean) => {
      const out: string[] = [];
      if (title.trim().length < 2) out.push('اكتب اسم اللعبة.');
      if (check && !check.ok) out.push(...check.errors);
      if (publishing && targetList.length === 0) out.push('اختار اللعبة هتظهر لأنهي مرحلة.');
      return out;
    },
    [title, check, targetList],
  );

  // Shown after a failed publish or preview, and updated live while the admin fixes things.
  const issues = showIssues ? problems(showIssues === 'publish') : [];
  useEffect(() => {
    if (showIssues && issues.length === 0) setShowIssues(null);
  }, [showIssues, issues.length]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!preview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [preview]);

  function chooseType(next: GameType) {
    const fresh = getDef(next).defaultContent();
    const freshSettings = defaultSettingsFor(next);
    setType(next);
    setContent(fresh);
    setSettings(freshSettings);
    setShowIssues(null);
    setNotice(null);
    if (!initial) {
      setSavedSnapshot(JSON.stringify({ type: next, title, description, topic, difficulty, cover, slug, content: fresh, settings: freshSettings, targets }));
    }
  }

  function backToTypes() {
    if (dirty && !confirm('لو غيّرت النوع، المحتوى اللي كتبته هيتمسح. تكمّل؟')) return;
    setType(null);
  }

  function save(nextStatus: GameStatus) {
    if (!type) return;
    if (nextStatus === 'published' && problems(true).length) {
      setShowIssues('publish');
      setNotice(null);
      sideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (title.trim().length < 2) {
      setNotice({ kind: 'warn', text: 'اكتب اسم اللعبة الأول، حتى لو هتحفظها مسودة.' });
      document.getElementById('g-title')?.focus();
      return;
    }
    const sent = snapshot;
    startTransition(async () => {
      const r = await saveGame({
        id: initial?.id,
        type,
        title,
        description,
        topic,
        difficulty,
        cover_url: cover,
        slug,
        status: nextStatus,
        content,
        settings,
        targets: targetList,
      });
      if (!r.ok) {
        setNotice({ kind: 'warn', text: r.error, list: r.errors });
        toast(r.error);
        return;
      }
      setStatus(nextStatus);
      setShowIssues(null);
      setNotice(
        r.warnings?.length
          ? { kind: 'warn', text: 'اتحفظت كمسودة، بس لسه فيه حاجات لازم تتظبط قبل النشر:', list: r.warnings }
          : { kind: 'ok', text: r.message ?? 'اتحفظت.' },
      );
      toast(r.message ?? 'اتحفظت.');
      if (r.slug) setSlug(r.slug);
      setSavedSnapshot(r.slug ? JSON.stringify({ ...JSON.parse(sent), slug: r.slug }) : sent);
      if (!initial && r.id) router.replace(`/admin/games/${r.id}`);
      else router.refresh();
    });
  }

  // Ctrl/Cmd + S saves without changing the status.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current(status);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status]);

  function openPreview() {
    if (!type || !def) return;
    if (check && !check.ok) {
      setShowIssues('preview');
      sideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('ظبط الحاجات الناقصة الأول وبعدين جرّبها.');
      return;
    }
    setPreviewKey((k) => k + 1);
    setPreview({
      id: initial?.id ?? 'preview',
      slug: slug || 'preview',
      title: title.trim() || 'لعبة من غير اسم',
      description,
      type,
      content: check?.ok ? check.content : content,
      settings,
      item_count: check?.ok ? def.itemCount(check.content) : 0,
      cover_url: cover,
      topic: topic || null,
      difficulty,
    });
  }

  function remove() {
    if (!initial) return;
    if (!confirm(`تمسح «${initial.title}»؟ كل محاولات الطلاب فيها هتتمسح ونقطهم هتتحسب من جديد.`)) return;
    startTransition(async () => {
      const r = await deleteGame(initial.id);
      if (!r.ok) return toast(r.error);
      toast(r.message ?? 'اتمسحت.');
      setSavedSnapshot(snapshot);
      router.push('/admin/games');
    });
  }

  if (!type || !def || !Editor) {
    return (
      <section className="ad-panel">
        <h2>اختار نوع اللعبة</h2>
        <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
          كل نوع ليه طريقة لعب مختلفة. تقدر تعمل من كل نوع ألعاب كتير لكل المراحل.
        </p>
        <TypePicker value={null} onChange={chooseType} />
      </section>
    );
  }

  const readyToPublish = check?.ok && title.trim().length >= 2 && targetList.length > 0;
  const count = check?.ok ? def.itemCount(check.content) : null;

  return (
    <UploadContext.Provider value={uploadImage}>
      <div className="ad-form">
        <div className="stack" style={{ gap: 18 }}>
          <section className="ad-panel stack">
            <div className="ad-panel-head">
              <h2>بيانات اللعبة</h2>
              <span className="row" style={{ gap: 8 }}>
                <span className="ad-type">
                  <GameTypeIcon type={type} size={20} />
                  {def.label}
                </span>
                {!initial && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={backToTypes} disabled={pending}>
                    غيّر النوع
                  </button>
                )}
              </span>
            </div>
            <div className="field">
              <label htmlFor="g-title">اسم اللعبة</label>
              <input
                id="g-title"
                className="input"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلًا: مراجعة على الحال والتمييز"
                autoFocus={!initial}
              />
            </div>
            <div className="field">
              <label htmlFor="g-desc">وصف قصير</label>
              <textarea
                id="g-desc"
                className="textarea"
                rows={2}
                maxLength={400}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="الطالب هيشوفه قبل ما يبدأ. مثلًا: ١٠ أسئلة سريعة على درس الحال."
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="g-topic">الدرس أو الفرع</label>
                <input
                  id="g-topic"
                  className="input"
                  list="g-topics"
                  maxLength={40}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="نحو، بلاغة، أدب..."
                />
                <datalist id="g-topics">
                  {topics.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <span className="hint">الطلاب يقدروا يفلتروا الألعاب بيه.</span>
              </div>
              <div className="field">
                <span className="field-label">الصعوبة</span>
                <div className="chips" role="radiogroup" aria-label="الصعوبة">
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === d}
                      className={`chip${difficulty === d ? ' on' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="ad-panel">
            <div className="ad-panel-head">
              <h2>محتوى اللعبة</h2>
              {count !== null && <span className="badge badge-gold">{itemsLabel(type, count)}</span>}
            </div>
            <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
              {def.howTo}
            </p>
            <Editor value={content} onChange={setContent} />
          </section>

          <section className="ad-panel stack">
            <h2>الإعدادات</h2>
            <div className="field-row">
              <div className="field">
                <label htmlFor="g-points">نقط كل {def.pointsUnit ?? 'إجابة صح'}</label>
                <select
                  id="g-points"
                  className="select"
                  value={settings.pointsPerItem}
                  onChange={(e) => setSettings({ ...settings, pointsPerItem: Number(e.target.value) })}
                >
                  {withValue(POINTS, settings.pointsPerItem).map((p) => (
                    <option key={p} value={p}>
                      {num(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="g-time">وقت اللعبة كلها</label>
                <select
                  id="g-time"
                  className="select"
                  value={settings.timeLimitSec}
                  onChange={(e) => setSettings({ ...settings, timeLimitSec: Number(e.target.value) })}
                >
                  {withValue(TOTAL_TIMES, settings.timeLimitSec).map((s) => (
                    <option key={s} value={s}>
                      {s ? durationText(s * 1000) : 'من غير وقت'}
                    </option>
                  ))}
                </select>
              </div>
              {def.usesQuestionTimer && (
                <div className="field">
                  <label htmlFor="g-qtime">وقت كل سؤال</label>
                  <select
                    id="g-qtime"
                    className="select"
                    value={settings.questionTimeSec}
                    onChange={(e) => setSettings({ ...settings, questionTimeSec: Number(e.target.value) })}
                  >
                    {withValue(QUESTION_TIMES, settings.questionTimeSec).map((s) => (
                      <option key={s} value={s}>
                        {s ? `${num(s)} ثانية` : 'من غير وقت'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label htmlFor="g-attempts">عدد المحاولات</label>
                <select
                  id="g-attempts"
                  className="select"
                  value={settings.attemptsAllowed}
                  onChange={(e) => setSettings({ ...settings, attemptsAllowed: Number(e.target.value) })}
                >
                  {withValue(ATTEMPTS, settings.attemptsAllowed).map((a) => (
                    <option key={a} value={a}>
                      {a ? (a === 1 ? 'محاولة واحدة' : `${num(a)} محاولات`) : 'مفتوح'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(def.usesShuffle !== false || def.usesExplanations !== false) && (
              <div className="row" style={{ gap: 18 }}>
                {def.usesShuffle !== false && (
                  <label className="check">
                    <input type="checkbox" checked={settings.shuffle} onChange={(e) => setSettings({ ...settings, shuffle: e.target.checked })} />
                    رتّب الأسئلة عشوائي كل مرة
                  </label>
                )}
                {def.usesExplanations !== false && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={settings.showExplanations}
                      onChange={(e) => setSettings({ ...settings, showExplanations: e.target.checked })}
                    />
                    اعرض الشرح بعد كل إجابة
                  </label>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="ad-form-side" ref={sideRef}>
          <section className="ad-panel ad-savebar" aria-label="الحفظ والنشر">
            <div className="ad-panel-head" style={{ marginBottom: 0 }}>
              <span className={`ad-status${status === 'published' ? ' pub' : ''}`} style={{ fontWeight: 700 }}>
                <span className="dot" />
                {status === 'published' ? 'منشورة للطلاب' : 'مسودة'}
              </span>
              {dirty ? <span className="badge badge-gold">فيه تعديلات مش محفوظة</span> : initial && <span className="badge badge-ok">محفوظة</span>}
            </div>
            {readyToPublish ? (
              <span className="badge badge-ok" style={{ alignSelf: 'flex-start' }}>
                <CheckIcon size={14} /> جاهزة للنشر
              </span>
            ) : (
              <span className="muted">
                {check && !check.ok ? 'لسه فيه حاجات ناقصة في المحتوى.' : targetList.length === 0 ? 'اختار المراحل عشان تقدر تنشرها.' : 'اكتب اسم اللعبة.'}
              </span>
            )}
            {status === 'published' ? (
              <>
                <button type="button" className="btn btn-gold btn-block" disabled={pending} onClick={() => save('published')}>
                  {pending ? <span className="spinner" /> : <CheckIcon size={18} />} احفظ التعديلات
                </button>
                <button type="button" className="btn btn-ghost btn-block" disabled={pending} onClick={() => save('draft')}>
                  شيلها من عند الطلاب (مسودة)
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-gold btn-block" disabled={pending} onClick={() => save('published')}>
                  {pending ? <span className="spinner" /> : <CheckIcon size={18} />} احفظ وانشر
                </button>
                <button type="button" className="btn btn-ghost btn-block" disabled={pending} onClick={() => save('draft')}>
                  احفظ كمسودة
                </button>
              </>
            )}
            <button type="button" className="btn btn-ink btn-block" disabled={pending} onClick={openPreview}>
              <EyeIcon size={18} /> جرّبها كأنك طالب
            </button>
            {issues.length > 0 && (
              <div className="form-error" role="alert">
                <b>ظبط الحاجات دي الأول:</b>
                <ul className="ad-errors">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
            {notice && issues.length === 0 && (
              <div className={notice.kind === 'ok' ? 'form-ok' : 'form-error'} role="status">
                {notice.text}
                {notice.list && (
                  <ul className="ad-errors">
                    {notice.list.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <span className="muted" style={{ fontSize: 13 }}>
              اختصار: Ctrl + S للحفظ.
            </span>
          </section>

          <section className="ad-panel">
            <div className="ad-panel-head">
              <h2>هتظهر لمين؟</h2>
              <span className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setTargets(Object.fromEntries(catalog.grades.map((g) => [g.id, 'all' as const])))}
                >
                  الكل
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTargets({})}>
                  ولا حاجة
                </button>
              </span>
            </div>
            <TargetPicker catalog={catalog} value={targets} onChange={setTargets} />
          </section>

          <section className="ad-panel">
            <h2>صورة اللعبة</h2>
            <CoverField value={cover} onChange={setCover} />
          </section>

          <section className="ad-panel stack">
            <h2>رابط اللعبة</h2>
            <div className="field">
              <label htmlFor="g-slug" className="visually-hidden">
                رابط اللعبة
              </label>
              <input
                id="g-slug"
                className="input input-sm ltr"
                dir="ltr"
                value={slug}
                maxLength={60}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="هيتعمل لوحده"
              />
              <span className="hint">حروف إنجليزي صغيرة وأرقام وشرطة. الطلاب بيفتحوا اللعبة من /play/{slug || '...'}</span>
            </div>
            {initial && status === 'published' && !dirty && (
              <Link href={`/play/${initial.slug}`} target="_blank" className="btn btn-sm btn-ghost">
                افتحها زي الطالب
              </Link>
            )}
          </section>

          {initial && (
            <section className="ad-panel">
              <h2>أرقام اللعبة</h2>
              {stats && stats.plays > 0 ? (
                <dl className="ad-kv">
                  <dt>اتلعبت</dt>
                  <dd>{num(stats.plays)} مرة</dd>
                  <dt>عدد الطلاب</dt>
                  <dd>{num(stats.players)}</dd>
                  <dt>متوسط النتيجة</dt>
                  <dd>{num(Math.round(stats.avg_percent))}٪</dd>
                  {stats.last_played_at && (
                    <>
                      <dt>آخر مرة</dt>
                      <dd>{formatDateTime(stats.last_played_at)}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="muted">لسه محدش لعبها.</p>
              )}
              <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                آخر تعديل: {formatDateTime(initial.updated_at)}
              </p>
            </section>
          )}

          {initial && (
            <section className="ad-panel ad-danger-zone">
              <h2>مسح اللعبة</h2>
              <p className="muted" style={{ marginBottom: 10 }}>
                المسح نهائي، ومحاولات الطلاب فيها هتتمسح كمان.
              </p>
              <button type="button" className="btn btn-sm btn-danger" disabled={pending} onClick={remove}>
                <TrashIcon size={16} /> امسح اللعبة
              </button>
            </section>
          )}
        </aside>
      </div>

      {preview && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={`معاينة ${preview.title}`} onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal gm-modal">
            <button type="button" className="icon-btn modal-close" onClick={() => setPreview(null)} aria-label="قفل المعاينة">
              <XIcon size={18} />
            </button>
            <GameShell key={previewKey} game={preview} mode="preview" onClose={() => setPreview(null)} />
          </div>
        </div>
      )}
    </UploadContext.Provider>
  );
}

function TypePicker({ value, onChange }: { value: GameType | null; onChange: (t: GameType) => void }) {
  return (
    <div className="ad-types">
      {GAME_TYPE_LIST.map((d) => (
        <button key={d.type} type="button" className={`ad-type-card${value === d.type ? ' on' : ''}`} onClick={() => onChange(d.type)}>
          <span className="ic">
            <GameTypeIcon type={d.type} size={24} />
          </span>
          <b>{d.label}</b>
          <span>{d.description}</span>
        </button>
      ))}
    </div>
  );
}

function TargetPicker({ catalog, value, onChange }: { catalog: Catalog; value: TargetValue; onChange: (v: TargetValue) => void }) {
  if (!catalog.grades.length) {
    return (
      <p className="muted">
        مفيش مراحل لسه. ضيفها من <Link href="/admin/grades">المراحل والشعب</Link>.
      </p>
    );
  }
  const set = (gradeId: string, v: 'all' | string[] | null) => {
    const next = { ...value };
    if (v === null || (Array.isArray(v) && v.length === 0)) delete next[gradeId];
    else next[gradeId] = v;
    onChange(next);
  };
  return (
    <div className="ad-targets">
      {catalog.grades.map((g) => {
        const v = value[g.id];
        const on = v !== undefined;
        const tracks = g.trackIds.map((id) => catalog.tracks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
        const toggleTrack = (id: string) => {
          const current = v === 'all' || !v ? [] : v;
          const nextIds = v === 'all' ? [id] : current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
          set(g.id, nextIds.length === tracks.length ? 'all' : nextIds);
        };
        return (
          <div key={g.id} className={`ad-target${on ? ' on' : ''}`}>
            <label className="check g">
              <input type="checkbox" checked={on} onChange={(e) => set(g.id, e.target.checked ? 'all' : null)} />
              <span className="gi">
                <GradeIcon icon={g.icon} />
              </span>
              {g.name}
              {!g.active && <span className="badge">مخفية</span>}
            </label>
            {on && tracks.length > 1 && (
              <div className="chips" role="group" aria-label={`شعب ${g.name}`}>
                <button type="button" className={`chip${v === 'all' ? ' on' : ''}`} aria-pressed={v === 'all'} onClick={() => set(g.id, 'all')}>
                  كل الشعب
                </button>
                {tracks.map((t) => {
                  const picked = v !== 'all' && v.includes(t.id);
                  return (
                    <button key={t.id} type="button" className={`chip${picked ? ' on' : ''}`} aria-pressed={picked} onClick={() => toggleTrack(t.id)}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CoverField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'الصورة ماترفعتش.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="ad-cover">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="صورة اللعبة" />
            <button type="button" className="icon-btn danger" onClick={() => onChange(null)} aria-label="شيل الصورة" title="شيل الصورة">
              <TrashIcon size={16} />
            </button>
          </>
        ) : (
          <span className="row" style={{ gap: 8, fontWeight: 600 }}>
            <ImageIcon size={20} /> من غير صورة، هيظهر شكل نوع اللعبة
          </span>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <span className="spinner" /> : <UploadIcon size={16} />} {busy ? 'بنرفع الصورة...' : value ? 'غيّر الصورة' : 'ارفع صورة'}
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
