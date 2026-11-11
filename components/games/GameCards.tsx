import Link from 'next/link';
import { ChevronEnd, GameTypeIcon, StarIcon } from '@/components/ui/icons';
import { DIFFICULTY_LABELS, num, percent } from '@/lib/format';
import { getDef, itemsLabel } from '@/lib/games/registry';
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
      {games.map((g, i) => {
        const def = getDef(g.type);
        const b = best?.[g.id];
        const p = b ? percent(b.score, b.max) : 0;
        return (
          <Link key={g.id} href={`${hrefPrefix}${g.slug}`} className="gp-card" style={{ animationDelay: `${Math.min(0.1 + i * 0.06, 1).toFixed(2)}s` }}>
            {g.cover_url && (
              <span className="gm-cover-thumb" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.cover_url} alt="" />
              </span>
            )}
            <span className="shine-wrap" aria-hidden="true">
              <span className="shine" style={{ animationDelay: `${(2 + (i % 6) * 0.6).toFixed(1)}s` }} />
            </span>
            {b && (
              <span className={`gm-best${p >= 100 ? ' top' : ''}`} title="أحسن نتيجة ليك">
                <StarIcon size={13} filled /> {num(p)}٪
              </span>
            )}
            <span className="gicon" aria-hidden="true">
              <GameTypeIcon type={g.type} />
            </span>
            <span className="g-k">{def.label}</span>
            <span className="g-n">{g.title}</span>
            {g.description && <span className="g-s">{g.description}</span>}
            <span className="gm-card-meta">
              <span className="badge badge-light">{itemsLabel(g.type, g.item_count)}</span>
              <span className="badge badge-light">{DIFFICULTY_LABELS[g.difficulty] ?? DIFFICULTY_LABELS[1]}</span>
              {g.topic && <span className="badge badge-light">{g.topic}</span>}
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
