import type { Metadata } from 'next';
import Link from 'next/link';
import { Countdown } from '@/components/hub/Countdown';
import { SitePage } from '@/components/site/SiteHeader';
import { CheckIcon, GiftIcon, TrophyIcon } from '@/components/ui/icons';
import { requireSession } from '@/lib/data';
import { formatWhen, num } from '@/lib/format';
import { firstAttempts, loadContests, type ContestCard, type FirstAttempt } from '@/lib/hub';
import type { ContestPhase } from '@/lib/kinds';
import { FACEBOOK_GROUP, sectionBack } from '@/lib/sections';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'مسابقات' };

const TAGS: Record<ContestPhase, string> = { live: 'شغالة دلوقتي', upcoming: 'قريب', ended: 'خلصت' };

function ContestTile({ c, phase, mine }: { c: ContestCard; phase: ContestPhase; mine?: FirstAttempt }) {
  return (
    <Link href={`/contests/${c.slug}`} className={`ct-card ${phase}`}>
      <span className={`ct-tag ${phase}`}>{TAGS[phase]}</span>
      <h3>{c.title}</h3>
      {c.description && <p>{c.description}</p>}
      {c.prize && (
        <span className="ct-prize">
          <GiftIcon size={16} /> {c.prize}
        </span>
      )}
      <span className="ct-when">
        {phase === 'live' ? (
          <Countdown to={c.ends_at} inline prefix="بتقفل بعد" />
        ) : phase === 'upcoming' ? (
          <Countdown to={c.starts_at} inline prefix="بتبدأ بعد" />
        ) : (
          `خلصت ${formatWhen(c.ends_at)}`
        )}
      </span>
      <span className="ct-go">
        {mine ? (
          <>
            <CheckIcon size={16} /> شاركت · {num(mine.score)}/{num(mine.max_score)}
          </>
        ) : phase === 'live' ? (
          'ادخل المسابقة'
        ) : phase === 'upcoming' ? (
          formatWhen(c.starts_at)
        ) : (
          'شوف النتيجة'
        )}
      </span>
    </Link>
  );
}

export default async function ContestsPage() {
  const { profile } = await requireSession('/contests');
  const supabase = await createClient();
  const { live, upcoming, ended } = await loadContests(supabase);
  const mine = await firstAttempts(
    supabase,
    profile.id,
    [...live, ...ended].map((c) => c.id),
  );
  const empty = !live.length && !upcoming.length && !ended.length;

  return (
    <SitePage back={sectionBack(profile, '/admin/contests')}>
      <p className="hello">نافس زمايلك</p>
      <h1 className="gp-title">مسابقات</h1>
      <p className="gp-sub">مسابقات من التيم ليها ميعاد، ومحاولة واحدة بس. الأوائل ليهم جوايز.</p>

      {empty && (
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
          <div className="e-ic">
            <TrophyIcon size={30} />
          </div>
          <h3>مفيش مسابقات دلوقتي</h3>
          <p>التيم بيعلن عن المسابقات على الجروب، خليك متابع.</p>
          <a href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer" className="btn btn-fb">
            ادخل الجروب
          </a>
        </div>
      )}

      {live.length > 0 && (
        <section className="ct-sec" aria-labelledby="ct-live">
          <h2 id="ct-live" className="ct-h">
            <span className="ct-dot" aria-hidden="true" /> شغالة دلوقتي
          </h2>
          <div className="ct-grid">
            {live.map((c) => (
              <ContestTile key={c.id} c={c} phase="live" mine={mine.get(c.id)} />
            ))}
          </div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="ct-sec" aria-labelledby="ct-soon">
          <h2 id="ct-soon" className="ct-h">
            جاية قريب
          </h2>
          <div className="ct-grid">
            {upcoming.map((c) => (
              <ContestTile key={c.id} c={c} phase="upcoming" />
            ))}
          </div>
        </section>
      )}
      {ended.length > 0 && (
        <section className="ct-sec" aria-labelledby="ct-ended">
          <h2 id="ct-ended" className="ct-h">
            خلصت
          </h2>
          <div className="ct-grid">
            {ended.map((c) => (
              <ContestTile key={c.id} c={c} phase="ended" mine={mine.get(c.id)} />
            ))}
          </div>
        </section>
      )}
    </SitePage>
  );
}
