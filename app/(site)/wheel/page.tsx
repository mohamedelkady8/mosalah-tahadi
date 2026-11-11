import type { Metadata } from 'next';
import { SpinWheel } from '@/components/hub/SpinWheel';
import { SitePage } from '@/components/site/SiteHeader';
import { FlashToast } from '@/components/ui/Toast';
import { requireSession } from '@/lib/data';
import { firstName } from '@/lib/format';
import { sectionAvailability } from '@/lib/hub';
import { SECTION_KEYS, SECTIONS } from '@/lib/sections';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'لف العجلة' };

/** The student's home screen: the wheel decides what they do today. */
export default async function WheelPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [{ welcome }, { profile }] = await Promise.all([searchParams, requireSession('/wheel')]);
  const supabase = await createClient();
  const ready = await sectionAvailability(supabase, profile);
  const name = firstName(profile.full_name);

  return (
    <SitePage back={{ href: '/', label: 'الرئيسية' }} wheelPill={false}>
      {welcome && <FlashToast message={`أهلًا يا ${name}! حسابك اتعمل، لف العجلة وشوف هتطلعلك إيه.`} />}
      <p className="hello">{profile.role === 'admin' ? 'إنت شايف العجلة زي الطلاب' : `أهلًا يا ${name}`}</p>
      <h1 className="gp-title">لف العجلة</h1>
      <p className="gp-sub">مش إنت اللي هتختار، العجلة هي اللي هتختارلك هتعمل إيه النهارده.</p>
      <SpinWheel sections={SECTION_KEYS.map((key) => ({ ...SECTIONS[key], ready: ready[key] }))} />
    </SitePage>
  );
}
