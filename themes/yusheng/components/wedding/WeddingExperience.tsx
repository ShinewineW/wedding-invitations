'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { photographs, letterNotes } from '@/lib/wedding';
import OpeningCover, { type OpeningHandle } from './OpeningCover';
import { PhotoWaterfall, HeartfeltLetters } from './Correspondence';
import Invitation from './Invitation';
import Photo from './Photo';
import ArrowIcon from './ArrowIcon';

const stopIds = [
  'photo-0',
  'photo-1',
  'photo-2',
  'photo-3',
  'heartfelt',
  'invitation',
];
const nextLabels = [
  '第一张照片',
  '第二张照片',
  '第三张照片',
  '第四张照片',
  '读我们的心意',
  '查看时间地点',
  '继续向下阅读',
];
const subscribeMotion = (update: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
};
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const serverMotion = () => false;

export default function WeddingExperience() {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    reducedMotion,
    serverMotion,
  );
  const cover = useRef<OpeningHandle>(null);
  const [current, setCurrent] = useState(-1);
  const [atEnd, setAtEnd] = useState(false);
  const atEndRef = useRef(false);
  const [readPhoto, setReadPhoto] = useState<number | null>(null);
  const [back, setBack] = useState(false);
  const [turn, setTurn] = useState(0);
  const movingUntil = useRef(0);
  const currentRef = useRef(-1);
  const leftCover = useRef(false);
  const dialogScroll = useRef<HTMLDivElement>(null);
  const noteTrigger = useRef<HTMLButtonElement>(null);

  const jump = useCallback(
    (index: number) => {
      const target = document.getElementById(stopIds[index] || 'beginning');
      if (!target) return;
      movingUntil.current = performance.now() + (reduced ? 0 : 850);
      currentRef.current = index;
      setCurrent(index);
      const y =
        target.getBoundingClientRect().top +
        window.scrollY -
        (index < 4 ? 32 : 20);
      window.scrollTo({
        top: Math.max(0, y),
        behavior: reduced ? 'instant' : 'smooth',
      });
      target.focus({ preventScroll: true });
    },
    [reduced],
  );
  const firstPhoto = useCallback(() => jump(0), [jump]);
  const returnToBeginning = useCallback(() => {
    cover.current?.reset();
    leftCover.current = false;
    jump(-1);
  }, [jump]);

  useEffect(() => {
    let frame = 0;
    let settle = 0;
    const update = () => {
      frame = 0;
      const end =
        window.scrollY + innerHeight >=
        document.documentElement.scrollHeight - 4;
      atEndRef.current = end;
      setAtEnd(end);
      if (performance.now() < movingUntil.current) {
        window.clearTimeout(settle);
        settle = window.setTimeout(
          update,
          movingUntil.current - performance.now() + 16,
        );
        return;
      }
      if (window.scrollY > innerHeight * 0.5) leftCover.current = true;
      if (window.scrollY <= 8 && leftCover.current) {
        cover.current?.reset();
        leftCover.current = false;
      }
      let index = -1;
      // Seeing the next chapter's edge should not skip it when leaving a letter.
      const readingLine = Math.min(innerHeight * 0.2, 120);
      stopIds.forEach((id, i) => {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top < readingLine)
          index = i;
      });
      currentRef.current = index;
      setCurrent(index);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const manual = () => {
      movingUntil.current = 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('wheel', manual, { passive: true });
    window.addEventListener('touchstart', manual, { passive: true });
    const resize = new ResizeObserver(onScroll);
    resize.observe(document.body);
    window.visualViewport?.addEventListener('resize', onScroll);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('wheel', manual);
      window.removeEventListener('touchstart', manual);
      resize.disconnect();
      window.visualViewport?.removeEventListener('resize', onScroll);
    };
  }, []);

  const openNote = useCallback(
    (index: number, trigger: HTMLButtonElement, isBack = false) => {
      // Opening a letter ends the current page turn before the dialog locks scrolling.
      window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      noteTrigger.current = trigger;
      setReadPhoto(index);
      setBack(isBack);
      setTurn(0);
    },
    [],
  );
  const note =
    readPhoto === null
      ? null
      : back
        ? letterNotes[readPhoto]
        : photographs[readPhoto];
  const variant =
    readPhoto === null
      ? 'letter'
      : back
        ? 'letter'
        : photographs[readPhoto].paper;
  const changeNote = (direction: number) => {
    if (readPhoto === null) return;
    const next = back ? (readPhoto === 0 ? 3 : 0) : readPhoto + direction;
    if (next < 0 || next >= photographs.length) {
      setReadPhoto(null);
      return;
    }
    setReadPhoto(next);
    setTurn((n) => n + 1);
    dialogScroll.current?.scrollTo({ top: 0 });
  };
  const labelFocusGuards = useCallback((popup: HTMLDivElement | null) => {
    if (!popup) return;
    queueMicrotask(() =>
      popup.parentElement
        ?.querySelectorAll('[data-base-ui-focus-guard]')
        .forEach((guard, i) => {
          guard.setAttribute(
            'aria-label',
            i === 0 ? '返回短笺最后一个操作' : '返回短笺第一个操作',
          );
        }),
    );
  }, []);

  return (
    <>
      <a
        className="skip-link"
        href="#invitation"
        onClick={() => cover.current?.skip()}
      >
        跳到婚礼时间与地点
      </a>
      <header className="site-header">
        <a
          className="wordmark"
          href="#beginning"
          onClick={(event) => {
            event.preventDefault();
            returnToBeginning();
          }}
        >
          一纸<span>·</span>余生
          <span className="wordmark-en">A LETTER FOR LIFE</span>
        </a>
        <div className="header-date">2026 年 10 月 3 日</div>
        <a
          className="header-invite"
          href="#invitation"
          onClick={() => cover.current?.skip()}
        >
          赴我们的约{' '}
          <span aria-hidden="true">
            <ArrowIcon />
          </span>
        </a>
      </header>
      <main id="beginning" tabIndex={-1}>
        <OpeningCover ref={cover} reduced={reduced} onFinish={firstPhoto} />
        <nav className="chapter-navigation" aria-label="请柬章节">
          <a
            href="#beginning"
            onClick={(event) => {
              event.preventDefault();
              returnToBeginning();
            }}
          >
            01 <span>一纸</span>
          </a>
          <a
            href="#companionship"
            aria-current={current >= 0 && current < 4 ? 'location' : undefined}
          >
            02 <span>相伴</span>
          </a>
          <a
            href="#heartfelt"
            aria-current={current === 4 ? 'location' : undefined}
          >
            03 <span>心意</span>
          </a>
          <a
            href="#invitation"
            aria-current={current === 5 ? 'location' : undefined}
          >
            04 <span>赴约</span>
          </a>
        </nav>
        <PhotoWaterfall onRead={openNote} />
        <HeartfeltLetters
          reduced={reduced}
          onRead={(index, trigger) => openNote(index, trigger, true)}
        />
        <Invitation onReturn={returnToBeginning} canReturn={atEnd} />
      </main>
      <button
        className="next-page"
        hidden={readPhoto !== null || current < 0}
        data-on-cover={current < 0}
        data-at-end={atEnd}
        onClick={() => {
          if (currentRef.current < 0) cover.current?.open();
          else if (currentRef.current === 5) {
            if (atEndRef.current) returnToBeginning();
            else
              window.scrollBy({
                top: innerHeight * 0.72,
                behavior: reduced ? 'instant' : 'smooth',
              });
          } else jump(currentRef.current + 1);
        }}
        aria-label={
          atEnd ? '回到请柬开头' : `下一步：${nextLabels[current + 1]}`
        }
      >
        <ArrowIcon direction={atEnd ? 'up' : 'down'} />
      </button>
      <Dialog
        open={readPhoto !== null}
        onOpenChange={(open) => {
          if (!open) setReadPhoto(null);
        }}
      >
        <DialogContent
          finalFocus={noteTrigger}
          ref={labelFocusGuards}
          className="correspondence-dialog"
          showCloseButton={false}
        >
          {readPhoto !== null && note && (
            <>
              <header className="note-toolbar">
                <span>
                  {back
                    ? '03 / 心意'
                    : `02 / 相伴 · ${photographs[readPhoto].index}`}
                </span>
                <DialogClose
                  className="note-close"
                  aria-label="收起照片背面的信"
                >
                  ×
                </DialogClose>
              </header>
              <div className="note-scroll" ref={dialogScroll}>
                <div className="note-photograph">
                  <Photo index={readPhoto} eager />
                  <span>{photographs[readPhoto].label}</span>
                </div>
                <div
                  className={`stationery stationery-${variant}`}
                  key={`${readPhoto}-${turn}`}
                  data-paper={variant}
                >
                  <div className="stationery-top">
                    <span>
                      {back ? '致 · 亲爱的你' : photographs[readPhoto].carrier}
                    </span>
                    <span>汪家喆 & 朱敏</span>
                  </div>
                  {variant === 'postcard' && (
                    <div className="postmark" aria-hidden="true">
                      <span>一纸余生</span>
                      <strong>10.03</strong>
                      <span>2026 · 寄给未来</span>
                    </div>
                  )}
                  {variant === 'memo' && (
                    <span className="memo-date">日常里，最珍贵的一页。</span>
                  )}
                  <DialogTitle className="stationery-title">
                    {note.label}
                  </DialogTitle>
                  {variant === 'letter' && (
                    <span className="letter-salutation">亲爱的你：</span>
                  )}
                  <DialogDescription className="stationery-message">
                    {note.caption.split('\n').map((line, i) => (
                      <Fragment key={i}>
                        {i > 0 && '\n'}
                        <span className="stationery-line">
                          {line.match(/[^，]+，?/g)?.map((phrase, j) => (
                            <span className="stationery-phrase" key={j}>
                              {phrase}
                            </span>
                          ))}
                        </span>
                      </Fragment>
                    ))}
                  </DialogDescription>
                  <div className="stationery-signature">
                    <span>
                      {variant === 'postcard'
                        ? '寄往 · 往后的每一天'
                        : variant === 'book'
                          ? '故事未完，余生待续。'
                          : '见字如面。'}
                    </span>
                    <strong>汪家喆 & 朱敏</strong>
                  </div>
                  <span className="stationery-folio" aria-hidden="true">
                    {photographs[readPhoto].index}
                  </span>
                </div>
              </div>
              <footer className="note-navigation">
                <button
                  disabled={!back && readPhoto === 0}
                  onClick={() => changeNote(-1)}
                  aria-label="上一封信"
                >
                  <ArrowIcon direction="left" /> <span>上一封</span>
                </button>
                <span aria-live="polite">
                  {back ? '写给亲爱的你' : `${readPhoto + 1} / 4`}
                </span>
                <button
                  onClick={() => changeNote(1)}
                  aria-label={
                    !back && readPhoto === 3 ? '收好这封信' : '下一封信'
                  }
                >
                  <span>
                    {!back && readPhoto === 3 ? '收好这封信' : '下一封'}
                  </span>{' '}
                  <ArrowIcon direction="right" />
                </button>
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
