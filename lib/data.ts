import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { FALLBACK_CATALOG, FALLBACK_QUOTES } from '@/lib/fallback';
import { cairoDayNumber } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Catalog, GradeWithTracks, Profile } from '@/lib/types';

export interface Session {
  userId: string | null;
  profile: Profile | null;
}

export const getSession = cache(async (): Promise<Session> => {
  if (!isSupabaseConfigured) return { userId: null, profile: null };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  if (!userId) return { userId: null, profile: null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { userId, profile: (profile as Profile | null) ?? null };
});

export async function requireSession(next: string): Promise<{ userId: string; profile: Profile }> {
  const session = await getSession();
  if (!session.userId || !session.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { userId: session.userId, profile: session.profile };
}

export const getCatalog = cache(async (): Promise<Catalog> => {
  if (!isSupabaseConfigured) return FALLBACK_CATALOG;
  const supabase = await createClient();
  const [grades, tracks, links] = await Promise.all([
    supabase.from('grades').select('*').order('sort_order').order('created_at'),
    supabase.from('tracks').select('*').order('sort_order').order('created_at'),
    supabase.from('grade_tracks').select('grade_id, track_id'),
  ]);
  if (grades.error || tracks.error || links.error) return FALLBACK_CATALOG;
  const trackOrder = new Map((tracks.data ?? []).map((t, i) => [t.id as string, i]));
  return {
    tracks: tracks.data ?? [],
    grades: (grades.data ?? []).map((g) => ({
      ...g,
      trackIds: (links.data ?? [])
        .filter((l) => l.grade_id === g.id)
        .map((l) => l.track_id as string)
        .sort((a, b) => (trackOrder.get(a) ?? 0) - (trackOrder.get(b) ?? 0)),
    })) as GradeWithTracks[],
  };
});

export async function getQuoteOfDay(): Promise<string> {
  let quotes = FALLBACK_QUOTES;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('quotes')
      .select('text')
      .eq('active', true)
      .order('sort_order')
      .order('created_at');
    if (data && data.length) quotes = data.map((q) => q.text as string);
  }
  return quotes[cairoDayNumber() % quotes.length];
}

export function gradeName(catalog: Catalog, gradeId: string | null | undefined): string {
  return catalog.grades.find((g) => g.id === gradeId)?.name ?? '';
}

export function trackName(catalog: Catalog, trackId: string | null | undefined): string {
  return catalog.tracks.find((t) => t.id === trackId)?.name ?? '';
}
