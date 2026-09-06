import { LineEngine, type DriverState } from '../vendor-source/components/red-thread/line/engine';
import { FEEL, ringRadiusFor, type ChapterId, type ViewBox } from '../vendor-source/components/red-thread/line/shapes';
import { silk } from '../vendor-source/components/red-thread/line/render';
import { MOTIFS } from './motifs';

function sizeExportCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d')!;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return context;
}

/** Run the final source engine once, with complete and measured static shapes. */
export function paintStaticThreads() {
  document.querySelectorAll<HTMLCanvasElement>('[data-static-thread]').forEach(canvas => {
    const panel = canvas.closest<HTMLElement>('[data-export-panel]')!;
    const rect = panel.getBoundingClientRect();
    const box = (selector: string): ViewBox => {
      const element = panel.querySelector<HTMLElement>(selector);
      if (!element) return { x: 0, y: 0, w: 0, h: 0 };
      const r = element.getBoundingClientRect();
      return { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height };
    };
    const name = box('[data-redline-anchor="inside-names"]');
    const ring = box('[data-ring-center]');
    const chapter = canvas.dataset.staticThread as ChapterId;
    if (chapter === 'overture') {
      // Preserve the mobile handover state: one cord leaves the names for the next page.
      const context = sizeExportCanvas(canvas, rect.width, rect.height);
      const x = rect.width / 2;
      const y = name.y + name.h + 16;
      context.clearRect(0, 0, rect.width, rect.height);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, rect.height);
      context.lineWidth = FEEL.overture.weight;
      context.strokeStyle = silk(0, 1)[0];
      context.lineCap = 'round';
      context.stroke();
      canvas.dataset.geometry = JSON.stringify({ chapter, width: rect.width, height: rect.height, shape: 'vertical', nameBottom: name.y + name.h, start: [x, y], end: [x, rect.height] });
      canvas.dataset.rendered = 'true';
      return;
    }
    const d: DriverState = {
      chapter, next: chapter, blend: 0, p: Number(canvas.dataset.progress || 0),
      threadAnchor: { x: rect.width / 2, y: 0, edge: 'entry' }, threadPinned: false,
      railY: 0, pullBox: { x: 0, y: 0, w: 0, h: 0 }, knotBox: box('[data-tie-knot]'),
      ringX: ring.x + ring.w / 2, ringY: ring.y + ring.h / 2, ringR: ringRadiusFor(ring.w, ring.h),
      inkOpacity: 1, clipTop: 0, clipBottom: rect.height,
      masks: [], pullOpacity: 0, nameY: [name.y + name.h + 16, name.y + name.h + 16], nameSag: [22.5, 22.5],
      voiceY: [0, 0], voiceOn: [0, 0], scrollVel: 0, night: Number(canvas.dataset.night || 0), vis: 1,
    };
    const engine = new LineEngine(canvas, () => d, true, true);
    engine.resize(rect.width, rect.height);
    // Keep the upstream engine intact, then draw its fixed geometry at export resolution.
    sizeExportCanvas(canvas, rect.width, rect.height);
    engine.frame(0);
    canvas.dataset.geometry = JSON.stringify({ chapter, width: rect.width, height: rect.height, progress: d.p, knotBox: d.knotBox, ringX: d.ringX, ringY: d.ringY, ringR: d.ringR, ringClose: 1, nameY: d.nameY });
    canvas.dataset.rendered = 'true';
  });

  // The complete source motifs get their own strip after each expanded photo back.
  // A straight lead/tail touches both edges, while all reading material stays clear.
  document.querySelectorAll<HTMLElement>('[data-static-motif]').forEach(element => {
    const motif = MOTIFS[Number(element.dataset.staticMotif)];
    const centreX = motif.id === 'open-oval' ? 187.5 - 65 * .45 : 187.5;
    const point = ([x, y]: readonly number[]) => `${+(centreX + x * 65).toFixed(3)} ${+(50 + y * 35).toFixed(3)}`;
    const start = point(motif.start);
    let d = `M ${start.split(' ')[0]} 0 L ${start}`;
    for (const curve of motif.curves) d += ` C ${curve.map(point).join(', ')}`;
    const last = point(motif.curves[motif.curves.length - 1][2]);
    d += ` L ${last.split(' ')[0]} 100`;
    element.querySelector('path')!.setAttribute('d', d);
    element.dataset.motifId = motif.id;
    element.dataset.rendered = 'true';
  });
}
