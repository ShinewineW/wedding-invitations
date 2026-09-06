/* oxlint-disable next/no-img-element -- Pre-optimized, responsive local photograph. */
'use client';
import { wedding } from '@/lib/wedding';
import ArrowIcon from './ArrowIcon';

/** The photograph stays intact on the front of one sheet. */
export default function CoverFront({
  onOpen,
  ready,
}: {
  onOpen: () => void;
  ready: boolean;
}) {
  return (
    <div className="cover-front-content">
      <div className="cover-print" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 700px) and (orientation: portrait)"
            srcSet="/wedding/images/together-640.webp 640w, /wedding/images/together-1280.webp 1280w"
            sizes="100vw"
          />
          <img
            src="/wedding/images/a-long-way-2048.webp"
            srcSet="/wedding/images/a-long-way-1280.webp 1280w, /wedding/images/a-long-way-2048.webp 2048w"
            sizes="100vw"
            alt=""
            draggable={false}
            fetchPriority="high"
          />
        </picture>
        <div className="cover-vignette" />
        <div className="cover-lettering">
          <span className="cover-prefix">
            朱敏 <i>&</i> 汪家喆
          </span>
          <div className="cover-title">
            <span>一纸</span>
            <i>·</i>
            <span>余生</span>
          </div>
          <div className="cover-bottom">
            <div>
              <p>把往后的日子，写成我们。</p>
              <span>朱敏与汪家喆 · 诚挚敬邀</span>
            </div>
            <div className="cover-date">
              <strong>10.03</strong>
              <span>2026 · {wedding.lunar}</span>
              <span className="cover-location">
                {wedding.venue}
                <br />
                {wedding.room}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="unseal-control">
        <button
          className="unseal-button"
          disabled={!ready}
          aria-busy={!ready}
          onClick={onOpen}
          aria-label="展信，展开我们的婚礼邀请"
        >
          <span>展信</span>
          <i aria-hidden="true">
            <ArrowIcon />
          </i>
        </button>
        <span className="unseal-hint">
          {ready ? '轻触展信 · 开启我们的故事' : '正在展平信笺…'}
        </span>
      </div>
    </div>
  );
}
