'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Each stop is a composed view. The knot has two intentional readings: twilight
// with an untied cord, then the complete night-time invitation.
export const readingStops = [
  { id: 'companionship', label: '牵线的故事' },
  { id: 'photo-0', label: '第一张照片' },
  { id: 'photo-1', label: '第二张照片' },
  { id: 'photo-2', label: '第三张照片' },
  { id: 'photo-3', label: '第四张照片' },
  { id: 'photo-4', label: '第五张照片' },
  { id: 'tie-dusk', label: '黄昏中的相系' },
  { id: 'tie', label: '红线相系' },
  { id: 'heartfelt', label: '读我们的心意' },
  { id: 'ring', label: '共赴圆满' },
  { id: 'invitation', label: '正式邀请' },
  { id: 'invitation-details', label: '婚礼时间与地点' },
  { id: 'invitation-end', label: '读到请柬末尾' },
] as const;

function stops() {
  const bottom = Math.max(
    0,
    document.documentElement.scrollHeight - innerHeight,
  );
  return readingStops.map(({ id }) => {
    const element = document.getElementById(id === 'tie-dusk' ? 'tie' : id);
    if (!element) return { element, y: bottom };
    const rect = element.getBoundingClientRect();
    let y = rect.top + scrollY - 24;
    if (id === 'tie' || id === 'tie-dusk')
      y =
        rect.top +
        scrollY +
        Math.max(0, rect.height - innerHeight) *
          (id === 'tie-dusk' ? 0.08 : 0.82);
    else if (id === 'heartfelt' && innerWidth <= 700 && innerHeight <= 620)
      y = rect.top + scrollY - 8;
    else if (id === 'invitation-end') y = bottom;
    else if (id.startsWith('photo-'))
      y = rect.top + scrollY - Math.max(24, (innerHeight - rect.height) / 2);
    return { element, y: Math.max(0, Math.min(bottom, y)) };
  });
}

function animateScroll(
  from: number,
  to: number,
  frame: { current: number },
  finish: () => void,
) {
  const start = performance.now();
  const distance = to - from;
  const duration = Math.min(720, 380 + Math.abs(distance) * 0.12);
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    window.scrollTo({
      top: from + distance * p * p * (3 - 2 * p),
      behavior: 'instant',
    });
    if (p < 1) frame.current = requestAnimationFrame(step);
    else finish();
  };
  frame.current = requestAnimationFrame(step);
}

/** Button travel is bounded and cancellable; touch scrolling belongs to the browser. */
export function useReadingNavigation(reduced: boolean) {
  const [current, setCurrent] = useState(-1);
  const [atEnd, setAtEnd] = useState(false);
  const frame = useRef(0);
  const destination = useRef<number | null>(null);

  const cancel = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    destination.current = null;
    document.documentElement.removeAttribute('data-reading-travel');
  }, []);

  const jump = useCallback(
    (index: number) => {
      cancel();
      const target =
        index < 0
          ? { element: document.getElementById('beginning'), y: 0 }
          : stops()[index];
      if (!target?.element) return;
      const startY = window.scrollY;
      const distance = target.y - startY;
      const finish = () => {
        cancel();
        window.scrollTo({ top: target.y, behavior: 'instant' });
        // Focus only after travel finishes; a manually interrupted gesture never
        // receives a delayed focus or a second correction to the old destination.
        target.element?.focus({ preventScroll: true });
        setCurrent(index);
      };
      if (reduced || Math.abs(distance) < 2) return finish();
      destination.current = index;
      document.documentElement.dataset.readingTravel = 'true';
      animateScroll(startY, target.y, frame, finish);
    },
    [cancel, reduced],
  );

  const advance = useCallback(() => {
    const positions = stops();
    const index =
      destination.current === null
        ? positions.findIndex((stop) => stop.y > window.scrollY + 32)
        : destination.current + 1;
    jump(index < 0 || index >= positions.length ? positions.length - 1 : index);
  }, [jump]);

  useEffect(() => {
    let updateFrame = 0;
    const update = () => {
      updateFrame = 0;
      const y = window.scrollY;
      setAtEnd(y + innerHeight >= document.documentElement.scrollHeight - 4);
      let index = -1;
      stops().forEach((stop, i) => {
        if (stop.y <= y + 32) index = i;
      });
      setCurrent(index);
    };
    const queue = () => {
      if (!updateFrame) updateFrame = requestAnimationFrame(update);
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        [
          'ArrowDown',
          'ArrowUp',
          'PageDown',
          'PageUp',
          'Home',
          'End',
          ' ',
          'Escape',
        ].includes(event.key)
      )
        cancel();
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.visualViewport?.addEventListener('resize', queue);
    const observer = new ResizeObserver(queue);
    observer.observe(document.body);
    update();
    return () => {
      cancel();
      cancelAnimationFrame(updateFrame);
      observer.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('keydown', onKey);
      window.visualViewport?.removeEventListener('resize', queue);
    };
  }, [cancel]);

  return { current, atEnd, jump, advance, cancel };
}
