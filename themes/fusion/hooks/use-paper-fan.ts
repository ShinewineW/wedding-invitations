'use client';
import { useCallback, useEffect, type RefObject } from 'react';

/** Observe the stationary paper row, so moving its leaves cannot retrigger it. */
export function usePaperFan(
  ref: RefObject<HTMLDivElement | null>,
  reduced: boolean,
) {
  const settle = useCallback(() => {
    if (ref.current) ref.current.dataset.fan = 'open';
  }, [ref]);

  useEffect(() => {
    const row = ref.current!;
    row.dataset.fan = 'open';
    if (reduced) return;
    row.dataset.fan = 'folded';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (row.contains(document.activeElement)) return settle();
        if (!entry.isIntersecting) row.dataset.fan = 'folded';
        else if (
          entry.intersectionRatio >= 0.18 &&
          row.dataset.fan === 'folded'
        )
          row.dataset.fan = 'opening';
      },
      { threshold: [0, 0.18] },
    );
    const onEnd = (event: AnimationEvent) => {
      if (
        event.animationName === 'unfold-letter' &&
        event.target === row.lastElementChild
      )
        settle();
    };
    observer.observe(row);
    row.addEventListener('animationend', onEnd);
    return () => {
      observer.disconnect();
      row.removeEventListener('animationend', onEnd);
      row.dataset.fan = 'open';
    };
  }, [ref, reduced, settle]);

  return settle;
}
