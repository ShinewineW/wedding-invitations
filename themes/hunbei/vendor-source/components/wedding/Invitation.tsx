'use client';
import { wedding } from '@/lib/wedding';
import MapDirections from './MapDirections';
import SaveInvitationImage from './SaveInvitationImage';
import ArrowIcon from './ArrowIcon';
export default function Invitation({
  onReturn,
  canReturn,
}: {
  onReturn: () => void;
  canReturn: boolean;
}) {
  return (
    <section
      className="invitation"
      id="invitation"
      aria-labelledby="invitation-title"
      tabIndex={-1}
      data-journey-stop="invitation"
      data-chapter="end"
    >
      <div className="invitation-top">
        <span>我们的婚礼</span>
        <span>06 / 敬邀</span>
      </div>
      <div className="invitation-main">
        <div className="invitation-heading">
          <span className="eyebrow">良辰已定 · 静候卿来</span>
          <h2 id="invitation-title">
            有你在，
            <br />
            才是<span>圆满。</span>
          </h2>
          <p>
            我们要结婚了。
            <br />
            想把这一天，留给生命中重要的你。
            <br />
            带着轻松的心情来吧，一起吃饭、说笑，
            <br className="desktop-break" />
            见证我们人生的新一页。
          </p>
          <div className="couple-signature">
            汪家喆 <i>&</i> 朱敏<span>敬邀</span>
          </div>
        </div>
        <div
          className="invitation-details"
          id="invitation-details"
          tabIndex={-1}
        >
          <div className="date-display">
            <span>2026</span>
            <strong aria-label="10月3日">
              <span>10</span>
              <i aria-hidden="true">.</i>
              <em>03</em>
            </strong>
            <span>
              {wedding.day} · {wedding.lunar}
            </span>
          </div>
          <div className="schedule">
            <div>
              <span>
                {wedding.welcome.slice(0, 3)}
                <em>{wedding.welcome.slice(3)}</em>
              </span>
              <p>到场相聚</p>
            </div>
            <i aria-hidden="true" />
            <div>
              <span>
                {wedding.ceremony.slice(0, 3)}
                <em>{wedding.ceremony.slice(3)}</em>
              </span>
              <p>仪式开始</p>
            </div>
          </div>
          <div className="venue">
            <p>{wedding.venue}</p>
            <span>{wedding.room}</span>
          </div>
          <div className="invite-actions">
            <SaveInvitationImage />
            <MapDirections />
          </div>
          <p className="invitation-feedback">期待与你相见</p>
        </div>
      </div>
      <footer className="site-footer" id="invitation-end" tabIndex={-1}>
        <a
          href="#beginning"
          aria-label="回到请柬开头"
          style={{ visibility: canReturn ? 'visible' : 'hidden' }}
          onClick={(event) => {
            event.preventDefault();
            onReturn();
          }}
        >
          一线 · 同心{' '}
          <span aria-hidden="true">
            <ArrowIcon direction="up" />
          </span>
        </a>
        <span>汪家喆 & 朱敏</span>
        <span>2026.10.03 · 不见不散</span>
      </footer>
    </section>
  );
}
