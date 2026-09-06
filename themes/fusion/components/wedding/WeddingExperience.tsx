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
import OpeningCover, {
  type OpeningHandle,
  type OpeningPhase,
} from './OpeningCover';
import { PhotoWaterfall, HeartfeltLetters } from './Correspondence';
import Invitation from './Invitation';
import Photo from './Photo';
import ArrowIcon from './ArrowIcon';
import { Stage } from '@/components/red-thread/line/stage';
import { TheTie } from '@/components/red-thread/chapters/TheTie';
import { TheRing } from '@/components/red-thread/chapters/TheRing';
import {
  readingStops,
  useReadingNavigation,
} from '@/hooks/use-reading-navigation';

const chapters = [
  { id: 'companionship', number: '02', label: '牵线', start: 0 },
  { id: 'tie', number: '03', label: '相系', start: 6 },
  { id: 'heartfelt', number: '04', label: '心意', start: 8 },
  { id: 'ring', number: '05', label: '圆满', start: 9 },
  { id: 'invitation', number: '06', label: '敬邀', start: 10 },
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
  const [coverPhase, setCoverPhase] = useState<OpeningPhase>('closed');
  const { current, atEnd, jump, advance, cancel } =
    useReadingNavigation(reduced);
  const [readPhoto, setReadPhoto] = useState<number | null>(null);
  const [back, setBack] = useState(false);
  const leftCover = useRef(false);
  const noteTrigger = useRef<HTMLButtonElement>(null);

  const continueStory = useCallback(() => jump(0), [jump]);
  const firstPhoto = useCallback(() => jump(1), [jump]);
  const returnToBeginning = useCallback(() => {
    cover.current?.reset();
    leftCover.current = false;
    jump(-1);
  }, [jump]);

  useEffect(() => {
    const update = () => {
      if (window.scrollY > innerHeight * 0.5) leftCover.current = true;
      if (window.scrollY <= 8 && leftCover.current) {
        cover.current?.reset();
        leftCover.current = false;
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const openNote = useCallback(
    (index: number, trigger: HTMLButtonElement, isBack = false) => {
      // Opening a letter ends the current page turn before the dialog locks scrolling.
      cancel();
      noteTrigger.current = trigger;
      setReadPhoto(index);
      setBack(isBack);
    },
    [cancel],
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
  const displayedPhoto =
    back && readPhoto === 3 ? photographs.length - 1 : readPhoto;
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
    <Stage reduced={reduced} coverPhase={coverPhase}>
      <a
        className="skip-link"
        href="#invitation"
        onClick={(event) => {
          event.preventDefault();
          cover.current?.skip();
          jump(10);
        }}
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
          一线<span>·</span>同心
        </a>
        <div className="header-date">2026 年 10 月 3 日</div>
        <a
          className="header-invite"
          href="#invitation"
          onClick={(event) => {
            event.preventDefault();
            cover.current?.skip();
            jump(10);
          }}
        >
          赴我们的约{' '}
          <span aria-hidden="true">
            <ArrowIcon />
          </span>
        </a>
      </header>
      <main id="beginning" tabIndex={-1}>
        <OpeningCover
          ref={cover}
          reduced={reduced}
          onFinish={continueStory}
          onSkip={firstPhoto}
          onPhaseChange={setCoverPhase}
        />
        <nav className="chapter-navigation" aria-label="请柬章节">
          <a
            href="#beginning"
            onClick={(event) => {
              event.preventDefault();
              returnToBeginning();
            }}
          >
            01 <span>展信</span>
          </a>
          {chapters.map((chapter, i) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              onClick={(event) => {
                event.preventDefault();
                jump(chapter.start);
              }}
              aria-current={
                current >= chapter.start &&
                current < (chapters[i + 1]?.start ?? readingStops.length)
                  ? 'location'
                  : undefined
              }
            >
              {chapter.number} <span>{chapter.label}</span>
            </a>
          ))}
        </nav>
        <PhotoWaterfall onRead={openNote} />
        <div className="red-thread-chapters">
          <TheTie />
        </div>
        <HeartfeltLetters
          reduced={reduced}
          onRead={(index, trigger) => openNote(index, trigger, true)}
        />
        <div className="red-thread-chapters">
          <TheRing />
        </div>
        <Invitation onReturn={returnToBeginning} canReturn={atEnd} />
      </main>
      <button
        className="next-page"
        hidden={readPhoto !== null || (current < 0 && coverPhase !== 'open')}
        data-on-cover={current < 0}
        data-at-end={atEnd}
        onClick={() => {
          if (atEnd) returnToBeginning();
          else advance();
        }}
        aria-label={
          atEnd
            ? '回到请柬开头'
            : `下一步：${readingStops[current + 1]?.label ?? '读到请柬末尾'}`
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
                    ? '04 / 心意'
                    : `02 / 牵线 · ${photographs[readPhoto].index}`}
                </span>
                <DialogClose
                  className="note-close"
                  aria-label="收起照片背面的信"
                >
                  ×
                </DialogClose>
              </header>
              <div className="note-scroll">
                <div className="note-photograph">
                  <Photo index={displayedPhoto ?? 0} eager />
                  <span>{photographs[displayedPhoto ?? 0].label}</span>
                </div>
                <div
                  className={`stationery stationery-${variant}`}
                  key={`${readPhoto}-${back}`}
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
                      <span>一线同心</span>
                      <strong>10.03</strong>
                      <span>2026 · 寄给未来</span>
                    </div>
                  )}
                  {variant === 'rose' && (
                    <span className="rose-fold" aria-hidden="true" />
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
                <DialogClose
                  className="note-return"
                  aria-label={back ? '返回心意' : '返回照片'}
                >
                  <ArrowIcon direction="left" />
                  <span>{back ? '返回心意' : '返回照片'}</span>
                </DialogClose>
                <span>
                  {back
                    ? '写给亲爱的你'
                    : `照片 ${photographs[readPhoto].index}`}
                </span>
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Stage>
  );
}
