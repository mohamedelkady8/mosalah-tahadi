'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GameTypeIcon, GamepadIcon, SearchIcon } from '@/components/ui/icons';
import { num } from '@/lib/format';
import { getDef } from '@/lib/games/registry';
import { normalizeAnswer } from '@/lib/games/text';
import { GAME_TYPES, type GameType } from '@/lib/games/types';
import { GameCards, type BestScore, type GameCardData } from './GameCards';

type Played = 'all' | 'new' | 'done';

export function GameBrowser({ games, best }: { games: GameCardData[]; best: Record<string, BestScore> }) {
  const [type, setType] = useState<GameType | 'all'>('all');
  const [topic, setTopic] = useState('all');
  const [played, setPlayed] = useState<Played>('all');
  const [q, setQ] = useState('');

  const types = GAME_TYPES.filter((t) => games.some((g) => g.type === t));
  const topics = useMemo(() => [...new Set(games.map((g) => g.topic).filter((t): t is string => Boolean(t)))].sort((a, b) => a.localeCompare(b, 'ar')), [games]);
  const doneCount = games.filter((g) => best[g.id]).length;

  const list = useMemo(() => {
    const needle = normalizeAnswer(q);
    return games.filter(
      (g) =>
        (type === 'all' || g.type === type) &&
        (topic === 'all' || g.topic === topic) &&
        (played === 'all' || (played === 'done' ? Boolean(best[g.id]) : !best[g.id])) &&
        (!needle || normalizeAnswer(`${g.title} ${g.description} ${g.topic ?? ''}`).includes(needle)),
    );
  }, [games, type, topic, played, q, best]);

  if (!games.length) {
    return (
      <div className="card empty st-panel a-fadeup" style={{ animationDelay: '.5s' }}>
        <div className="e-ic">
          <GamepadIcon size={30} />
        </div>
        <h3>لسه مفيش ألعاب هنا</h3>
        <p>التيم بيجهّز ألعاب لمرحلتك، وأول ما تنزل هتلاقيها هنا. لحد ما ده يحصل، جرّب الألعاب التجريبية.</p>
        <Link href="/try" className="btn btn-gold">
          جرّب الألعاب
        </Link>
      </div>
    );
  }

  const filtered = type !== 'all' || topic !== 'all' || played !== 'all' || q.trim() !== '';

  return (
    <>
      <div className="gm-filter a-fadeup" style={{ animationDelay: '.5s' }}>
        {doneCount > 0 && (
          <div className="tabs" role="group" aria-label="اللي لعبته">
            {(
              [
                ['all', 'الكل'],
                ['new', `جديدة عليك (${num(games.length - doneCount)})`],
                ['done', `لعبتها (${num(doneCount)})`],
              ] as [Played, string][]
            ).map(([key, label]) => (
              <button key={key} type="button" className={played === key ? 'on' : ''} aria-pressed={played === key} onClick={() => setPlayed(key)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {types.length > 1 && (
          <div className="chips gm-types" role="group" aria-label="نوع اللعبة">
            <button type="button" className={`chip${type === 'all' ? ' on' : ''}`} aria-pressed={type === 'all'} onClick={() => setType('all')}>
              كل الأنواع
            </button>
            {types.map((t) => (
              <button key={t} type="button" className={`chip${type === t ? ' on' : ''}`} aria-pressed={type === t} onClick={() => setType(t)}>
                <GameTypeIcon type={t} size={15} />
                {getDef(t).label}
              </button>
            ))}
          </div>
        )}
        {(games.length > 12 || topics.length > 1) && (
          <div className="row" style={{ justifyContent: 'center' }}>
            {games.length > 12 && (
              <div className="gm-search">
                <SearchIcon size={18} />
                <input className="input input-sm" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على لعبة أو درس" aria-label="دوّر على لعبة" />
              </div>
            )}
            {topics.length > 1 && (
              <select className="select input-sm" style={{ width: 'auto', minWidth: 160 }} value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="الدرس">
                <option value="all">كل الدروس</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {list.length ? (
        <GameCards games={list} hrefPrefix="/play/" best={best} />
      ) : (
        <div className="card empty st-panel">
          <h3>مفيش ألعاب بالشكل ده</h3>
          <p>{played === 'new' ? 'برافو! لعبت كل الألعاب اللي هنا.' : 'جرّب تغيّر الفلتر.'}</p>
          {filtered && (
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                setType('all');
                setTopic('all');
                setPlayed('all');
                setQ('');
              }}
            >
              اعرض كل الألعاب
            </button>
          )}
        </div>
      )}
    </>
  );
}
