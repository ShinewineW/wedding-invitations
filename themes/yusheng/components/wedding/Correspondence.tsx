'use client';

import { photographs, letterNotes, wedding } from '@/lib/wedding';
import Photo from './Photo';
import ArrowIcon from './ArrowIcon';
import { usePaperFan } from '@/hooks/use-paper-fan';
import { useRef } from 'react';

export function PhotoWaterfall({
  onRead,
}: {
  onRead: (index: number, trigger: HTMLButtonElement) => void;
}) {
  return (
    <section
      className="companionship"
      id="companionship"
      aria-labelledby="companionship-title"
    >
      <div className="chapter-heading">
        <span className="eyebrow">02 / 相伴</span>
        <h2 id="companionship-title">
          在你身旁，
          <br />
          <em>日子有了回响。</em>
        </h2>
        <p>
          有些话，写在照片背面。
          <br />
          一张一张，慢慢读给你听。
        </p>
      </div>
      <div className="photo-waterfall">
        {photographs.map((photo, i) => (
          <article
            className={`story story-${photo.paper}`}
            id={`photo-${i}`}
            data-journey-stop={`photo-${i}`}
            key={photo.src}
            aria-labelledby={`photo-title-${i}`}
            tabIndex={-1}
          >
            <div className="story-margin" aria-hidden="true">
              <span>{photo.index}</span>
              <i />
            </div>
            <button
              className="story-photograph"
              onClick={(event) => onRead(i, event.currentTarget)}
              aria-label={`翻看照片 ${photo.index}：${photo.label}`}
            >
              <Photo index={i} />
              <span className="photo-paper-tab">
                <span>{photo.carrier}</span>
                <i aria-hidden="true">
                  <ArrowIcon />
                </i>
              </span>
            </button>
            <div className="story-caption">
              <span className="story-number">
                {photo.index} / {photo.carrier}
              </span>
              <h3 id={`photo-title-${i}`}>{photo.label}</h3>
              <p>{photo.caption.split('\n')[0]}</p>
              <button
                className="read-reverse"
                onClick={(event) => onRead(i, event.currentTarget)}
                aria-label={`读第 ${i + 1} 张照片背面的信`}
              >
                读背面的信{' '}
                <span aria-hidden="true">
                  <ArrowIcon />
                </span>
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="waterfall-ending">这一页写我们，下一页，想请你也在场。</p>
    </section>
  );
}

export function HeartfeltLetters({
  onRead,
  reduced,
}: {
  onRead: (index: number, trigger: HTMLButtonElement) => void;
  reduced: boolean;
}) {
  const fanRef = useRef<HTMLDivElement>(null);
  const settleFan = usePaperFan(fanRef, reduced);
  return (
    <section
      className="heartfelt"
      id="heartfelt"
      data-journey-stop="heartfelt"
      aria-labelledby="heartfelt-title"
      tabIndex={-1}
    >
      <div className="chapter-heading">
        <span className="eyebrow">03 / 心意</span>
        <h2 id="heartfelt-title">
          一纸短，<em>情意长。</em>
        </h2>
      </div>
      <div className="heartfelt-spread">
        <div className="heart-invite">
          <span>良辰已定 · 诚邀亲友</span>
          <strong aria-label="双喜">囍</strong>
          <p>
            汪家喆 <i>&</i> 朱敏
          </p>
          <div>
            2026.10.03
            <br />
            {wedding.lunar}
          </div>
          <a href="#invitation">
            赴我们的约 <ArrowIcon direction="down-right" />
          </a>
        </div>
        <div
          className="heart-letters"
          ref={fanRef}
          onFocusCapture={(event) => {
            if (event.target.matches(':focus-visible')) settleFan();
          }}
        >
          <button
            className="heart-letter heart-letter-left"
            onClick={(event) => {
              settleFan();
              onRead(0, event.currentTarget);
            }}
            aria-label="放大阅读：一纸短，情意长"
          >
            <span className="eyebrow">{letterNotes[0].label}</span>
            <p>
              {letterNotes[0].caption.split('\n\n').map((verse) => (
                <span className="heart-verse" key={verse}>
                  {verse}
                </span>
              ))}
            </p>
            <span className="heart-signature">汪家喆 & 朱敏</span>
            <i aria-hidden="true">
              <ArrowIcon />
            </i>
          </button>
          <button
            className="heart-letter heart-letter-right"
            onClick={(event) => {
              settleFan();
              onRead(3, event.currentTarget);
            }}
            aria-label="放大阅读：致亲爱的你"
          >
            <span className="eyebrow">{letterNotes[3].label}</span>
            <p>
              {letterNotes[3].caption.split('\n\n').map((verse) => (
                <span className="heart-verse" key={verse}>
                  {verse}
                </span>
              ))}
            </p>
            <span className="heart-signature">以爱为笺，敬候相见。</span>
            <i aria-hidden="true">
              <ArrowIcon />
            </i>
          </button>
        </div>
      </div>
    </section>
  );
}
