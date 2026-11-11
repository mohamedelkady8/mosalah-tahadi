'use client';

import { useState } from 'react';
import { BulbIcon, RefreshIcon } from '@/components/ui/icons';
import { num } from '@/lib/format';
import { shuffle } from '@/lib/games/random';
import { ShareButton } from './ShareButton';

/** One tip at a time as a pinned note. "نصيحة كمان" goes through all of them in a random order before repeating. */
export function TipDeck({ tips, start }: { tips: { id: string; body: string }[]; start: number }) {
  const [order] = useState(() => [start, ...shuffle(tips.map((_, i) => i).filter((i) => i !== start))]);
  const [pos, setPos] = useState(0);
  const tip = tips[order[pos]];

  return (
    <div className="tip-stage">
      <article key={tip.id} className="tip-card" aria-live="polite">
        <span className="pin" aria-hidden="true" />
        <span className="tip-k">
          <BulbIcon size={18} /> نصيحة من التيم
        </span>
        <p className="tip-text">{tip.body}</p>
        <span className="tip-sign">تيم حمثلاح</span>
      </article>
      {tips.length > 1 && (
        <span className="tip-count">
          {num(pos + 1)} من {num(tips.length)}
        </span>
      )}
      <div className="tip-actions">
        {tips.length > 1 && (
          <button type="button" className="btn btn-gold btn-lg" onClick={() => setPos((p) => (p + 1) % order.length)}>
            <RefreshIcon size={20} /> نصيحة كمان
          </button>
        )}
        <ShareButton text={`${tip.body}\n\nنصيحة من تيم حمثلاح`} label="شارك النصيحة" />
      </div>
    </div>
  );
}
