/* oxlint-disable next/no-img-element -- Original JPEGs preserve the approved cover photographs. */
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
            srcSet="/wedding2/images/5A8A6634.jpg"
          />
          <img
            src="/wedding2/images/5A8A6627.jpg"
            alt=""
            draggable={false}
            fetchPriority="high"
          />
        </picture>
        <div className="cover-vignette" />
        <div className="cover-lettering">
          <p className="cover-invitation">诚邀你，共赴我们的婚礼</p>
          <span className="cover-prefix">
            朱敏 <i>&</i> 汪家喆
          </span>
          <div className="cover-title" data-redline-anchor="cover-title">
            <span>一线</span>
            <i>·</i>
            <span>同心</span>
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
          data-redline-anchor="cover-seal"
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
      </div>
    </div>
  );
}
