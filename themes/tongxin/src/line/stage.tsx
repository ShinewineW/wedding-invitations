/**
 * The stage owns the canvas, the animation loop and the scroll driver.
 *
 * Everything expensive happens here, once per frame, outside React: reading
 * scroll, resolving which chapter the page is in, stepping the simulation, and
 * tracking the real DOM boxes the silk belongs to. React is told only when the
 * chapter actually changes.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { photos } from '../content'
import { LineEngine, type DriverState } from './engine'
import { StageCtx, type StageApi } from './stageApi'
import { NIGHT, VISIBILITY, clamp, lerp, pullTouchBox, ringRadiusFor, smoothstep, type ChapterId, type ViewBox } from './shapes'

interface Sec {
  chapter: ChapterId
  hold: boolean
  top: number
  height: number
}

interface Row {
  el: HTMLElement
  top: number
  height: number
}

/** A cached anchor can move with a sticky panel without re-reading layout. */
interface Anchor {
  x: number
  top: number
  w: number
  h: number
  sticky?: { start: number; end: number; inset: number; offset: number }
}

function measureAnchor(selector: string): Anchor | null {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const anchor: Anchor = { x: r.left, top: r.top + window.scrollY, w: r.width, h: r.height }
  const hold = el.closest<HTMLElement>('.hold')
  const section = el.closest<HTMLElement>('[data-chapter]')
  if (hold && section && getComputedStyle(hold).position === 'sticky') {
    const hr = hold.getBoundingClientRect()
    const sr = section.getBoundingClientRect()
    const sectionStyle = getComputedStyle(section)
    // The hold is the chapter's first flow child. offsetTop includes the sticky
    // displacement in browsers, so it cannot recover its original position when
    // a font load or resize remeasures midway through a chapter.
    anchor.sticky = {
      start: sr.top + window.scrollY + (parseFloat(sectionStyle.paddingTop) || 0),
      end: sr.bottom + window.scrollY - (parseFloat(sectionStyle.paddingBottom) || 0) - hr.height,
      inset: parseFloat(getComputedStyle(hold).top) || 0,
      offset: r.top - hr.top,
    }
  }
  return anchor
}

function placeAnchor(anchor: Anchor, scrollY: number, box: ViewBox) {
  box.x = anchor.x
  box.w = anchor.w
  box.h = anchor.h
  const sticky = anchor.sticky
  box.y = sticky
    ? clamp(scrollY + sticky.inset, sticky.start, Math.max(sticky.start, sticky.end)) - scrollY + sticky.offset
    : anchor.top - scrollY
}

const matchMediaSafe = (q: string) =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null

export function Stage({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const backdropImageRef = useRef<HTMLImageElement>(null)
  const driverRef = useRef<DriverState>({
    chapter: 'overture',
    next: 'overture',
    blend: 0,
    p: 0,
    railY: 0,
    pullBox: { x: 0, y: 0, w: 0, h: 0 },
    knotBox: { x: 0, y: 0, w: 0, h: 0 },
    ringX: 0,
    ringY: 0,
    ringR: 120,
    ringClose: 0,
    inkOpacity: 1,
    pullOpacity: 0,
    nameY: [0, 0],
    voiceY: [0, 0],
    voiceOn: [0, 0],
    scrollVel: 0,
    night: 0,
    vis: VISIBILITY.overture,
  })
  const secsRef = useRef<Sec[]>([])
  const rowsRef = useRef<Row[]>([])
  const railOverrideRef = useRef<number | null>(null)
  const pullAnchorRef = useRef<Anchor | null>(null)
  const knotAnchorRef = useRef<Anchor | null>(null)
  const ringAnchorRef = useRef<Anchor | null>(null)
  const nameElsRef = useRef<HTMLElement[]>([])
  const voicesRef = useRef<Row[][]>([[], []])
  const dirtyRef = useRef(true)

  const [chapter, setChapter] = useState<ChapterId>('overture')
  const [found, setFound] = useState(false)

  const reduced = useMemo(() => matchMediaSafe('(prefers-reduced-motion: reduce)')?.matches ?? false, [])
  const coarse = useMemo(() => matchMediaSafe('(pointer: coarse)')?.matches ?? false, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new LineEngine(canvas, () => driverRef.current, reduced, coarse)
    const pullHandle = document.querySelector<HTMLElement>('[data-pull-handle]')
    let notes: { el: HTMLElement; u: number; strand: number; halfW: number; halfH: number }[] = []

    const photo = new Image()
    photo.decoding = 'async'
    photo.onload = () => {
      engine.setPhoto(photo)
      measure()
    }

    /** Cache chapter and animation boxes; only the overture name baselines read layout per frame. */
    const measure = () => {
      const photoSrc = window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches
        ? photos.pull.mobileSrc
        : photos.pull.src
      if (photo.getAttribute('src') !== photoSrc) photo.src = photoSrc
      if (backdropImageRef.current?.getAttribute('src') !== photoSrc) backdropImageRef.current?.setAttribute('src', photoSrc)
      const y = window.scrollY
      secsRef.current = Array.from(
        document.querySelectorAll<HTMLElement>('[data-chapter]'),
      ).map((el) => {
        const r = el.getBoundingClientRect()
        return {
          chapter: el.dataset.chapter as ChapterId,
          hold: el.dataset.hold === '1',
          top: r.top + y,
          height: r.height,
        }
      })
      rowsRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-row]')).map(
        (el) => {
          const r = el.getBoundingClientRect()
          return { el, top: r.top + y, height: r.height }
        },
      )
      pullAnchorRef.current = measureAnchor('[data-pull-photo]')
      knotAnchorRef.current = measureAnchor('[data-tie-knot]')
      ringAnchorRef.current = measureAnchor('[data-ring-center]')
      notes = Array.from(document.querySelectorAll<HTMLElement>('[data-pull-note]')).map((el) => ({
        el, u: Number(el.dataset.u), strand: Number(el.dataset.strand),
        halfW: el.offsetWidth * 0.5, halfH: el.offsetHeight * 0.5,
      }))
      nameElsRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-rule]'))
      voicesRef.current = [[], []]
      for (const el of document.querySelectorAll<HTMLElement>('[data-voice]')) {
        const r = el.getBoundingClientRect()
        voicesRef.current[Number(el.dataset.voice)].push({ el, top: r.top + y, height: r.height })
      }
      // Box placement is populated before resize seeds the simulation.
      const d = driverRef.current
      if (pullAnchorRef.current) placeAnchor(pullAnchorRef.current, y, d.pullBox)
      if (knotAnchorRef.current) placeAnchor(knotAnchorRef.current, y, d.knotBox)
      engine.resize(window.innerWidth, window.innerHeight)
      const backdrop = backdropRef.current
      const backdropImage = backdropImageRef.current
      if (backdrop && backdropImage && pullAnchorRef.current) {
        const { fit } = engine.photoPlacement(d.pullBox)
        backdrop.style.width = `${d.pullBox.w}px`
        backdrop.style.height = `${d.pullBox.h}px`
        Object.assign(backdropImage.style, { left: `${fit.x}px`, top: `${fit.y}px`, width: `${fit.w}px`, height: `${fit.h}px` })
      }
      dirtyRef.current = true
    }

    measure()

    let lastScroll = window.scrollY
    let vel = 0
    let activeRow = -1
    let lastChapter: ChapterId | null = null
    let lastCp = -1
    let lastNight = -1
    let lastTp = -1
    let foundSent = false

    const updateDriver = () => {
      const vh = window.innerHeight
      const y = window.scrollY
      vel += (y - lastScroll - vel) * 0.35
      lastScroll = y
      const center = y + vh * 0.5
      const secs = secsRef.current
      const d = driverRef.current
      const tieIndex = secs.findIndex((x) => x.chapter === 'tie')

      // A chapter's progress is the travel of its sticky panel, not the position
      // of the viewport centre: p reaches 1 exactly as the panel finishes its
      // run, and the hand-over to the next chapter then occupies the last screen
      // of scrolling. That keeps the drawing in step with what is pinned on top
      // of it, and makes every boundary continuous — the shape at p = 1 is the
      // shape the next chapter is blended from.
      let i = 0
      for (let k = 0; k < secs.length; k++) if (y >= secs[k].top) i = k
      const sec = secs[i]
      if (!sec) return

      const travel = Math.max(1, sec.height - vh)
      const p = sec.hold ? 1 : clamp((y - sec.top) / travel, 0, 1)
      const nextSec = secs[i + 1]
      const nextChapter = nextSec ? nextSec.chapter : sec.chapter
      const same = !nextSec || nextChapter === sec.chapter
      d.chapter = sec.chapter
      d.next = same ? sec.chapter : nextChapter
      d.blend = same ? 0 : smoothstep(0, 1, (y + vh - nextSec.top) / vh)
      const ringAnchor = ringAnchorRef.current
      const ringSection = secs.find(item => item.chapter === 'ring')
      if (ringAnchor && ringSection) {
        const radius = ringRadiusFor(ringAnchor.w, ringAnchor.h)
        const start = ringSection.top - vh
        const end = Math.min(document.documentElement.scrollHeight - vh,
          ringAnchor.top + ringAnchor.h * 0.5 - (vh - radius - 24))
        // Complete both the hand-over and the circle as its full bounds enter
        // the viewport, even when the footer ends before the section reaches top.
        d.ringClose = smoothstep(start, Math.max(start + 1, end), y)
        if (d.next === 'ring' && sec.chapter !== 'ring') d.blend = d.ringClose
      }
      d.p = p
      d.scrollVel = coarse ? clamp(vel, -12, 12) * 0.2 : vel
      // Both of these are simply another thing the chapter cross-fade carries, so
      // the page darkens and the thread solidifies on exactly the same curve the
      // drawing changes on.
      d.night = lerp(NIGHT[sec.chapter], NIGHT[d.next], d.blend)
      d.vis = lerp(VISIBILITY[sec.chapter], VISIBILITY[d.next], d.blend)
      // Chapter I has its own DOM thread connecting the photographs.
      d.inkOpacity = lerp(sec.chapter === 'thread' ? 0 : 1, d.next === 'thread' ? 0 : 1, d.blend)
      d.pullOpacity = sec.chapter === 'pull' ? 1 - d.blend : d.next === 'pull' ? d.blend : 0
      if (pullAnchorRef.current) placeAnchor(pullAnchorRef.current, y, d.pullBox)
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translate3d(${d.pullBox.x}px, ${d.pullBox.y}px, 0)`
        backdropRef.current.style.opacity = String(d.pullOpacity)
      }
      if (coarse && pullHandle) {
        const bounds = pullTouchBox(d.pullBox, vh, d.chapter === 'pull' ? d.p : 0)
        pullHandle.style.setProperty('--pull-touch-height', `${bounds.h}px`)
      }
      if (knotAnchorRef.current) placeAnchor(knotAnchorRef.current, y, d.knotBox)

      // The schedule rail: whichever entry the reader is level with, unless a
      // pointer is holding a different one.
      const rows = rowsRef.current
      if (rows.length) {
        let idx = railOverrideRef.current
        if (idx == null || idx >= rows.length) {
          let best = 0
          let bestD = Infinity
          for (let k = 0; k < rows.length; k++) {
            const dd = Math.abs(rows[k].top + rows[k].height * 0.5 - center)
            if (dd < bestD) {
              bestD = dd
              best = k
            }
          }
          idx = best
        }
        if (idx !== activeRow) {
          if (activeRow >= 0 && rows[activeRow]) rows[activeRow].el.dataset.active = '0'
          rows[idx].el.dataset.active = '1'
          activeRow = idx
        }
        // the rail lands on the rule above the active entry, taking the place of
        // that row's hairline border rather than crossing its text
        d.railY = rows[idx].top - y
      } else {
        d.railY = vh * 0.5
      }

      // Chapter Two: each rule bows toward whichever of its own lines is being
      // read, so the two rules lean in turn down the page.
      if (sec.chapter === 'thread' || d.next === 'thread') {
        for (let k = 0; k < 2; k++) {
          const list = voicesRef.current[k]
          let bestD = Infinity
          let bestY = center
          for (const v of list) {
            const vc = v.top + v.height * 0.5
            const dd = Math.abs(vc - center)
            if (dd < bestD) {
              bestD = dd
              bestY = vc
            }
          }
          d.voiceY[k] = bestY - y
          const t = bestD / 260
          d.voiceOn[k] = list.length ? Math.exp(-t * t) : 0
        }
      } else {
        d.voiceOn[0] = 0
        d.voiceOn[1] = 0
      }

      // Each overture rule is the baseline of its name, so it is read from the
      // heading itself. Both this and the ring below read layout, which is why
      // they are only read while the chapter that needs them is on screen.
      if (sec.chapter === 'overture' || d.next === 'overture') {
        const els = nameElsRef.current
        for (let k = 0; k < 2; k++) {
          const el = els[k]
          const r = el?.getBoundingClientRect()
          d.nameY[k] = r ? (coarse ? r.bottom + (k === 0 ? 16 : 12) : r.bottom - r.height * 0.105) : vh * (k === 0 ? 0.4 : 0.6)
        }
      }

      // The invitation keeps its document position after chapter V. A real
      // radius and an unclamped centre let the whole ring scroll out naturally.
      if (ringAnchor) {
        const top = ringAnchor.top - y
        d.ringX = ringAnchor.x + ringAnchor.w * 0.5
        d.ringY = top + ringAnchor.h * 0.5
        d.ringR = ringRadiusFor(ringAnchor.w, ringAnchor.h)
        // Fade with the wrapped words' last 48 visible pixels, so a larger
        // radius cannot leave an orphan arc after the invitation has departed.
        const visible = smoothstep(0, 48, top + ringAnchor.h) * smoothstep(0, 48, vh - top)
        const ringWeight = sec.chapter === 'ring' ? 1 : d.next === 'ring' ? d.blend : 0
        d.inkOpacity *= lerp(1, visible, ringWeight)
      }

      if (sec.chapter !== lastChapter) {
        lastChapter = sec.chapter
        document.documentElement.dataset.ch = sec.chapter
        setChapter(sec.chapter)
      }
      const cp = Math.round(p * 100) / 100
      if (cp !== lastCp) {
        lastCp = cp
        document.documentElement.style.setProperty('--cp', String(cp))
      }
      // A chapter's own phase: 0 before it, its progress during, 1 after. The
      // chapter's panel is on screen for a whole viewport before it becomes the
      // current chapter, and --cp belongs to whichever chapter is current — so
      // type keyed to --cp alone would show a chapter's ending before its start.
      const tp = i < tieIndex ? 0 : i > tieIndex ? 1 : p
      const tpr = Math.round(tp * 100) / 100
      if (tpr !== lastTp) {
        lastTp = tpr
        document.documentElement.style.setProperty('--tp', String(tpr))
      }

      const nt = Math.round(d.night * 100) / 100
      if (nt !== lastNight) {
        lastNight = nt
        document.documentElement.style.setProperty('--night', String(nt))
      }
      if (!foundSent && engine.found) {
        foundSent = true
        setFound(true)
      }
    }

    /** The original four notes hang from fixed points of the simulated silk. */
    const updateNotes = () => {
      const on = driverRef.current.pullOpacity
      const placed: { x: number; y: number; halfW: number; halfH: number }[] = []
      for (const { el, u, strand, halfW, halfH } of notes) {
        if (on <= 0.001) {
          el.style.opacity = '0'
          continue
        }
        const pt = engine.pointAt(u, strand)
        const side = strand === 0 ? -1 : 1
        const lift = side * (window.innerWidth < 700 ? 56 : 46)
        const photoBox = driverRef.current.pullBox
        const x = coarse ? clamp(pt.x, photoBox.x + halfW + 4, photoBox.x + photoBox.w - halfW - 4)
          : clamp(pt.x, halfW + 12, window.innerWidth - halfW - 12)
        let y = pt.y + lift
        // Keep the point attachment, adding only enough outward lift to separate
        // gathered labels. Dimensions are cached by measure(), never read here.
        for (let pass = 0; pass < placed.length; pass++) {
          for (const other of placed) {
            if (Math.abs(x - other.x) < halfW + other.halfW + 8
              && Math.abs(y - other.y) < halfH + other.halfH + 8) {
              y = other.y + side * (halfH + other.halfH + 8)
            }
          }
        }
        if (coarse) y = clamp(y, photoBox.y + halfH + 8, photoBox.y + photoBox.h - halfH - 8)
        placed.push({ x, y, halfW, halfH })
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
        const revealed = reduced ? 1 : lerp(0.5, 1, clamp((engine.disturbAt(u, strand) - 6) / 22, 0, 1))
        el.style.opacity = (revealed * on).toFixed(2)
      }
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = now - last
      last = now
      if (reduced && !dirtyRef.current) return
      dirtyRef.current = false
      updateDriver()
      engine.frame(dt)
      updateNotes()
    }
    raf = requestAnimationFrame(tick)

    const onScroll = () => {
      dirtyRef.current = true
    }
    const onResize = () => {
      measure()
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
      } else {
        last = performance.now()
        dirtyRef.current = true
        raf = requestAnimationFrame(tick)
      }
    }

    const interactive = 'a, button, input, textarea, select, label, [data-ui]'
    let downAt: { id: number; x: number; y: number; touch: boolean; pull: HTMLElement | null } | null = null
    const onPointerMove = (e: PointerEvent) => {
      if (downAt && e.pointerId !== downAt.id) return
      if (e.pointerType === 'touch' && !downAt?.pull) return
      if (downAt?.touch && downAt.pull) {
        const r = downAt.pull.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
          engine.pointerOut()
          release()
          return
        }
      }
      engine.pointer(e.clientX, e.clientY)
      dirtyRef.current = true
    }
    const onPointerDown = (e: PointerEvent) => {
      if (downAt || !e.isPrimary || (e.target as HTMLElement | null)?.closest(interactive)) return
      const device = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-pull-handle]') ?? null
      const touch = e.pointerType === 'touch'
      if (touch && !device) {
        engine.pointerOut()
        dirtyRef.current = true
        return
      }
      downAt = { id: e.pointerId, x: e.clientX, y: e.clientY, touch, pull: device }
      // Keep the silk's 2D gesture only while the finger remains in its strip.
      if (device) device.setPointerCapture(e.pointerId)
      if (!touch) e.preventDefault()
      document.body.classList.add('holding')
      engine.pointer(e.clientX, e.clientY)
      engine.press(true)
      dirtyRef.current = true
    }
    const release = () => {
      const held = downAt
      downAt = null
      if (held?.pull?.hasPointerCapture(held.id)) held.pull.releasePointerCapture(held.id)
      document.body.classList.remove('holding')
      dirtyRef.current = true
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!downAt || e.pointerId !== downAt.id) return
      engine.press(false)
      if (downAt.touch) {
        if (downAt.pull && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 12) {
          engine.pluck(e.clientX, e.clientY, 1)
        }
        engine.pointerOut()
      }
      release()
    }
    const onPointerCancel = (e: PointerEvent) => {
      if (!downAt || e.pointerId !== downAt.id) return
      engine.pointerOut()
      release()
    }
    const onPointerLeave = () => {
      if (!downAt?.pull) {
        engine.pointerOut()
        release()
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })
    window.addEventListener('lostpointercapture', onPointerCancel, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)

    // sections grow when fonts land; remeasure once they do
    document.fonts?.ready.then(measure).catch(() => {})
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('lostpointercapture', onPointerCancel)
      document.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reduced, coarse])

  const api = useMemo<StageApi>(
    () => ({
      chapter,
      found,
      reduced,
      coarse,
      setRailOverride: (index) => {
        railOverrideRef.current = index
        dirtyRef.current = true
      },
    }),
    [chapter, found, reduced, coarse],
  )

  return (
    <StageCtx.Provider value={api}>
      <div ref={backdropRef} className="pull-backdrop" aria-hidden="true">
        <img ref={backdropImageRef} alt="" />
      </div>
      <canvas ref={canvasRef} className="stage" aria-hidden="true" />
      {children}
    </StageCtx.Provider>
  )
}
