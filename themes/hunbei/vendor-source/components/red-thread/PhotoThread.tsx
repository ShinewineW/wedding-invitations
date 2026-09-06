'use client'

import { useEffect, useId, useRef, type RefObject } from 'react'
import { FEEL } from './line/shapes'

const POINTS = 121
type Point = [number, number]
type Curve = [Point, Point, Point]

// These are open cord gestures, in reading order: a loose knot, paired loops,
// a soft heart before the rose room, then an oval that leads towards the ring.
// Each silhouette is authored once; animation only relaxes its sampled points.
const MOTIFS: { id: string; start: Point; curves: Curve[] }[] = [
  { id: 'loose-overhand', start: [0, -1], curves: [
    [[0, -.62], [.78, -.4], [.78, .08]],
    [[.78, .74], [-.58, .73], [-.58, .1]],
    [[-.58, -.4], [.22, -.43], [.22, -.02]],
    [[.22, .38], [0, .64], [0, 1]],
  ] },
  { id: 'paired-crossing', start: [0, -1], curves: [
    [[0, -.6], [.18, -.3], [0, 0]],
    [[-.55, .65], [-1, .5], [-1, 0]],
    [[-1, -.62], [-.48, -.55], [0, 0]],
    [[.48, .55], [1, .62], [1, 0]],
    [[1, -.5], [.55, -.65], [0, 0]],
    [[-.18, .3], [0, .6], [0, 1]],
  ] },
  { id: 'soft-heart', start: [0, -1], curves: [
    [[0, -.55], [-.9, -.64], [-.9, -.1]],
    [[-.9, .28], [-.35, .53], [-.08, .7]],
    [[-.03, .73], [.03, .73], [.08, .7]],
    [[.35, .53], [.9, .28], [.9, -.1]],
    [[.9, -.64], [0, -.57], [0, -.15]],
    [[0, .35], [0, .65], [0, 1]],
  ] },
  { id: 'open-oval', start: [.45, -1], curves: [
    [[.45, -.5], [-1, -.65], [-1, 0]],
    [[-1, .65], [.45, .5], [.45, 1]],
  ] },
]
const cubic = (a: number, b: number, c: number, d: number, t: number) =>
  a * (1 - t) ** 3 + 3 * b * (1 - t) ** 2 * t + 3 * c * (1 - t) * t * t + d * t ** 3

/** One continuous cord joins the five photographs at their actual positions. */
export function PhotoThread({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const clipId = `photo-thread-${useId().replace(/:/g, '')}`
  const entryRef = useRef<HTMLSpanElement>(null)
  const exitRef = useRef<HTMLSpanElement>(null)
  const cordRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const story = containerRef.current
    const cord = cordRef.current
    const path = pathRef.current
    if (!story || !cord || !path) return
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const touchReading = window.matchMedia('(pointer: coarse)').matches
    let frames: { topX: number; bottomX: number; top: number; bottom: number; cardTop: number; cardBottom: number; normalX: number; normalY: number }[] = []
    let exitY = 0
    let visible = false
    let raf = 0
    let previousTime = 0
    let previousScroll = window.scrollY
    let scrollVelocity = 0
    let scrollAt = performance.now()
    let accumulator = 0
    let disposed = false
    const ropes = Array.from(story.querySelectorAll('[data-thread-photo]')).slice(1).map(() => ({
      x: new Float32Array(POINTS), y: new Float32Array(POINTS),
      dx: new Float32Array(POINTS), dy: new Float32Array(POINTS),
      px: new Float32Array(POINTS), py: new Float32Array(POINTS),
      sx: new Float32Array(POINTS), sy: new Float32Array(POINTS),
      vx: new Float32Array(POINTS), vy: new Float32Array(POINTS),
      weight: new Float32Array(POINTS),
    }))

    const draw = () => {
      if (!frames.length) return
      let d = `M ${frames[0].topX} -28 L ${frames[0].topX} ${frames[0].top}`
      frames.forEach((frame, i) => {
        d += ` L ${frame.bottomX} ${frame.bottom}`
        const next = frames[i + 1]
        if (!next) return
        const rope = ropes[i]
        // Smooth through the simulated points without introducing joins between
        // the moving parts of a single cord. The last point is the fixed pin.
        for (let j = 1; j < POINTS - 1; j++) {
          const x = rope.x[j] + rope.dx[j]
          const y = rope.y[j] + rope.dy[j]
          const nx = rope.x[j + 1] + rope.dx[j + 1]
          const ny = rope.y[j + 1] + rope.dy[j + 1]
          d += ` Q ${x} ${y}, ${(x + nx) * 0.5} ${(y + ny) * 0.5}`
        }
        d += ` L ${next.topX} ${next.top}`
      })
      d += ` L ${frames[frames.length - 1].bottomX} ${exitY}`
      path.setAttribute('d', d)
    }

    const measure = () => {
      if (disposed) return
      const bounds = story.getBoundingClientRect()
      frames = Array.from(story.querySelectorAll<HTMLElement>('[data-thread-photo]'))
        .map(el => {
          const rect = el.getBoundingClientRect()
          const card = el.closest<HTMLElement>('[data-thread-card]')?.getBoundingClientRect() ?? rect
          const transform = getComputedStyle(el).transform
          const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform)
          const cx = rect.left + rect.width / 2 - bounds.left
          const cy = rect.top + rect.height / 2 - bounds.top
          // Rotated papers still receive the thread at their own edge centres.
          const halfX = matrix.c * el.offsetHeight / 2
          const halfY = matrix.d * el.offsetHeight / 2
          return { topX: cx - halfX, bottomX: cx + halfX,
            top: cy - halfY, bottom: cy + halfY,
            cardTop: card.top - bounds.top, cardBottom: card.bottom - bounds.top,
            normalX: matrix.c, normalY: matrix.d }
        })
      if (!frames.length) return
      exitY = bounds.height + 32
      if (entryRef.current) {
        entryRef.current.style.left = `${frames[0].topX}px`
        entryRef.current.style.top = '-28px'
      }
      if (exitRef.current) {
        exitRef.current.style.left = `${frames[frames.length - 1].bottomX}px`
        exitRef.current.style.top = `${exitY}px`
      }
      const motifBounds: { id: string; top: number; bottom: number; centreX: number }[] = []
      frames.slice(0, -1).forEach((frame, i) => {
        const next = frames[i + 1]
        const start = frame.cardBottom + 12
        const end = next.cardTop - 12
        const span = Math.max(1, end - start)
        const width = Math.min(bounds.width * .21, span * .82, 100)
        const height = span * .37
        const motif = MOTIFS[i % MOTIFS.length]
        const centreX = motif.id === 'open-oval'
          ? next.topX - width * .45
          : (frame.bottomX + next.topX) / 2
        const centreY = (start + end) / 2
        const place = ([x, y]: Point): Point => [centreX + x * width, centreY + y * height]
        const first = place(motif.start)
        const last = place(motif.curves[motif.curves.length - 1][2])
        const entry: Point = [frame.bottomX, frame.bottom]
        const exit: Point = [next.topX, next.top]
        const lead = Math.max(4, (start - frame.bottom) / 3)
        const tail = Math.max(4, (next.top - end) / 3)
        const curves: { points: Curve; from: number; to: number }[] = [
          { points: [[entry[0] + frame.normalX * lead, entry[1] + frame.normalY * lead],
            [frame.bottomX, start - lead], [frame.bottomX, start]], from: 0, to: 0 },
          { points: [[frame.bottomX, start + span * .13],
            [first[0], first[1] - span * .08], first], from: 0, to: 1 },
          ...motif.curves.map(points => ({ points: points.map(place) as Curve, from: 1, to: 1 })),
          { points: [[last[0], last[1] + span * .08],
            [next.topX, end - span * .13], [next.topX, end]], from: 1, to: 0 },
          { points: [[next.topX, end + tail],
            [exit[0] - next.normalX * tail, exit[1] - next.normalY * tail], exit], from: 0, to: 0 },
        ]
        // Arc-length samples give every loop the same supple, bounded physics,
        // regardless of caption height or the distance between desktop columns.
        const samples = [{ x: entry[0], y: entry[1], distance: 0, weight: 0 }]
        let previous = entry
        for (const curve of curves) {
          const [b, c, d] = curve.points
          for (let k = 1; k <= 32; k++) {
            const t = k / 32
            const x = cubic(previous[0], b[0], c[0], d[0], t)
            const y = cubic(previous[1], b[1], c[1], d[1], t)
            const before = samples[samples.length - 1]
            samples.push({ x, y, distance: before.distance + Math.hypot(x - before.x, y - before.y),
              weight: curve.from + (curve.to - curve.from) * t * t * (3 - 2 * t) })
          }
          previous = d
        }
        const rope = ropes[i]
        const length = samples[samples.length - 1].distance
        let sample = 1
        for (let j = 0; j < POINTS; j++) {
          const distance = length * j / (POINTS - 1)
          while (sample < samples.length - 1 && samples[sample].distance < distance) sample++
          const before = samples[sample - 1]
          const after = samples[sample]
          const t = (distance - before.distance) / Math.max(.001, after.distance - before.distance)
          rope.x[j] = before.x + (after.x - before.x) * t
          rope.y[j] = before.y + (after.y - before.y) * t
          rope.weight[j] = before.weight + (after.weight - before.weight) * t
        }
        // Two collinear samples at each pin retain the paper's own tangent,
        // including the slightly rotated postcards, during both idle and scroll.
        for (let j = 0; j < 3; j++) {
          rope.x[j] = entry[0] + frame.normalX * j * 2
          rope.y[j] = entry[1] + frame.normalY * j * 2
          rope.x[POINTS - 1 - j] = exit[0] - next.normalX * j * 2
          rope.y[POINTS - 1 - j] = exit[1] - next.normalY * j * 2
          rope.weight[j] = rope.weight[POINTS - 1 - j] = 0
        }
        motifBounds.push({ id: motif.id, top: start, bottom: end, centreX })
      })
      cord.dataset.motifs = JSON.stringify(motifBounds)
      const clip = cord.querySelector('[data-caption-clip]')
      if (clip) {
        // Vector holes keep the same 8px text clearance without repainting a
        // full-height luminance-mask bitmap on every moving-cord frame.
        const rectangle = (x: number, y: number, width: number, height: number) =>
          `M ${x} ${y} h ${width} v ${height} h ${-width} Z`
        const holes = Array.from(story.querySelectorAll<HTMLElement>('.story-caption')).map(el => {
          const caption = el.getBoundingClientRect()
          return rectangle(caption.left - bounds.left - 8, caption.top - bounds.top - 8,
            caption.width + 16, caption.height + 16)
        })
        clip.setAttribute('d', [rectangle(-40, -40, bounds.width + 80, bounds.height + 80), ...holes].join(' '))
      }
      cord.dataset.joins = JSON.stringify(frames)
      cord.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`)
      draw()
      window.dispatchEvent(new Event('red-thread-measured'))
    }

    const step = (time: number) => {
      const f = FEEL.thread
      const whip = Math.max(-70, Math.min(70, scrollVelocity)) * (touchReading ? 0.012 : 0.06)
      const amplitude = 1.3 + Math.min(touchReading ? 3.5 : 5, Math.abs(scrollVelocity) * .12)
      ropes.forEach((rope, i) => {
        rope.sx.set(rope.dx)
        rope.sy.set(rope.dy)
        for (let j = 0; j < POINTS; j++) {
          rope.vx[j] = rope.dx[j] - rope.px[j]
          rope.vy[j] = rope.dy[j] - rope.py[j]
        }
        for (let j = 1; j < POINTS - 1; j++) {
          const u = j / (POINTS - 1)
          const arm = u
          const envelope = rope.weight[j]
          const phase = window.scrollY * (touchReading ? 0.006 : 0.018) + time * 0.0005 + i * 1.3
          const targetY = Math.sin(phase + arm * Math.PI * 2) * amplitude * envelope
          const targetX = Math.sin(phase + u * Math.PI * 2) * 1.7 * envelope
          const dx = rope.sx[j]
          const dy = rope.sy[j]
          const fx = (targetX - dx) * f.stiffness
            + (rope.sx[j - 1] + rope.sx[j + 1] - 2 * dx) * f.tension
            + (rope.vx[j - 1] + rope.vx[j + 1] - 2 * rope.vx[j]) * f.viscosity
          const fy = (targetY - dy) * f.stiffness
            + (rope.sy[j - 1] + rope.sy[j + 1] - 2 * dy) * f.tension
            + (rope.vy[j - 1] + rope.vy[j + 1] - 2 * rope.vy[j]) * f.viscosity
            - whip * Math.sin(u * Math.PI) * envelope
          rope.px[j] = dx
          rope.py[j] = dy
          rope.dx[j] = Math.max(-4 * envelope, Math.min(4 * envelope, dx + rope.vx[j] * f.damping + fx))
          const travel = 7 * envelope
          rope.dy[j] = Math.max(-travel, Math.min(travel, dy + rope.vy[j] * f.damping + fy))
        }
      })
      scrollVelocity *= 0.9
    }
    const tick = (time: number) => {
      accumulator += Math.min((time - previousTime) / 1000 || 1 / 60, 1 / 15)
      previousTime = time
      while (accumulator >= 1 / 60) {
        step(time)
        accumulator -= 1 / 60
      }
      draw()
      raf = requestAnimationFrame(tick)
    }

    const syncMotion = () => {
      cancelAnimationFrame(raf)
      previousTime = 0
      accumulator = 0
      if (motionPreference.matches) {
        ropes.forEach(rope => {
          rope.dx.fill(0); rope.dy.fill(0); rope.px.fill(0); rope.py.fill(0)
        })
        draw()
      } else if (visible && !document.hidden) {
        raf = requestAnimationFrame(tick)
      }
    }
    const onScroll = () => {
      const now = performance.now()
      const elapsedFrames = Math.max(1, Math.min(4, (now - scrollAt) / (1000 / 60)))
      const velocity = (window.scrollY - previousScroll) / elapsedFrames
      scrollVelocity = Math.max(-70, Math.min(70, scrollVelocity * 0.3 + velocity * 0.7))
      previousScroll = window.scrollY
      scrollAt = now
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(story)
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncMotion()
    }, { rootMargin: '100px' })
    visibility.observe(story)
    motionPreference.addEventListener('change', syncMotion)
    document.addEventListener('visibilitychange', syncMotion)
    void document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      motionPreference.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', syncMotion)
      window.removeEventListener('scroll', onScroll)
    }
  }, [containerRef])

  return <>
    <span ref={entryRef} className="photo-thread-anchor" data-thread-entry aria-hidden="true" />
    <span ref={exitRef} className="photo-thread-anchor" data-thread-exit aria-hidden="true" />
    <svg className="photo-thread-cord" ref={cordRef} aria-hidden="true">
      <path ref={pathRef} clipPath={`url(#${clipId})`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path data-caption-clip clipRule="evenodd" />
        </clipPath>
      </defs>
    </svg>
  </>
}
