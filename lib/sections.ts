export interface Section {
  label: string;
  desc: string;
  /** Internal path, external URL, or nothing while the section is still being prepared. */
  href?: string;
}

export const SECTIONS = {
  contests: { label: 'مسابقات', desc: 'نافس زمايلك، وخش لوحة الشرف.', href: '/leaderboard' },
  games: { label: 'ألعاب', desc: 'اتعلم العربي وإنت بتلعب.', href: '/games' },
  quick: { label: 'ع السريع', desc: '١٠ أسئلة، وبعد كل سؤال تحليل يقولك مشكلتك فين.', href: 'https://tahadi-team-hamthalah.vercel.app/' },
  tips: { label: 'نصايح', desc: 'نصايح من التيم هتسهّل عليك.' },
  videos: { label: 'فيديوهات تحفيزية', desc: 'فيديوهات من التيم هتفرق معاك.' },
  daily: { label: 'سؤال اليوم', desc: 'سؤال واحد، يتحل في ١٠ ثواني.', href: '/daily' },
} satisfies Record<string, Section>;

export const COMING_SOON = 'الجزء ده تحت التجهيز، وقريب هيبقى موجود';
