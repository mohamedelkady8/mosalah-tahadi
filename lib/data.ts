import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { FALLBACK_CATALOG, FALLBACK_QUOTES } from '@/lib/fallback';
import { cairoDayNumber } from '@/lib/format';
import { sharedCatalog, sharedQuotes, type CatalogRows } from '@/lib/shared';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Catalog, Profile } from '@/lib/types';

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

/** Grades and tracks. Shared by every visitor, so it comes from the data cache, not from a query per page. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  if (!isSupabaseConfigured) return FALLBACK_CATALOG;
  let rows: CatalogRows;
  try {
    rows = await sharedCatalog();
  } catch (error) {
    console.error('catalog load failed', error);
    return FALLBACK_CATALOG;
  }
  const trackOrder = new Map(rows.tracks.map((t, i) => [t.id, i]));
  return {
    tracks: rows.tracks,
    grades: rows.grades.map((g) => ({
      ...g,
      trackIds: rows.links
        .filter((l) => l.grade_id === g.id)
        .map((l) => l.track_id)
        .sort((a, b) => (trackOrder.get(a) ?? 0) - (trackOrder.get(b) ?? 0)),
    })),
  };
});

export async function getQuoteOfDay(): Promise<string> {
  let quotes = FALLBACK_QUOTES;
  if (isSupabaseConfigured) {
    const active = await sharedQuotes().catch(() => []);
    if (active.length) quotes = active;
  }
  return quotes[cairoDayNumber() % quotes.length];
}

export function gradeName(catalog: Catalog, gradeId: string | null | undefined): string {
  return catalog.grades.find((g) => g.id === gradeId)?.name ?? '';
}

export function trackName(catalog: Catalog, trackId: string | null | undefined): string {
  return catalog.tracks.find((t) => t.id === trackId)?.name ?? '';
}
