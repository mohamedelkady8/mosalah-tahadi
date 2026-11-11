'use client';

import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { RefreshIcon } from '@/components/ui/icons';
import { joinTiles, scrambleTiles, type ScrambleAnswers, type ScrambleContent } from '@/lib/games/defs/scramble';
import { shuffle, shuffleChanged } from '@/lib/games/random';
import { normalizeSpaces } from '@/lib/games/text';
import { useClickGuard, useDragSensors } from '../dnd';
import { Feedback, StepHead } from '../parts';
import type { PlayerProps } from '../types';

interface Tile {
  id: string;
  text: string;
}

function tilesFor(mode: ScrambleContent['mode'], answer: string): Tile[] {
  const tiles = scrambleTiles(mode, answer).map((text, i) => ({ id: `t${i}`, text }));
  return shuffleChanged(tiles, (t) => t.text);
}

export default function ScramblePlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<ScrambleContent, ScrambleAnswers>) {
  const [order] = useState(() => (settings.shuffle ? shuffle(content.items) : content.items));
  const [idx, setIdx] = useState(0);
  const [tiles, setTiles] = useState(() => tilesFor(content.mode, order[0].answer));
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const answers = useRef<ScrambleAnswers['answers']>([]);
  const sensors = useDragSensors();
  const guard = useClickGuard();
  const item = order[idx];
  const last = idx === order.length - 1;
  const letters = content.mode === 'letters';
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const bank = tiles.filter((t) => !placed.includes(t.id));
  const value = joinTiles(content.mode, placed.map((id) => byId.get(id)!.text));

  function currentAnswers() {
    if (checked === null && placed.length) return [...answers.current, { id: item.id, value }];
    return answers.current;
  }

  function check() {
    const ok = letters
      ? value.replace(/\s+/g, '') === item.answer.replace(/\s+/g, '')
      : normalizeSpaces(value) === normalizeSpaces(item.answer);
    answers.current.push({ id: item.id, value });
    setChecked(ok);
    onProgress?.(idx + 1, order.length);
  }

  function next() {
    if (last) {
      onFinish({ answers: answers.current });
      return;
    }
    const n = idx + 1;
    setIdx(n);
    setTiles(tilesFor(content.mode, order[n].answer));
    setPlaced([]);
    setChecked(null);
  }

  function onDragEnd(e: DragEndEvent) {
    guard.end();
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setPlaced((p) => arrayMove(p, p.indexOf(String(active.id)), p.indexOf(String(over.id))));
  }

  useEffect(() => {
    if (timeUp) onFinish({ answers: currentAnswers() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const done = checked !== null;

  return (
    <div className="gm-board">
      <StepHead index={idx} total={order.length} label={letters ? 'كلمة' : 'جملة'} />
      <h2 className="gm-prompt" style={{ marginBottom: 0 }}>
        {letters ? 'رتّب الحروف عشان تطلع الكلمة' : 'رتّب الكلمات عشان تكوّن جملة صح'}
      </h2>
      {item.hint && <div className="gm-hint">{item.hint}</div>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={guard.start} onDragEnd={onDragEnd} onDragCancel={guard.end}>
        <SortableContext items={placed} strategy={rectSortingStrategy}>
          <div className={`gm-slots${placed.length ? '' : ' empty'}${done ? (checked ? ' ok' : ' bad') : ''}`}>
            {placed.map((id) => (
              <SortableTile
                key={id}
                tile={byId.get(id)!}
                letter={letters}
                disabled={done}
                onTap={() => !guard.blocked() && setPlaced((p) => p.filter((x) => x !== id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!done && (
        <div className="gm-bank">
          {bank.map((t) => (
            <button key={t.id} type="button" className={`gm-tile${letters ? ' letter' : ''}`} onClick={() => setPlaced((p) => [...p, t.id])}>
              {t.text}
            </button>
          ))}
        </div>
      )}

      {!done && (
        <div className="gm-actions">
          <button type="button" className="btn btn-gold" disabled={bank.length > 0} onClick={check}>
            تأكيد
          </button>
          <button type="button" className="btn btn-ghost" disabled={!placed.length} onClick={() => setPlaced([])}>
            <RefreshIcon size={18} /> ابدأ من الأول
          </button>
        </div>
      )}

      {done && (
        <Feedback ok={Boolean(checked)} title={checked ? 'ترتيب مظبوط!' : 'الترتيب مش مظبوط'} onNext={next} last={last}>
          {!checked && (
            <p>
              الصح: <b>{item.answer}</b>
            </p>
          )}
        </Feedback>
      )}
    </div>
  );
}

function SortableTile({ tile, letter, disabled, onTap }: { tile: Tile; letter: boolean; disabled: boolean; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.id, disabled });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={`gm-tile placed${letter ? ' letter' : ''}${isDragging ? ' ghost' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      disabled={disabled}
      onClick={onTap}
    >
      {tile.text}
    </button>
  );
}
