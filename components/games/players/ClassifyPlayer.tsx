'use client';

import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { num } from '@/lib/format';
import type { ClassifyAnswers, ClassifyContent, ClassifyItem } from '@/lib/games/defs/classify';
import { shuffle } from '@/lib/games/random';
import { gentleAutoScroll, pointerFirst, useClickGuard, useDragSensors } from '../dnd';
import { Feedback, Highlighted } from '../parts';
import type { PlayerProps } from '../types';

const TRAY = 'tray';

export default function ClassifyPlayer({ content, settings, timeUp, onFinish, onProgress }: PlayerProps<ClassifyContent, ClassifyAnswers>) {
  const [items] = useState(() => (settings.shuffle ? shuffle(content.items) : content.items));
  const [place, setPlace] = useState<Record<string, string | null>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const sensors = useDragSensors();
  const guard = useClickGuard();
  const finished = useRef(false);
  const label = new Map(content.buckets.map((b) => [b.id, b.label]));

  const answersNow = (): ClassifyAnswers => ({ answers: items.map((it) => ({ id: it.id, bucketId: place[it.id] ?? null })) });

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinish(answersNow());
  }

  function move(itemId: string, bucketId: string | null) {
    if (checked) return;
    const next = { ...place, [itemId]: bucketId };
    setPlace(next);
    setSel(null);
    onProgress?.(items.filter((it) => next[it.id]).length, items.length);
  }

  function tapItem(id: string) {
    if (guard.blocked() || checked) return;
    if (place[id]) move(id, null);
    else setSel(sel === id ? null : id);
  }

  function tapBucket(bucketId: string) {
    if (sel && !checked) move(sel, bucketId);
  }

  function onDragStart(e: DragStartEvent) {
    guard.start();
    setDragId(String(e.active.id));
    setSel(null);
  }

  function onDragEnd(e: DragEndEvent) {
    guard.end();
    setDragId(null);
    if (!e.over) return;
    const target = String(e.over.id);
    move(String(e.active.id), target === TRAY ? null : target.slice(2));
  }

  useEffect(() => {
    if (timeUp) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const tray = items.filter((it) => !place[it.id]);
  const placedCount = items.length - tray.length;
  const correct = checked ? items.filter((it) => place[it.id] === it.bucketId).length : 0;
  const dragItem = dragId ? items.find((it) => it.id === dragId) : null;

  return (
    <div className="gm-board">
      <div className="gm-qhead">
        <span>
          اتحط {num(placedCount)} من {num(items.length)}
        </span>
        {sel && <span className="badge badge-wine">دوس على المجموعة المناسبة</span>}
      </div>
      <div className="bar gm-progress">
        <span style={{ width: `${(placedCount / items.length) * 100}%` }} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerFirst}
        autoScroll={gentleAutoScroll}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => (guard.end(), setDragId(null))}
      >
        {!checked && (
          <Zone id={TRAY} className={`gm-tray${tray.length ? '' : ' empty'}`}>
            {tray.map((it) => (
              <Item key={it.id} item={it} selected={sel === it.id} onTap={() => tapItem(it.id)} />
            ))}
          </Zone>
        )}
        <div className="gm-buckets">
          {content.buckets.map((b) => (
            <Zone key={b.id} id={`b:${b.id}`} className={`gm-bucket${sel ? ' target' : ''}`} onTap={() => tapBucket(b.id)} label={b.label}>
              <h3>{b.label}</h3>
              {items
                .filter((it) => place[it.id] === b.id)
                .map((it) => (
                  <Item
                    key={it.id}
                    item={it}
                    selected={false}
                    state={checked ? (it.bucketId === b.id ? 'ok' : 'bad') : undefined}
                    fix={checked && it.bucketId !== b.id ? label.get(it.bucketId) : undefined}
                    onTap={() => tapItem(it.id)}
                  />
                ))}
            </Zone>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragItem ? (
            <div className="gm-drag-ghost">
              <Highlighted text={dragItem.text} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!checked ? (
        <div className="gm-actions">
          <button type="button" className="btn btn-gold" disabled={tray.length > 0} onClick={() => setChecked(true)}>
            تأكيد
          </button>
          {tray.length > 0 && <span className="muted">لسه {num(tray.length)} من غير مكان</span>}
        </div>
      ) : (
        <Feedback ok={correct === items.length} title={correct === items.length ? 'تصنيف مظبوط!' : `صح ${num(correct)} من ${num(items.length)}`} onNext={finish} last>
          {correct < items.length && <p>الكروت الحمرا مكانها الصح مكتوب تحتها.</p>}
        </Feedback>
      )}
    </div>
  );
}

function Zone({ id, className, children, onTap, label }: { id: string; className: string; children: ReactNode; onTap?: () => void; label?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className}${isOver ? ' over' : ''}`}
      onClick={(e) => {
        if (onTap && e.target === e.currentTarget) onTap();
        else if (onTap && (e.target as HTMLElement).tagName === 'H3') onTap();
      }}
      role={onTap ? 'button' : undefined}
      aria-label={label ? `حط هنا: ${label}` : undefined}
      tabIndex={onTap ? 0 : undefined}
      onKeyDown={(e) => {
        if (onTap && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onTap();
        }
      }}
    >
      {children}
    </div>
  );
}

function Item({
  item,
  selected,
  state,
  fix,
  onTap,
}: {
  item: ClassifyItem;
  selected: boolean;
  state?: 'ok' | 'bad';
  fix?: string;
  onTap: () => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: item.id, disabled: Boolean(state) });
  const cls = ['gm-item', selected ? 'sel' : '', state ?? '', isDragging ? 'dragging' : ''].filter(Boolean).join(' ');
  return (
    <button ref={setNodeRef} type="button" {...attributes} {...listeners} className={cls} aria-pressed={selected} onClick={onTap}>
      <span>
        <Highlighted text={item.text} />
        {fix && <span className="fix">مكانها: {fix}</span>}
      </span>
    </button>
  );
}
