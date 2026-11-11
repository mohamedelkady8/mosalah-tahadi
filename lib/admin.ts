import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/data';
import { isStaff, SUPPORT_HOME } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

/** For admin pages. The admin layout shows the "admins only" screen, this guards the page itself too. */
export async function requireAdmin() {
  const { userId, profile } = await getSession();
  if (!userId || !profile) redirect('/login?next=/admin');
  if (profile.role === 'support') redirect(SUPPORT_HOME);
  if (profile.role !== 'admin') redirect('/admin');
  return { userId, profile, supabase: await createClient() };
}

/** For the student lookup: admins and support staff. */
export async function requireStaff() {
  const { userId, profile } = await getSession();
  if (!userId || !profile) redirect(`/login?next=${SUPPORT_HOME}`);
  if (!isStaff(profile.role)) redirect('/admin');
  return { userId, profile };
}

export const PAGE_SIZE = 25;

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Topics already used, for the topic suggestions in the game form. */
export async function getTopics(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data } = await supabase.from('games').select('topic').not('topic', 'is', null).limit(1000);
  return [...new Set((data ?? []).map((r) => (r.topic as string).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
}

export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function strParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}
