import type { Metadata } from 'next';
import Link from 'next/link';
import GameShell from '@/components/games/GameShell';
import type { PlayableGame } from '@/components/games/types';
import { SitePage } from '@/components/site/SiteHeader';
import { BoltIcon } from '@/components/ui/icons';
import { getCatalog, requireSession } from '@/lib/data';
import { cairoDayNumber } from '@/lib/format';
import { mcqContent } from '@/lib/games/defs/mcq';
import { DEFAULT_SETTINGS } from '@/lib/games/settings';
import { gamesForGrade } from '@/lib/student';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'سؤال اليوم' };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** One multiple-choice question a day, the same for everyone in the grade, picked from its published games. */
export default async function DailyPage() {
  const { profile } = await requireSession('/daily');
  const catalog = await getCatalog();
  const grade = catalog.grades.find((g) => g.id === profile.grade_id);
  const backHref = grade ? `/grades/${grade.slug}` : '/grades';
  const supabase = await createClient();

  const ids = grade ? (await gamesForGrade(supabase, grade.id, profile)).filter((g) => g.type === 'mcq').map((g) => g.id) : [];
  const { data } = ids.length
    ? await supabase.from('games').select('id, content, topic, difficulty').in('id', ids).order('id')
    : profile.role === 'admin'
      ? await supabase.from('games').select('id, content, topic, difficulty').eq('type', 'mcq').eq('status', 'published').order('id')
      : { data: [] };

  const pool: { question: unknown; topic: string | null; difficulty: number }[] = [];
  for (const g of data ?? []) {
    const parsed = mcqContent.safeParse(g.content);
    if (parsed.success) for (const q of parsed.data.questions) pool.push({ question: q, topic: g.topic as string | null, difficulty: g.difficulty as number });
  }

  const day = cairoDayNumber();
  if (!pool.length) {
    return (
      <SitePage back={{ href: backHref, label: grade ? `ألعاب ${grade.name}` : 'رجوع' }}>
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560, marginTop: 40 }}>
          <div className="e-ic">
            <BoltIcon size={30} />
          </div>
          <h3>سؤال اليوم لسه مجهزش</h3>
          <p>أول ما يبقى فيه ألعاب اختيار من متعدد لمرحلتك، هيبقى فيه سؤال جديد كل يوم هنا.</p>
          <Link href={backHref} className="btn btn-gold">
            شوف الألعاب
          </Link>
        </div>
      </SitePage>
    );
  }

  const pick = pool[(day * 7919 + hash(grade?.id ?? 'all')) % pool.length];
  const game: PlayableGame = {
    id: `daily-${day}`,
    slug: 'daily',
    title: 'سؤال اليوم',
    description: 'سؤال واحد بس، ومعاك ١٠ ثواني. يلا نشوف!',
    type: 'mcq',
    content: { questions: [pick.question] },
    settings: { ...DEFAULT_SETTINGS, questionTimeSec: 10, timeLimitSec: 0, attemptsAllowed: 0, shuffle: true, showExplanations: true },
    item_count: 1,
    cover_url: null,
    topic: pick.topic,
    difficulty: pick.difficulty,
  };

  return (
    <SitePage back={{ href: backHref, label: grade ? `ألعاب ${grade.name}` : 'رجوع' }}>
      <GameShell key={day} game={game} mode="daily" backHref={backHref} backLabel="العب ألعاب مرحلتك" />
    </SitePage>
  );
}
