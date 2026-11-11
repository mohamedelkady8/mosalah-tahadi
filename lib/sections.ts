export const SECTION_KEYS = ['contests', 'games', 'quick', 'tips', 'videos', 'daily'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export interface Section {
  key: SectionKey;
  label: string;
  desc: string;
  href: string;
}

export const SECTIONS: Record<SectionKey, Section> = {
  contests: { key: 'contests', label: 'مسابقات', desc: 'نافس زمايلك في مسابقات التيم، والأوائل ليهم جوايز.', href: '/contests' },
  games: { key: 'games', label: 'ألعاب', desc: 'اتعلم العربي وإنت بتلعب.', href: '/games' },
  quick: { key: 'quick', label: 'ع السريع', desc: 'أسئلة سريعة، وبعد كل سؤال تحليل يقولك مشكلتك فين.', href: '/quick' },
  tips: { key: 'tips', label: 'نصايح', desc: 'نصيحة من التيم هتسهّل عليك المذاكرة.', href: '/tips' },
  videos: { key: 'videos', label: 'فيديوهات تحفيزية', desc: 'فيديو من التيم هيفرق معاك.', href: '/videos' },
  daily: { key: 'daily', label: 'سؤال اليوم', desc: 'سؤال جديد كل يوم، وإجابتك على جروب الفيس.', href: '/daily' },
};

/** Where a section page's back link goes: the wheel for students, the section's admin page for admins. */
export function sectionBack(profile: { role: string } | null, adminHref: string): { href: string; label: string } {
  if (!profile) return { href: '/grades', label: 'المراحل' };
  if (profile.role === 'admin') return { href: adminHref, label: 'لوحة التحكم' };
  return { href: '/wheel', label: 'العجلة' };
}

export const FACEBOOK_GROUP = 'https://www.facebook.com/share/g/19j9KEgPSD/?mibextid=wwXIfr';
