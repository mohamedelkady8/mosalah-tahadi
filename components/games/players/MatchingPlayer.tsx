'use client';

import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useEffect, useRef, useState } from 'react';
import { num } from '@/lib/format';
import type { MatchingAnswers, MatchingContent, MatchingPair } from '@/lib/games/defs/matching';
import { shuffle, shuffleChanged } from '@/lib/games/random';
import { gentleAutoScroll, PAIR_COLORS, pointerFirst, useClickGuard, useDragSensors } from '../dnd';
import type { PlayerProps } from '../types';

type Side = 'l' | 'r';

export default function MatchingPlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<MatchingContent, MatchingAnswers>) {
  const pairs = content.pairs;
  const [left] = useState(() => (settings.shuffle ? shuffle(pairs) : pairs));
  const [right] = useState(() => shuffleChanged(left, (p) => p.id));
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ l: string; r: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const attempts = useRef<MatchingAnswers['attempts']>([]);
  const matchedRef = useRef<string[]>([]);
  const finished = useRef(false);
  const sensors = useDragSensors();
  const guard = useClickGuard();

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinish({ attempts: attempts.current });
  }

  function tryMatch(l: string, r: string) {
    if (finished.current || matchedRef.current.includes(l) || matchedRef.current.includes(r)) return;
    attempts.current.push({ leftId: l, rightId: r });
    setSel(null);
    if (l === r) {
      const next = [...matchedRef.current, l];
      matchedRef.current = next;
      setMatched(next);
      onProgress?.(next.length, pairs.length);
      if (next.length === pairs.length) setTimeout(finish, 700);
    } else {
      setWrong({ l, r });
      setTimeout(() => setWrong((w) => (w && w.l === l && w.r === r ? null : w)), 700);
    }
  }

  function tap(side: Side, id: string) {
    if (guard.blocked() || matchedRef.current.includes(id)) return;
    if (!sel || sel.side === side) {
      setSel(sel && sel.side === side && sel.id === id ? null : { side, id });
      return;
    }
    if (side === 'r') tryMatch(sel.id, id);
    else tryMatch(id, sel.id);
  }

  function onDragStart(e: DragStartEvent) {
    guard.start();
    setDragId(String(e.active.id));
    setSel(null);
  }

  function onDragEnd(e: DragEndEvent) {
    guard.end();
    setDragId(null);
    if (e.over) tryMatch(String(e.active.id), String(e.over.id).slice(2));
  }

  useEffect(() => {
    if (timeUp) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const colorOf = (id: string) => {
    const i = matched.indexOf(id);
    return i < 0 ? undefined : PAIR_COLORS[i % PAIR_COLORS.length];
  };
  const dragPair = dragId ? pairs.find((p) => p.id === dragId) : null;

  return (
    <div className="gm-board">
      <div className="gm-qhead">
        <span>
          وصّلت {num(matched.length)} من {num(pairs.length)}
        </span>
      </div>
      <div className="bar gm-progress">
        <span style={{ width: `${(matched.length / pairs.length) * 100}%` }} />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerFirst}
        autoScroll={gentleAutoScroll}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => (guard.end(), setDragId(null))}
      >
        <div className="gm-match">
          <div className="gm-col">
            <h3>{content.leftLabel}</h3>
            {left.map((p) => (
              <LeftItem
                key={p.id}
                pair={p}
                color={colorOf(p.id)}
                number={matched.indexOf(p.id) + 1}
                selected={sel?.side === 'l' && sel.id === p.id}
                wrong={wrong?.l === p.id}
                onTap={() => tap('l', p.id)}
              />
            ))}
          </div>
          <div className="gm-col">
            <h3>{content.rightLabel}</h3>
            {right.map((p) => (
              <RightItem
                key={p.id}
                pair={p}
                color={colorOf(p.id)}
                number={matched.indexOf(p.id) + 1}
                selected={sel?.side === 'r' && sel.id === p.id}
                wrong={wrong?.r === p.id}
                onTap={() => tap('r', p.id)}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>{dragPair ? <div className="gm-drag-ghost">{dragPair.left}</div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

interface ItemProps {
  pair: MatchingPair;
  color?: string;
  number: number;
  selected: boolean;
  wrong: boolean;
  onTap: () => void;
}

function itemClass({ color, selected, wrong }: ItemProps, extra = '') {
  return ['gm-mi', color ? 'done' : '', selected ? 'sel' : '', wrong ? 'wrong a-shake' : '', extra].filter(Boolean).join(' ');
}

function LeftItem(props: ItemProps) {
  const done = Boolean(props.color);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: props.pair.id, disabled: done });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={itemClass(props, isDragging ? 'dragging' : '')}
      style={props.color ? { background: props.color } : undefined}
      aria-pressed={props.selected}
      disabled={done}
      onClick={props.onTap}
    >
      {done && <span className="n">{num(props.number)}</span>}
      {props.pair.left}
    </button>
  );
}

function RightItem(props: ItemProps) {
  const done = Boolean(props.color);
  const { setNodeRef, isOver } = useDroppable({ id: `r:${props.pair.id}`, disabled: done });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={itemClass(props, isOver ? 'over' : '')}
      style={props.color ? { background: props.color } : undefined}
      aria-pressed={props.selected}
      disabled={done}
      onClick={props.onTap}
    >
      {done && <span className="n">{num(props.number)}</span>}
      {props.pair.right}
    </button>
  );
}
