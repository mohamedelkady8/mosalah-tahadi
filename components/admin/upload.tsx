'use client';

import { useRef, useState } from 'react';
import { ImageIcon, TrashIcon, UploadIcon } from '@/components/ui/icons';
import { uid } from '@/lib/games/random';
import { prepareImage } from '@/lib/images';
import { createClient } from '@/lib/supabase/client';
import { MEDIA_BUCKET } from '@/lib/supabase/config';

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' };

/** Shrinks the picture in the browser, uploads it to the public media bucket and returns its URL. */
export async function uploadImage(file: File, folder = 'games'): Promise<string> {
  if (!EXT[file.type]) throw new Error('ارفع صورة PNG أو JPG أو WEBP أو GIF.');
  if (file.size > 12 * 1024 * 1024) throw new Error('الصورة كبيرة أوي، صغّرها الأول.');
  const blob = await prepareImage(file);
  if (blob.size > 5 * 1024 * 1024) throw new Error('الصورة أكبر من ٥ ميجا حتى بعد التصغير.');
  const type = EXT[blob.type] ? blob.type : file.type;
  const path = `${folder}/${uid(14)}.${EXT[type]}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error('الصورة ماترفعتش، جرّب تاني.');
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** A 16:9 picture slot with upload, replace and remove. */
export function ImageUpload({
  value,
  onChange,
  folder = 'games',
  emptyText,
  alt = '',
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  emptyText: string;
  alt?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadImage(file, folder));
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
            <img src={value} alt={alt} />
            <button type="button" className="icon-btn danger" onClick={() => onChange(null)} aria-label="شيل الصورة" title="شيل الصورة">
              <TrashIcon size={16} />
            </button>
          </>
        ) : (
          <span className="row" style={{ gap: 8, fontWeight: 600, padding: '0 12px', textAlign: 'center', justifyContent: 'center' }}>
            <ImageIcon size={20} /> {emptyText}
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
