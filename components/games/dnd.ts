'use client';

import { MouseSensor, pointerWithin, rectIntersection, TouchSensor, useSensor, useSensors, type CollisionDetection } from '@dnd-kit/core';
import { useCallback, useRef } from 'react';

/** Scroll only when the finger is right at the screen edge, so drop zones don't slide away mid-drag. */
export const gentleAutoScroll = { threshold: { x: 0, y: 0.08 }, acceleration: 4 };

/** Drop on whatever is under the finger or cursor; fall back to overlap. */
export const pointerFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/** Mouse drags after a small move; touch drags after a short press so quick swipes still scroll. */
export function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );
}

/** Browsers fire a click when a drag ends on the element it started on; this swallows that click. */
export function useClickGuard() {
  const dragging = useRef(false);
  const start = useCallback(() => {
    dragging.current = true;
  }, []);
  const end = useCallback(() => {
    setTimeout(() => {
      dragging.current = false;
    }, 0);
  }, []);
  const blocked = useCallback(() => dragging.current, []);
  return { start, end, blocked };
}

export const PAIR_COLORS = [
  '#E8C46F',
  '#9CC3E6',
  '#E6A6B0',
  '#A8D5B5',
  '#F2B880',
  '#C9B6E4',
  '#F4D35E',
  '#8FD3C9',
  '#F7A8A8',
  '#B5C99A',
  '#D7B98E',
  '#A9C5F5',
];
