import type { Catalog } from '@/lib/types';

/** Used only when Supabase isn't configured yet, so the public pages still render. */
export const FALLBACK_CATALOG: Catalog = {
  tracks: [
    { id: 'track-bac', slug: 'bac', name: 'بكالوريا', sort_order: 1 },
    { id: 'track-general', slug: 'general', name: 'ثانوية عامة', sort_order: 2 },
  ],
  grades: [
    { id: 'grade-sec3', slug: 'sec3', name: '٣ ثانوي', label: 'طلاب', subtitle: 'الصف الثالث الثانوي', icon: 'cap', sort_order: 1, active: true, trackIds: ['track-general'] },
    { id: 'grade-sec2-bac', slug: 'sec2-bac', name: 'تانية بكالوريا', label: 'طلاب', subtitle: 'الصف الثاني، نظام البكالوريا', icon: 'book', sort_order: 2, active: true, trackIds: ['track-bac'] },
    { id: 'grade-sec1', slug: 'sec1', name: 'أولى ثانوي', label: 'طلاب', subtitle: 'الصف الأول الثانوي', icon: 'sprout', sort_order: 3, active: true, trackIds: ['track-bac', 'track-general'] },
    { id: 'grade-sec2-general', slug: 'sec2-general', name: 'تانية عام', label: 'طلاب', subtitle: 'الصف الثاني، النظام العام', icon: 'star', sort_order: 4, active: true, trackIds: ['track-general'] },
  ],
};

export const FALLBACK_QUOTES = [
  'حلِّق حتَّى تعانقَ النجوم',
  'الحلمُ لا يعرفُ المستحيل',
  'مُصدِّقُ نفسِهِ يَصِلُ',
  'أخبرِ العالمَ مَن أنت',
  'يليقُ باسمِكَ السماء',
  'القمة قرار والنجاح إصرار',
  'المجدُ لمن يجرؤ',
  '﴿وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ﴾ (الضحى: ٥)',
  'الاستمرارية تصنع المستحيل',
  'لا تحلم بنجم، احلم بالمجرّة',
  'كن مضيئًا لنفسِك',
  'عقيدةُ الحالمين الصمود',
  'لا تخذل نفسك',
  'اعصِ هواكَ لتنالَ مُناك',
  'كن أثرًا طيّبًا',
  'لا ترتدِ ثوبَ الاستسلام؛ فثوبُ العزيمةِ أليقُ بك.',
  'أبحِرْ؛ فاليأسُ هو الغرق.',
  'الأملُ مِجدافُك، والعزيمةُ شِراعُك؛ فأبحِر.',
  'لا تُطفئ شمعةَ حلمِك بأنفاسِ اليأس.',
  'اغرسْ تعبَك اليوم، تحصدْ فرحتَك غدًا.',
  'اجعلْ من عثرتِك سُلَّمًا لا قبرًا.',
  'النجاحُ ثمرةٌ لا يقطفُها إلا الصابرون.',
  'الحلمُ يطرقُ بابَ مَن سهِرَ له.',
  'تذكّرْ أن الفجرَ يُولَدُ من رَحِمِ الليل.',
  'مَن صعِدَ جبلَ التعب، رأى سهلَ النجاح.',
  'اكتبْ حلمَك بحبرِ الاجتهاد.',
  'الطريقُ إلى القمةِ لا يعرفُ المصاعد.',
];
