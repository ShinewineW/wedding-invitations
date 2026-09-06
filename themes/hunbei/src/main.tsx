import { Fragment, useEffect, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { photographs, letterNotes, wedding } from '../vendor-source/lib/wedding';
import { tie, ring } from '../vendor-source/components/red-thread/content';
import { daylight } from '../vendor-source/components/red-thread/line/daylight';
import { paintStaticThreads } from './threads';
import './source-mobile.css';
import './export.css';

const ids = ['cover', 'inside', 'thread-intro', ...photographs.map((_, i) => `photo-${i + 1}`), 'tie-twilight', 'tie-night', 'heartfelt', 'ring', 'invitation'];
const requested = new URLSearchParams(location.search).get('panel');
const only = requested && ids.includes(requested) ? requested : null;

function Panel({ id, className = '', style, children }: { id: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  if (only && id !== only) return null;
  return <section id={id} className={`export-panel ${className}`} style={style} data-export-panel={id}>{children}</section>;
}

function Cover() {
  return <Panel id="cover" className="opening-cover export-cover">
    <header className="site-header"><span className="wordmark">一线<span>·</span>同心</span></header>
    <div className="cover-front-content"><div className="cover-print">
      <img src="/wedding2/images/5A8A6634.jpg" alt="汪家喆与朱敏在花园中相拥" loading="eager" decoding="sync" />
      <div className="cover-vignette" />
      <div className="cover-lettering">
        <span className="cover-prefix">朱敏 <i>&</i> 汪家喆</span>
        <h1 className="cover-title"><span>一线</span><i>·</i><span>同心</span></h1>
        <div className="cover-bottom"><div><p>把往后的日子，写成我们。</p><span>朱敏与汪家喆 · 诚挚敬邀</span></div>
          <div className="cover-date"><strong>10.03</strong><span>2026 · {wedding.lunar}</span><span className="cover-location">{wedding.venue}<br />{wedding.room}</span></div>
        </div>
      </div>
    </div></div>
  </Panel>;
}

function Inside() {
  return <Panel id="inside" className="export-inside">
    <div className="cover-inside"><span>一封信的开始</span><p>从此，<br /><em>每一页都有你。</em></p><span className="cover-inside-names" data-redline-anchor="inside-names">朱敏 & 汪家喆</span></div>
    <canvas className="static-thread" data-static-thread="overture" aria-hidden="true" />
  </Panel>;
}

function Introduction() {
  return <Panel id="thread-intro" className="companionship export-intro"><div className="chapter-heading">
    <span className="eyebrow">02 / 牵线</span>
    <h2>关于相逢，<br /><em>人们说起一根红线。</em></h2>
    <p>在月老牵红线的传说里，缘分有了细细的形状。它穿过人海，连起两端，也让“你”和“我”，有了写成“我们”的可能。借这根红线，我们把对往后日子的期许，轻轻系进这封请柬。</p>
  </div></Panel>;
}

function Stationery({ index }: { index: number }) {
  const note = photographs[index];
  const variant = note.paper;
  return <div className={`stationery stationery-${variant}`} data-paper={variant}>
    <div className="stationery-top"><span>{note.carrier}</span><span>汪家喆 & 朱敏</span></div>
    {variant === 'postcard' && <div className="postmark" aria-hidden="true"><span>一线同心</span><strong>10.03</strong><span>2026 · 寄给未来</span></div>}
    {variant === 'rose' && <span className="rose-fold" aria-hidden="true" />}
    {variant === 'memo' && <span className="memo-date">日常里，最珍贵的一页。</span>}
    <h2 className="stationery-title">{note.label}</h2>
    {variant === 'letter' && <span className="letter-salutation">亲爱的你：</span>}
    <p className="stationery-message">{note.caption.split('\n').map((line, i) => <Fragment key={i}>
      {i > 0 && '\n'}<span className="stationery-line">{line.match(/[^，]+，?/g)?.map((phrase, j) => <span className="stationery-phrase" key={j}>{phrase}</span>)}</span>
    </Fragment>)}</p>
    <div className="stationery-signature"><span>{variant === 'postcard' ? '寄往 · 往后的每一天' : variant === 'book' ? '故事未完，余生待续。' : '见字如面。'}</span><strong>汪家喆 & 朱敏</strong></div>
    <span className="stationery-folio">{note.index}</span>
  </div>;
}

function PhotoPanel({ index }: { index: number }) {
  const photo = photographs[index];
  return <Panel id={`photo-${index + 1}`} className={`export-photo export-photo-${photo.paper}`}>
    <article className={`story story-${photo.paper}`}>
      <div className="story-margin" aria-hidden="true"><span>{photo.index}</span><i /></div>
      <div className="story-photograph"><img src={`/wedding2/images/${photo.original}`} alt={photo.alt} style={{ objectPosition: photo.position }} loading="eager" decoding="sync" /><span className="photo-paper-tab"><span>{photo.carrier}</span></span></div>
    </article>
    <Stationery index={index} />
    {index < 4 ? <div className="static-motif" data-static-motif={index} aria-hidden="true"><svg viewBox="0 0 375 100"><path /></svg></div> : <p className="waterfall-ending">这一页写我们，下一页，想请你也在场。</p>}
  </Panel>;
}

function tone(night: number) {
  const palette = daylight(night);
  return { '--thread-ground': palette.ground, '--thread-ink': palette.ink, '--thread-secondary': palette.secondary, '--thread-readable-red': palette.red, '--night': night, background: palette.ground } as CSSProperties;
}

function TiePanel({ night }: { night: boolean }) {
  return <Panel id={night ? 'tie-night' : 'tie-twilight'} className={`red-thread-chapters export-tie ${night ? 'export-tie-night' : 'export-tie-twilight'}`} style={{ ...tone(night ? 1 : .32), '--tp': night ? 1 : 0 } as CSSProperties}>
    {night && <div className="red-thread-moon" aria-hidden="true" />}
    <div className="chapter tie"><div className="hold"><div className="tie__inner">
      <p className="index">{tie.index}</p>
      <div className="tie__stack">{night ? <h2 className="tie__merged">{tie.merged}</h2> : <div className="tie__first"><p className="tie__before">{tie.before}</p><h2 className="tie__headline">{tie.headline}</h2></div>}</div>
      <div className="tie__knot" data-tie-knot aria-hidden="true" />
      {night && <p className="tie__after">{tie.after}</p>}
    </div></div></div>
    <canvas className="static-thread" data-static-thread="tie" data-progress={night ? '1' : '0'} data-night={night ? '1' : '.32'} aria-hidden="true" />
  </Panel>;
}

function Heartfelt() {
  return <Panel id="heartfelt" className="heartfelt"><div className="chapter-heading"><span className="eyebrow">04 / 心意</span><h2>一纸短，<em>情意长。</em></h2></div>
    <div className="heartfelt-spread">
      <div className="heart-invite"><span>良辰已定 · 诚邀亲友</span><strong aria-label="双喜">囍</strong><p>汪家喆 <i>&</i> 朱敏</p><div>2026.10.03<br />{wedding.lunar}</div></div>
      <div className="heart-letters">
        {[0, 3].map((index, i) => <article className={`heart-letter heart-letter-${i ? 'right' : 'left'}`} key={index} data-heart-note={index}>
          <span className="eyebrow">{letterNotes[index].label}</span>
          <p>{letterNotes[index].caption.split('\n\n').map(verse => <span className="heart-verse" key={verse}>{verse}</span>)}</p>
          <span className="heart-signature">{i ? '以爱为笺，敬候相见。' : '汪家喆 & 朱敏'}</span>
        </article>)}
      </div>
    </div>
  </Panel>;
}

function RingPanel() {
  return <Panel id="ring" className="red-thread-chapters export-ring" style={tone(0)}><div className="chapter ring" data-ring-state="closed"><div className="ring__inner">
    <div className="ring__message" data-ring-center><p className="index">{ring.index}</p><h2 className="ring__lead">{ring.lead}</h2></div>
    <p className="ring__closing">{ring.closing}</p>
  </div></div><canvas className="static-thread" data-static-thread="ring" aria-hidden="true" /></Panel>;
}

function Invitation() {
  return <Panel id="invitation" className="invitation">
    <div className="invitation-top"><span>我们的婚礼</span><span>06 / 敬邀</span></div>
    <div className="invitation-main"><div className="invitation-heading"><span className="eyebrow">良辰已定 · 静候卿来</span>
      <h2>有你在，<br />才是<span>圆满。</span></h2>
      <p>我们要结婚了。<br />想把这一天，留给生命中重要的你。<br />带着轻松的心情来吧，一起吃饭、说笑，见证我们人生的新一页。</p>
      <div className="couple-signature">汪家喆 <i>&</i> 朱敏<span>敬邀</span></div>
    </div><div className="invitation-details"><div className="date-display"><span>2026</span><strong aria-label="10月3日"><span>10</span><i>.</i><em>03</em></strong><span>{wedding.day} · {wedding.lunar}</span></div>
      <div className="schedule"><div><span>17:<em>28</em></span><p>到场相聚</p></div><i /><div><span>17:<em>58</em></span><p>仪式开始</p></div></div>
      <div className="venue"><p>{wedding.venue}</p><span>{wedding.room}</span></div><p className="invitation-feedback">期待与你相见</p>
    </div></div>
    <footer className="site-footer"><span>一线 · 同心</span><span>汪家喆 & 朱敏</span><span>2026.10.03 · 不见不散</span></footer>
  </Panel>;
}

function App() {
  useEffect(() => {
    let active = true;
    async function prepare() {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(image => image.decode()));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (!active) return;
      paintStaticThreads();
      const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-export-panel]')).map(panel => {
        const rect = panel.getBoundingClientRect();
        panel.dataset.exportWidth = String(rect.width);
        panel.dataset.exportHeight = String(rect.height);
        panel.dataset.exportTop = String(rect.top + scrollY);
        return { id: panel.dataset.exportPanel, x: rect.left, y: rect.top + scrollY, width: rect.width, height: rect.height, scrollHeight: panel.scrollHeight };
      });
      const manifest = document.getElementById('export-manifest')!;
      manifest.textContent = JSON.stringify({ width: 375, sourceViewport: [375, 812], allPanelIds: ids, isolated: only, panels, totalHeight: document.getElementById('export-page')!.getBoundingClientRect().height });
      document.documentElement.dataset.exportReady = 'true';
      document.getElementById('export-ready')!.textContent = 'ready';
      window.dispatchEvent(new CustomEvent('export-ready', { detail: JSON.parse(manifest.textContent) }));
    }
    prepare().catch(error => { document.documentElement.dataset.exportReady = 'error'; document.getElementById('export-ready')!.textContent = String(error); });
    return () => { active = false; };
  }, []);
  return <><main id="export-page" data-panel-ids={ids.join(',')}><Cover /><Inside /><Introduction />{photographs.map((photo, index) => <PhotoPanel key={photo.src} index={index} />)}<TiePanel night={false} /><TiePanel night /><Heartfelt /><RingPanel /><Invitation /></main><script type="application/json" id="export-manifest" /><output id="export-ready" hidden>loading</output></>;
}

createRoot(document.getElementById('root')!).render(<App />);
