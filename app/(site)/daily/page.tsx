import type { Metadata } from 'next';
import { RichText } from '@/components/games/parts';
import { ShareButton } from '@/components/hub/ShareButton';
import { SitePage } from '@/components/site/SiteHeader';
import { CalendarIcon, ExternalIcon, FacebookIcon, QuestionIcon } from '@/components/ui/icons';
import { getCatalog, getSession, gradeName } from '@/lib/data';
import { cairoDayKey, formatDayKey } from '@/lib/format';
import { loadDailyQuestions } from '@/lib/hub';
import { FACEBOOK_GROUP, sectionBack } from '@/lib/sections';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'سؤال اليوم' };

/** The question the team posted for today. Students answer it in the Facebook group, not here. */
export default async function DailyPage() {
  const [{ profile }, catalog, supabase] = await Promise.all([getSession(), getCatalog(), createClient()]);
  const { today, past } = await loadDailyQuestions(supabase, profile);

  return (
    <SitePage back={sectionBack(profile, '/admin/daily')}>
      <p className="hello">{formatDayKey(cairoDayKey())}</p>
      <h1 className="gp-title">سؤال اليوم</h1>
      <p className="gp-sub">فكّر فيه كويس، واكتب إجابتك في كومنت على جروب الفيس.</p>

      {today ? (
        <article className="dq-card a-fadeup">
          <span className="dq-k">
            <QuestionIcon size={18} /> سؤال النهارده{today.grade_id ? ` · ${gradeName(catalog, today.grade_id)}` : ''}
          </span>
          {today.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dq-img" src={today.image_url} alt="" />
          )}
          <p className="dq-text">
            <RichText text={today.question} />
          </p>
          <div className="dq-actions">
            <a href={today.post_url || FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-fb">
              <FacebookIcon size={22} /> جاوب على جروب الفيس
            </a>
            <ShareButton copy text={`سؤال اليوم من تيم حمثلاح:\n${today.question}`} label="انسخ السؤال" />
          </div>
          <p className="dq-note">
            {today.post_url
              ? 'الزرار هيفتحلك بوست السؤال على الجروب، اكتب إجابتك في كومنت.'
              : 'ادخل الجروب ودوّر على بوست سؤال النهارده، واكتب إجابتك في كومنت.'}
          </p>
        </article>
      ) : (
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
          <div className="e-ic">
            <QuestionIcon size={30} />
          </div>
          <h3>سؤال النهارده لسه منزلش</h3>
          <p>التيم بينزّل سؤال جديد كل يوم. خليك على الجروب عشان تشوفه أول ما ينزل.</p>
          <a href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer" className="btn btn-fb">
            <FacebookIcon size={20} /> ادخل الجروب
          </a>
        </div>
      )}

      {past.length > 0 && (
        <section className="dq-past" aria-labelledby="dq-past-title">
          <h2 id="dq-past-title">أسئلة الأيام اللي فاتت</h2>
          <ul>
            {past.map((q) => (
              <li key={q.id} className="dq-old">
                <span className="dq-day">
                  <CalendarIcon size={15} /> {formatDayKey(q.day)}
                </span>
                <p>
                  <RichText text={q.question} />
                </p>
                {q.post_url && (
                  <a href={q.post_url} target="_blank" rel="noopener noreferrer" className="dq-link">
                    شوف الإجابات على الجروب <ExternalIcon size={14} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </SitePage>
  );
}
