import type { Catalog, GameTarget } from '@/lib/types';

type Target = Pick<GameTarget, 'grade_id' | 'track_id'>;

/** "٣ ثانوي" when the game is for the whole grade, "٣ ثانوي (بكالوريا)" when only for some tracks. */
export function describeTargets(catalog: Catalog, targets: Target[]): string[] {
  return catalog.grades
    .filter((g) => targets.some((t) => t.grade_id === g.id))
    .map((g) => {
      const mine = targets.filter((t) => t.grade_id === g.id);
      if (mine.some((t) => t.track_id === null) || g.trackIds.length <= 1) return g.name;
      const names = catalog.tracks.filter((tr) => mine.some((t) => t.track_id === tr.id)).map((tr) => tr.name);
      return `${g.name} (${names.join('، ')})`;
    });
}
