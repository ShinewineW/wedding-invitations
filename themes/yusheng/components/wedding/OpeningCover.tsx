'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import CoverFront from './CoverFront';
import ArrowIcon from './ArrowIcon';
import { useHydrated } from '@/hooks/use-hydrated';

export type OpeningHandle = {
  open: () => void;
  skip: () => void;
  reset: () => void;
};

const OpeningCover = forwardRef<
  OpeningHandle,
  {
    reduced: boolean;
    onFinish: () => void;
  }
>(function OpeningCover({ reduced, onFinish }, ref) {
  const ready = useHydrated();
  const element = useRef<HTMLElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const focusAfterOpening = useRef(false);
  const [phase, setPhase] = useState('closed');
  const cancelFrame = useRef<(() => void) | null>(null);

  function skip() {
    cancelFrame.current?.();
    setPhase('open');
  }

  function reset() {
    focusAfterOpening.current = false;
    cancelFrame.current?.();
    element.current?.style.setProperty('--cover-turn', '0');
    element.current?.style.setProperty('--cover-edge', '1');
    element.current?.style.setProperty('--cover-shadow', '0');
    if (element.current) element.current.dataset.side = 'front';
    setPhase('closed');
  }

  function open() {
    if (phase !== 'closed') return;
    focusAfterOpening.current = true;
    if (reduced) {
      skip();
      return;
    }
    setPhase('opening');
  }

  useImperativeHandle(ref, () => ({ open, skip, reset }));

  useEffect(() => {
    if (phase !== 'opening') return;
    const node = element.current!;
    const duration = window.innerWidth <= 700 ? 1900 : 2400;
    let frame = 0;
    let start = 0;
    const ease = (n: number) => {
      const p = Math.min(1, Math.max(0, n));
      return p * p * (3 - 2 * p);
    };
    const paint = (time: number) => {
      start ||= time;
      const p = reduced ? 1 : Math.min(1, (time - start) / duration);
      const turn = ease((p - 0.06) / 0.9);
      const angle = turn * Math.PI;
      node.style.setProperty('--cover-turn', String(turn));
      node.style.setProperty(
        '--cover-edge',
        String(Math.max(0, Math.cos(angle))),
      );
      node.style.setProperty('--cover-shadow', String(Math.sin(angle) * 0.75));
      // WebKit can paint the mirrored reverse despite backface-visibility.
      node.dataset.side = turn < 0.5 ? 'front' : 'back';
      if (p < 1) frame = requestAnimationFrame(paint);
      else {
        setPhase('open');
      }
    };
    const stop = () => cancelAnimationFrame(frame);
    cancelFrame.current = stop;
    const interrupt = () => {
      stop();
      setPhase('open');
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        [
          'Escape',
          'PageDown',
          'PageUp',
          'ArrowDown',
          'ArrowUp',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      )
        interrupt();
    };
    frame = requestAnimationFrame(paint);
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      stop();
      cancelFrame.current = null;
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase, reduced]);

  useEffect(() => {
    if (phase === 'open' && focusAfterOpening.current) {
      focusAfterOpening.current = false;
      continueButton.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  return (
    <section
      className="opening-cover"
      ref={element}
      data-phase={phase}
      data-side={phase === 'open' ? 'back' : 'front'}
      aria-busy={phase === 'opening'}
      aria-label="一纸，余生。婚礼邀请封面"
    >
      <h1 className="sr-only">一纸，余生。汪家喆与朱敏的婚礼邀请</h1>
      <div
        className="cover-page"
        inert={phase !== 'open'}
        aria-hidden={phase !== 'open'}
      >
        <div className="cover-inside">
          <span>一封信的开始</span>
          <p>
            从此，
            <br />
            <em>每一页都有你。</em>
          </p>
          <span>朱敏 & 汪家喆</span>
        </div>
        {phase === 'open' && (
          <button
            ref={continueButton}
            className="cover-revisit"
            onClick={onFinish}
          >
            继续读我们的故事 <ArrowIcon direction="down" />
          </button>
        )}
        <div className="cover-page-shadow" aria-hidden="true" />
      </div>
      <div className="cover-sheet" inert={phase !== 'closed'}>
        <div className="cover-front" aria-hidden={phase !== 'closed'}>
          <CoverFront onOpen={open} ready={ready} />
        </div>
        <div className="cover-back" aria-hidden="true" />
      </div>
      <button
        className="skip-opening"
        disabled={!ready}
        onClick={() => {
          skip();
          onFinish();
        }}
      >
        直接看照片 <ArrowIcon direction="down" />
      </button>
    </section>
  );
});

export default OpeningCover;
