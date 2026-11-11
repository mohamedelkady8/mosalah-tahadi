import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, unstable_cache } from 'next/cache';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';
import type { DailyQuestion, Grade, Tip, Track, Video } from '@/lib/types';

/**
 * Data that is the same for every visitor: grades, quotes, tips, videos and the daily questions.
 * It's read once with the public key (so only what visitors may see) and kept in Next's data cache,
 * instead of asking the database on every page view. Admin actions call `refreshShared()` after a
 * change; the timer is a safety net for edits made straight in the Supabase dashboard.
 */
const SHARED_TAGS = ['catalog', 'quotes', 'tips', 'videos', 'daily'] as const;
const MAX_AGE_SEC = 300;

let client: ReturnType<typeof createClient> | null = null;

/** No cookies and no session: safe to share between requests. */
function publicClient() {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** A failed read throws, so the error isn't cached and the next request tries again. */
function rows<T>(result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T[];
}

export interface CatalogRows {
  grades: Grade[];
  tracks: Track[];
  links: { grade_id: string; track_id: string }[];
}

export const sharedCatalog = unstable_cache(
  async (): Promise<CatalogRows> => {
    const db = publicClient();
    const [grades, tracks, links] = await Promise.all([
      db.from('grades').select('*').order('sort_order').order('created_at'),
      db.from('tracks').select('*').order('sort_order').order('created_at'),
      db.from('grade_tracks').select('grade_id, track_id'),
    ]);
    return { grades: rows<Grade>(grades), tracks: rows<Track>(tracks), links: rows<{ grade_id: string; track_id: string }>(links) };
  },
  ['shared-catalog-v1'],
  { tags: ['catalog'], revalidate: MAX_AGE_SEC },
);

export const sharedQuotes = unstable_cache(
  async (): Promise<string[]> => {
    const result = await publicClient().from('quotes').select('text').eq('active', true).order('sort_order').order('created_at');
    return rows<{ text: string }>(result).map((q) => q.text);
  },
  ['shared-quotes-v1'],
  { tags: ['quotes'], revalidate: MAX_AGE_SEC },
);

export type SharedTip = Pick<Tip, 'id' | 'body' | 'grade_id'>;

export const sharedTips = unstable_cache(
  async (): Promise<SharedTip[]> => {
    const result = await publicClient().from('tips').select('id, body, grade_id').eq('active', true).order('created_at', { ascending: false }).limit(1000);
    return rows<SharedTip>(result);
  },
  ['shared-tips-v1'],
  { tags: ['tips'], revalidate: MAX_AGE_SEC },
);

export type SharedVideo = Pick<Video, 'id' | 'title' | 'url' | 'description' | 'cover_url' | 'grade_id'>;

export const sharedVideos = unstable_cache(
  async (): Promise<SharedVideo[]> => {
    const result = await publicClient()
      .from('videos')
      .select('id, title, url, description, cover_url, grade_id')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(500);
    return rows<SharedVideo>(result);
  },
  ['shared-videos-v1'],
  { tags: ['videos'], revalidate: MAX_AGE_SEC },
);

/**
 * Questions up to `today` (a Cairo day key), newest first, for every grade. The day is part of the
 * cache key, so tomorrow's question shows up at midnight without waiting for the timer.
 */
export const sharedDailyQuestions = unstable_cache(
  async (today: string): Promise<DailyQuestion[]> => {
    const result = await publicClient().from('daily_questions').select('*').lte('day', today).order('day', { ascending: false }).limit(200);
    return rows<DailyQuestion>(result);
  },
  ['shared-daily-v1'],
  { tags: ['daily'], revalidate: MAX_AGE_SEC },
);

/** Call after any admin change, so students see it on their next page view. */
export function refreshShared() {
  for (const tag of SHARED_TAGS) revalidateTag(tag);
}
