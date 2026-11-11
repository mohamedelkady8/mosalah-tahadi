'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { EditIcon, ExternalIcon, PlayIcon, PlusIcon, TrashIcon, VideoIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { deleteVideo, saveVideo, type ActionResult } from '@/lib/actions/admin';
import { num } from '@/lib/format';
import type { Video } from '@/lib/types';
import { parseVideoUrl, PLATFORM_LABELS } from '@/lib/videos';
import { GradeSelect, gradeName, type GradeOption } from './GradeSelect';
import { Modal } from './Modal';
import { ImageUpload } from './upload';

type Draft = Pick<Video, 'title' | 'url' | 'description' | 'cover_url' | 'grade_id' | 'active'> & { id?: string };

const EMPTY: Draft = { title: '', url: '', description: '', cover_url: null, grade_id: null, active: true };

type Change = { kind: 'active'; id: string; active: boolean } | { kind: 'delete'; id: string };

function applyChange(state: Video[], change: Change): Video[] {
  if (change.kind === 'delete') return state.filter((v) => v.id !== change.id);
  return state.map((v) => (v.id === change.id ? { ...v, active: change.active } : v));
}

export function VideosManager({ videos: serverVideos, grades }: { videos: Video[]; grades: GradeOption[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [videos, optimistic] = useOptimistic(serverVideos, applyChange);
  const [editing, setEditing] = useState<Draft | null>(null);

  const run = (fn: () => Promise<ActionResult>, change: Change) =>
    start(async () => {
      optimistic(change);
      const r = await fn();
      if (!r.ok) return toast(r.error);
      if (r.message) toast(r.message);
      router.refresh();
    });

  const toDraft = (v: Video): Draft => ({ id: v.id, title: v.title, url: v.url, description: v.description, cover_url: v.cover_url, grade_id: v.grade_id, active: v.active });

  return (
    <>
      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2>الفيديوهات</h2>
          <span className="row" style={{ gap: 10 }}>
            {videos.length > 0 && (
              <span className="muted">
                {num(videos.filter((v) => v.active).length)} ظاهر من {num(videos.length)}
              </span>
            )}
            <button type="button" className="btn btn-gold btn-sm" onClick={() => setEditing({ ...EMPTY })}>
              <PlusIcon size={18} /> فيديو جديد
            </button>
          </span>
        </div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
          حط رابط الفيديو من يوتيوب أو فيسبوك أو تيك توك أو إنستجرام أو جوجل درايف، والطالب هيتفرج عليه جوه الموقع لما العجلة تختار «فيديوهات تحفيزية».
        </p>
        {videos.length ? (
          <div className="ad-vids">
            {videos.map((v) => {
              const info = parseVideoUrl(v.url);
              const thumb = v.cover_url || info?.thumb;
              return (
                <article key={v.id} className={`ad-vid${v.active ? '' : ' off'}`}>
                  <button type="button" className="ad-vid-thumb" onClick={() => setEditing(toDraft(v))} aria-label={`عدّل ${v.title}`}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" loading="lazy" />
                    ) : (
                      <VideoIcon size={34} />
                    )}
                    {info && <span className="ad-vid-pf">{PLATFORM_LABELS[info.platform]}</span>}
                  </button>
                  <div className="ad-vid-body">
                    <b>{v.title}</b>
                    {v.description && <small className="ad-vid-desc">{v.description}</small>}
                    <span className="ad-vid-meta">
                      <span className="badge">{gradeName(grades, v.grade_id)}</span>
                      {info && !info.embed && <span className="badge badge-gold">بيفتح برّه الموقع</span>}
                    </span>
                    <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
                      <label className="check" style={{ fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={v.active}
                          disabled={pending}
                          onChange={(e) => {
                            const active = e.target.checked;
                            run(() => saveVideo({ ...toDraft(v), active }), { kind: 'active', id: v.id, active });
                          }}
                        />
                        ظاهر
                      </label>
                      <span className="ad-item-tools" style={{ marginInlineStart: 'auto' }}>
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="افتح الرابط" aria-label={`افتح رابط ${v.title}`}>
                          <ExternalIcon size={16} />
                        </a>
                        <button type="button" className="icon-btn" onClick={() => setEditing(toDraft(v))} title="عدّل" aria-label={`عدّل ${v.title}`}>
                          <EditIcon size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          disabled={pending}
                          onClick={() => confirm(`تمسح «${v.title}»؟`) && run(() => deleteVideo(v.id), { kind: 'delete', id: v.id })}
                          title="امسح"
                          aria-label={`امسح ${v.title}`}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <div className="e-ic">
              <VideoIcon size={26} />
            </div>
            <h3>لسه مفيش فيديوهات</h3>
            <p>ضيف أول فيديو تحفيزي، وقسم «فيديوهات تحفيزية» هيدخل العجلة على طول.</p>
            <button type="button" className="btn btn-gold" onClick={() => setEditing({ ...EMPTY })}>
              <PlusIcon size={18} /> فيديو جديد
            </button>
          </div>
        )}
      </section>

      {editing && <VideoForm key={editing.id ?? 'new'} initial={editing} grades={grades} onClose={() => setEditing(null)} />}
    </>
  );
}

function VideoForm({ initial, grades, onClose }: { initial: Draft; grades: GradeOption[]; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState<Draft>(initial);
  const [playing, setPlaying] = useState(false);
  const info = d.url.trim() ? parseVideoUrl(d.url) : null;
  const badUrl = d.url.trim().length > 0 && !info;
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveVideo(d);
      if (!r.ok) return toast(r.error);
      toast(r.message ?? 'اتحفظ.');
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal title={initial.id ? 'تعديل الفيديو' : 'فيديو جديد'} onClose={onClose} width={640}>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="v-url">رابط الفيديو</label>
          <input
            id="v-url"
            className="input ltr"
            dir="ltr"
            type="url"
            inputMode="url"
            value={d.url}
            onChange={(e) => {
              set({ url: e.target.value });
              setPlaying(false);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            autoFocus={!initial.id}
            required
          />
          {badUrl ? (
            <span className="form-error">الرابط لازم يكون كامل ويبدأ بـ https://</span>
          ) : info ? (
            <span className="hint">
              {PLATFORM_LABELS[info.platform]}
              {info.embed ? '، هيشتغل جوه الموقع.' : `، هيفتح على ${info.platform === 'link' ? 'موقعه' : PLATFORM_LABELS[info.platform]} في صفحة جديدة.`}
              {info.platform === 'facebook' && ' لازم يكون الفيديو أو الريل عام (Public) عشان يشتغل.'}
            </span>
          ) : (
            <span className="hint">انسخ الرابط من زرار «مشاركة» على يوتيوب أو فيسبوك أو تيك توك أو إنستجرام.</span>
          )}
        </div>

        {info?.embed && (
          <div className={`ad-vid-preview${info.vertical ? ' tall' : ''}`}>
            {playing ? (
              <iframe src={info.embed} title="معاينة الفيديو" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            ) : (
              <button type="button" onClick={() => setPlaying(true)} aria-label="جرّب الفيديو">
                {(d.cover_url || info.thumb) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.cover_url || info.thumb || ''} alt="" />
                )}
                <span className="ad-vid-play">
                  <PlayIcon size={22} /> جرّب الفيديو
                </span>
              </button>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="v-title">العنوان</label>
          <input id="v-title" className="input" maxLength={120} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلًا: إزاي تذاكر وإنت مش قادر" required />
        </div>
        <div className="field">
          <label htmlFor="v-desc">
            كلمتين عن الفيديو <span className="muted">(اختياري)</span>
          </label>
          <textarea
            id="v-desc"
            className="textarea"
            rows={2}
            maxLength={300}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="مثلًا: ٣ دقايق هيفرقوا في مذاكرتك النهارده."
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="v-grade">لمين؟</label>
            <GradeSelect id="v-grade" grades={grades} value={d.grade_id} onChange={(grade_id) => set({ grade_id })} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label className="check">
              <input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked })} />
              ظاهر للطلاب
            </label>
          </div>
        </div>
        <div className="field">
          <label>
            صورة الفيديو <span className="muted">(اختياري)</span>
          </label>
          <ImageUpload
            value={d.cover_url}
            onChange={(cover_url) => set({ cover_url })}
            folder="videos"
            alt="صورة الفيديو"
            emptyText={info?.thumb ? 'من غير صورة، هتظهر صورة يوتيوب' : 'من غير صورة، هيظهر شكل فيديو'}
          />
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-gold" disabled={pending || !info || d.title.trim().length < 2}>
            {pending ? <span className="spinner" /> : null} {initial.id ? 'احفظ التعديلات' : 'ضيف الفيديو'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
