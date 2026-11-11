import Link from 'next/link';
import { ChevronEnd, GameTypeIcon, StarIcon } from '@/components/ui/icons';
import { DIFFICULTY_LABELS, num, percent } from '@/lib/format';
import { itemsLabel, typeLabel } from '@/lib/games/meta';
import type { GameType } from '@/lib/games/types';

export interface GameCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  item_count: number;
  topic: string | null;
  difficulty: number;
  cover_url: string | null;
}

export interface BestScore {
  score: number;
  max: number;
}

export function GameCards({
  games,
  hrefPrefix,
  best,
}: {
  games: GameCardData[];
  hrefPrefix: string;
  best?: Record<string, BestScore>;
}) {
  return (
    <div className="gm-cards">
      {games.map((g) => {
        const b = best?.[g.id];
        const p = b ? percent(b.score, b.max) : 0;
        return (
          <Link key={g.id} href={`${hrefPrefix}${g.slug}`} className="gp-card gm-game">
            <span className={`gicon${g.cover_url ? ' has-cover' : ''}`} aria-hidden="true">
              {g.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.cover_url} alt="" loading="lazy" decoding="async" />
              ) : (
                <GameTypeIcon type={g.type} />
              )}
            </span>
            <span className="g-txt">
              <span className="g-k">
                {typeLabel(g.type)}
                {b ? (
                  <span className={`gm-best${p >= 100 ? ' top' : ''}`} title="أحسن نتيجة ليك">
                    <StarIcon size={12} filled /> {num(p)}٪
                  </span>
                ) : (
                  best && <span className="gm-new">جديدة</span>
                )}
              </span>
              <span className="g-n">{g.title}</span>
              <span className="g-m">
                {itemsLabel(g.type, g.item_count)} · {DIFFICULTY_LABELS[g.difficulty] ?? DIFFICULTY_LABELS[1]}
                {g.topic && ` · ${g.topic}`}
              </span>
            </span>
            <span className="gp-go" aria-hidden="true">
              <ChevronEnd />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
