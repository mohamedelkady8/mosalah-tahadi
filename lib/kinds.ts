/** What a row in `games` is: a normal game, an «ع السريع» quiz, or a timed contest. */
export const GAME_KINDS = ['game', 'quick', 'contest'] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export function kindOf(value: unknown): GameKind {
  return typeof value === 'string' && (GAME_KINDS as readonly string[]).includes(value) ? (value as GameKind) : 'game';
}

interface KindInfo {
  /** Where students open one, e.g. /quick/{slug}. */
  studentBase: string;
  /** Where admins list and edit them. */
  adminBase: string;
  /** "اللعبة" / "التحدي" / "المسابقة". */
  the: string;
  /** "لعبة" / "تحدي" / "مسابقة". */
  one: string;
  /** Section title in the admin panel. */
  plural: string;
  newLabel: string;
}

export const KIND_INFO: Record<GameKind, KindInfo> = {
  game: { studentBase: '/play', adminBase: '/admin/games', the: 'اللعبة', one: 'لعبة', plural: 'الألعاب', newLabel: 'لعبة جديدة' },
  quick: { studentBase: '/quick', adminBase: '/admin/quick', the: 'التحدي', one: 'تحدي', plural: 'ع السريع', newLabel: 'تحدي جديد' },
  contest: { studentBase: '/contests', adminBase: '/admin/contests', the: 'المسابقة', one: 'مسابقة', plural: 'المسابقات', newLabel: 'مسابقة جديدة' },
};

export const studentHref = (kind: GameKind, slug: string) => `${KIND_INFO[kind].studentBase}/${slug}`;
export const adminHref = (kind: GameKind, id: string) => `${KIND_INFO[kind].adminBase}/${id}`;

export type ContestPhase = 'upcoming' | 'live' | 'ended';

/** A contest still accepts answers this long after it closes, for students who started just before the end. */
export const CONTEST_GRACE_MS = 5 * 60 * 1000;

export function contestPhase(startsAt: string | null, endsAt: string | null, now = Date.now()): ContestPhase {
  if (!startsAt || new Date(startsAt).getTime() > now) return 'upcoming';
  if (endsAt && new Date(endsAt).getTime() <= now) return 'ended';
  return 'live';
}
