'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LineEngine, type DriverState } from './engine'
import { StageCtx, type StageApi } from './stageApi'
import { NIGHT, VISIBILITY, clamp, lerp, ringRadiusFor, smoothstep, type ChapterId, type ViewBox } from './shapes'
import { daylight } from './daylight'

type CoverPhase = 'closed' | 'opening' | 'open'
interface Section { chapter: ChapterId; top: number; height: number }
interface Row { el: HTMLElement; top: number; height: number }
interface Anchor {
  x: number; top: number; w: number; h: number
  sticky?: { start: number; end: number; inset: number; offset: number }
}

function measureAnchor(root: HTMLElement, selector: string): Anchor | null {
  const el = root.querySelector<HTMLElement>(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const anchor: Anchor = { x: r.left, top: r.top + window.scrollY, w: r.width, h: r.height }
  const hold = el.closest<HTMLElement>('.hold')
  const section = el.closest<HTMLElement>('[data-chapter]')
  if (hold && section && getComputedStyle(hold).position === 'sticky') {
    const hr = hold.getBoundingClientRect()
    const sr = section.getBoundingClientRect()
    const style = getComputedStyle(section)
    anchor.sticky = {
      start: sr.top + window.scrollY + (parseFloat(style.paddingTop) || 0),
      end: sr.bottom + window.scrollY - (parseFloat(style.paddingBottom) || 0) - hr.height,
      inset: parseFloat(getComputedStyle(hold).top) || 0,
      offset: r.top - hr.top,
    }
  }
  return anchor
}

function placeAnchor(anchor: Anchor, y: number, box: ViewBox) {
  box.x = anchor.x; box.w = anchor.w; box.h = anchor.h
  const sticky = anchor.sticky
  box.y = sticky
    ? clamp(y + sticky.inset, sticky.start, Math.max(sticky.start, sticky.end)) - y + sticky.offset
    : anchor.top - y
}

/** One donor simulation; page chrome and cover remain owned by the invitation. */
export function Stage({ children, reduced, coverPhase }: {
  children: ReactNode
  reduced: boolean
  coverPhase: CoverPhase
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nightRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef(coverPhase)
  const dirtyRef = useRef(true)
  const wakeRef = useRef<() => void>(() => {})
  const railRef = useRef<number | null>(null)
  const [chapter, setChapter] = useState<ChapterId>('overture')
  const [found, setFound] = useState(false)
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    phaseRef.current = coverPhase
    dirtyRef.current = true
    wakeRef.current()
  }, [coverPhase])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const night = nightRef.current
    if (!root || !canvas || !night) return
    const media = window.matchMedia('(pointer: coarse)')
    const touch = media.matches
    setCoarse(touch)
    const d: DriverState = {
      chapter: 'overture', next: 'overture', blend: 0, p: 0, railY: 0,
      pullBox: { x: 0, y: 0, w: 0, h: 0 }, knotBox: { x: 0, y: 0, w: 0, h: 0 },
      ringX: 0, ringY: 0, ringR: 120, inkOpacity: 0, pullOpacity: 0,
      clipTop: 0, clipBottom: window.innerHeight, masks: [],
      nameY: [0, 0], nameSag: [12, 24], voiceY: [0, 0], voiceOn: [0, 0], scrollVel: 0,
      night: 0, vis: VISIBILITY.overture,
      threadAnchor: { x: window.innerWidth / 2, y: 0, edge: 'entry' }, threadPinned: false,
    }
    const engine = new LineEngine(canvas, () => d, reduced, touch)
    let sections: Section[] = []
    let rows: Row[] = []
    let knot: Anchor | null = null
    let ring: Anchor | null = null
    let entry: Anchor | null = null
    let exit: Anchor | null = null
    let insideTitle: HTMLElement | null = null
    let insideNames: HTMLElement | null = null
    let introduction: Anchor | null = null
    let chapterRoots: HTMLElement[] = []
    let textMasks: Anchor[] = []
    let tieWords: HTMLElement[] = []
    let ringMessage: HTMLElement | null = null
    let ringClosing: HTMLElement | null = null
    let lastNight = -1
    let lastScroll = window.scrollY
    let velocity = 0
    let activeRow = -1
    let lastChapter: ChapterId | null = null
    let foundSent = false
    let raf = 0
    let measureRaf = 0
    let last = performance.now()
    let disposed = false

    const measure = () => {
      measureRaf = 0
      if (disposed) return
      const y = window.scrollY
      sections = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]')).map(el => {
        const r = el.getBoundingClientRect()
        return { chapter: el.dataset.chapter as ChapterId, top: r.top + y, height: r.height }
      }).filter(sec => sec.chapter in NIGHT)
      rows = Array.from(root.querySelectorAll<HTMLElement>('[data-rail-row]')).map(el => {
        const r = el.getBoundingClientRect()
        return { el, top: r.top + y, height: r.height }
      })
      knot = measureAnchor(root, '[data-tie-knot]')
      ring = measureAnchor(root, '[data-ring-center]')
      ringMessage = root.querySelector<HTMLElement>('[data-ring-center]')
      ringClosing = root.querySelector<HTMLElement>('.ring__closing')
      entry = measureAnchor(root, '[data-thread-entry]')
      exit = measureAnchor(root, '[data-thread-exit]')
      insideTitle = root.querySelector<HTMLElement>('[data-redline-anchor="inside-title"]')
      insideNames = root.querySelector<HTMLElement>('[data-redline-anchor="inside-names"]')
      introduction = measureAnchor(root, '.companionship .chapter-heading')
      chapterRoots = Array.from(root.querySelectorAll<HTMLElement>('.red-thread-chapters'))
      textMasks = Array.from(root.querySelectorAll<HTMLElement>('.companionship .chapter-heading, .story-caption, .waterfall-ending')).map(el => {
        const r = el.getBoundingClientRect()
        return { x: r.left - 8, top: r.top + y - 8, w: r.width + 16, h: r.height + 16 }
      })
      tieWords = Array.from(root.querySelectorAll<HTMLElement>('.tie__stack, .tie__after, .tie__inner > .index'))
      if (knot) placeAnchor(knot, y, d.knotBox)
      updateDriver()
      engine.resize(window.innerWidth, window.innerHeight)
      dirtyRef.current = true
      wake()
    }

    const updateDriver = () => {
      const y = window.scrollY
      const vh = window.innerHeight
      const displacement = y - lastScroll
      velocity = Math.abs(displacement) > vh * .45 ? 0 : velocity + (displacement - velocity) * .35
      lastScroll = y
      let index = 0
      for (let k = 0; k < sections.length; k++) if (y >= sections[k].top) index = k
      const sec = sections[index]
      if (!sec) return
      const next = sections[index + 1]
      d.chapter = sec.chapter
      d.next = next?.chapter ?? sec.chapter
      d.p = clamp((y - sec.top) / Math.max(1, sec.height - vh), 0, 1)
      d.blend = next ? smoothstep(0, 1, (y + vh - next.top) / vh) : 0

      // The photograph story starts below its introduction. Keep the entering
      // strand alive until it reaches the SVG's actual first point.
      let entryProgress: number | null = null
      if (entry && (sec.chapter === 'overture' || (sec.chapter === 'thread' && y < entry.top))) {
        d.chapter = 'overture'; d.next = 'thread'
        entryProgress = smoothstep(0, 1, (y + vh - entry.top) / vh)
        // Gather toward the first photograph's centre before its introduction
        // reaches the reading area; measured text masks leave every word clear.
        const end = Math.max(1, (introduction?.top ?? entry.top) - vh)
        d.blend = smoothstep(Math.max(0, end - vh * .45), end, y)
        d.threadAnchor = { x: entry.x, y: entry.top - y, edge: 'entry' }
      } else if (exit && sec.chapter === 'thread') {
        d.threadAnchor = { x: exit.x, y: exit.top - y, edge: 'exit' }
      }
      d.scrollVel = touch ? clamp(velocity, -12, 12) * .2 : velocity
      d.night = lerp(NIGHT[d.chapter], NIGHT[d.next], d.blend)
      if (d.chapter === 'thread' && d.next === 'tie') d.night = .32 * d.blend
      if (d.chapter === 'tie') d.night = lerp(.32 + .68 * smoothstep(.12, .72, d.p), NIGHT[d.next], d.blend)
      d.vis = lerp(VISIBILITY[d.chapter], VISIBILITY[d.next], d.blend)
      d.inkOpacity = d.chapter === 'thread'
        ? smoothstep(0, .35, d.blend)
        : d.next === 'thread' ? 1 - smoothstep(.75, 1, d.blend) : 1
      if (entryProgress !== null) d.inkOpacity = 1 - smoothstep(.75, 1, entryProgress)
      d.threadPinned = ((d.next === 'thread' && d.blend > .001) || (d.chapter === 'thread' && d.blend < 1))
        && d.threadAnchor.y >= -2 && d.threadAnchor.y <= vh + 2
      // Cover state only gates the overture share. A visitor may scroll directly
      // into the photographs without ever opening the cover.
      if (phaseRef.current !== 'open' && d.chapter === 'overture') {
        if (sec.chapter === 'overture') d.inkOpacity = 0
        else {
          // After a direct scroll, the visible downstream line is already the
          // SVG entry geometry. No unopened cover shape can leak into it.
          d.chapter = 'thread'; d.next = 'thread'; d.blend = 0
        }
      }
      if (knot) placeAnchor(knot, y, d.knotBox)

      if (rows.length) {
        let selected = railRef.current
        if (selected == null || !rows[selected]) {
          let distance = Infinity
          selected = 0
          rows.forEach((row, i) => {
            const delta = Math.abs(row.top + row.height / 2 - y - vh / 2)
            if (delta < distance) { distance = delta; selected = i }
          })
        }
        if (selected !== activeRow) {
          if (rows[activeRow]) rows[activeRow].el.dataset.active = '0'
          rows[selected].el.dataset.active = '1'
          activeRow = selected
        }
        d.railY = rows[selected].top - y
      }

      d.clipTop = 0
      d.clipBottom = vh
      d.masks = textMasks.map(mask => ({ x: mask.x, y: mask.top - y, w: mask.w, h: mask.h }))
      if (d.chapter === 'overture') {
        const title = insideTitle?.getBoundingClientRect()
        const names = insideNames?.getBoundingClientRect()
        const continueButton = root.querySelector<HTMLElement>('.cover-revisit')?.getBoundingClientRect()
        if (names) {
          const sag = Math.min(30, window.innerWidth * .06,
            Math.max(0, (continueButton?.top ?? Infinity) - names.bottom - 28))
          d.nameY = [names.bottom + 16, names.bottom + 16]
          d.nameSag = [sag, sag]
          d.clipTop = Math.max(0, names.bottom + 8)
        }
        if (title) d.masks.push({ x: title.left - 8, y: title.top - 8, w: title.width + 16, h: title.height + 16 })
        if (continueButton) d.masks.push({ x: continueButton.left - 8, y: continueButton.top - 8, w: continueButton.width + 16, h: continueButton.height + 16 })
      }
      if (d.chapter === 'tie' || d.next === 'tie') tieWords.forEach(el => {
        const r = el.getBoundingClientRect()
        d.masks.push({ x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 })
      })
      const heartSection = sections.find(item => item.chapter === 'heart')
      const ringSection = sections.find(item => item.chapter === 'ring')
      const endSection = sections.find(item => item.chapter === 'end')
      if (heartSection && (d.chapter === 'tie' || d.next === 'tie')) {
        d.clipBottom = Math.min(vh, heartSection.top - y)
      }
      if (d.chapter === 'heart') {
        d.inkOpacity = d.next === 'ring' && d.blend > 0 ? 1 : 0
        d.clipTop = Math.max(0, (ringSection?.top ?? Infinity) - y)
      }
      if (d.chapter === 'ring' || d.next === 'ring') {
        d.clipTop = Math.max(0, (ringSection?.top ?? 0) - y)
        d.clipBottom = Math.min(vh, (endSection?.top ?? Infinity) - y, (ringSection ? ringSection.top + ringSection.height : Infinity) - y)
      }
      if (d.chapter === 'end') d.inkOpacity = 0
      if (ring) {
        const top = ring.top - y
        d.ringX = ring.x + ring.w / 2
        d.ringY = top + ring.h / 2
        d.ringR = ringRadiusFor(ring.w, ring.h)
        if (d.chapter === 'ring' || d.next === 'ring') {
          for (const el of [ringMessage, ringClosing]) {
            if (!el) continue
            const r = el.getBoundingClientRect()
            d.masks.push({ x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 })
          }
        }
      }
      const tieIndex = sections.findIndex(item => item.chapter === 'tie')
      const phase = index < tieIndex ? 0 : index > tieIndex ? 1 : d.p
      chapterRoots.forEach(chapters => {
        chapters.style.setProperty('--tp', phase.toFixed(3))
        chapters.style.setProperty('--night', d.night.toFixed(3))
      })
      root.style.setProperty('--thread-night', d.night.toFixed(3))
      root.style.setProperty('--thread-tone', d.night.toFixed(3))
      if (Math.abs(d.night - lastNight) > .0001) {
        const palette = daylight(d.night)
        root.style.setProperty('--thread-ground', palette.ground)
        root.style.setProperty('--thread-ink', palette.ink)
        root.style.setProperty('--thread-secondary', palette.secondary)
        root.style.setProperty('--thread-readable-red', palette.red)
        lastNight = d.night
      }
      night.style.setProperty('--night', d.night.toFixed(3))
      night.style.setProperty('--tp', phase.toFixed(3))
      // Expose the exact document-independent pin used by Canvas for inspection.
      canvas.dataset.ink = d.inkOpacity.toFixed(3)
      canvas.dataset.phase = `${d.chapter}:${d.next}`
      canvas.dataset.progress = d.p.toFixed(3)
      canvas.dataset.clipTop = d.clipTop.toFixed(2)
      canvas.dataset.clipBottom = d.clipBottom.toFixed(2)
      canvas.dataset.handoff = d.threadPinned ? d.threadAnchor.edge : ''
      canvas.dataset.anchorX = d.threadAnchor.x.toFixed(2)
      canvas.dataset.anchorY = d.threadAnchor.y.toFixed(2)
      if (sec.chapter !== lastChapter) {
        lastChapter = sec.chapter
        root.dataset.chapterActive = sec.chapter
        setChapter(sec.chapter)
      }
      if (!foundSent && engine.found) { foundSent = true; setFound(true) }
    }

    function tick(now: number) {
      raf = 0
      if (document.hidden || disposed) return
      const dt = now - last
      last = now
      updateDriver()
      engine.frame(dt)
      dirtyRef.current = false
      // There is no moving canvas while SVG owns the story, the cover is shut,
      // or the completed ring has left. A passive scroll wakes it again.
      if (!reduced && d.inkOpacity > .001) raf = requestAnimationFrame(tick)
    }
    function wake() {
      if (!raf && !document.hidden && !disposed) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    wakeRef.current = wake
    const onScroll = () => { dirtyRef.current = true; wake() }
    const onMeasure = () => { if (!measureRaf) measureRaf = requestAnimationFrame(measure) }
    const onVisibility = () => {
      cancelAnimationFrame(raf); raf = 0
      if (!document.hidden) wake()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        engine.pointer(event.clientX, event.clientY)
        if (d.inkOpacity > .001) wake()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.target as HTMLElement)?.closest('a,button,input,textarea,select,[role="dialog"]')) return
      if (event.pointerType === 'touch') return
      engine.pointer(event.clientX, event.clientY); engine.press(true); wake()
    }
    const onPointerUp = () => { engine.press(false) }
    const onPointerLeave = () => { engine.pointerOut() }
    measure()
    const observer = new ResizeObserver(onMeasure)
    const main = root.querySelector('main')
    if (main) observer.observe(main)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onMeasure)
    window.addEventListener('orientationchange', onMeasure)
    window.addEventListener('red-thread-measured', onMeasure)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerLeave, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    void document.fonts?.ready.then(() => { if (!disposed) onMeasure() }).catch(() => {})
    return () => {
      disposed = true
      cancelAnimationFrame(raf); cancelAnimationFrame(measureRaf)
      observer.disconnect()
      wakeRef.current = () => {}
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onMeasure)
      window.removeEventListener('orientationchange', onMeasure)
      window.removeEventListener('red-thread-measured', onMeasure)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerLeave)
      document.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  const api = useMemo<StageApi>(() => ({
    chapter, found, reduced, coarse,
    setRailOverride(index) { railRef.current = index; dirtyRef.current = true; wakeRef.current() },
  }), [chapter, found, reduced, coarse])

  return <StageCtx.Provider value={api}>
    <div className="red-thread-stage" ref={rootRef}>
      <div ref={nightRef} className="red-thread-night" aria-hidden="true"><div className="red-thread-moon" /></div>
      <canvas ref={canvasRef} className="red-thread-canvas" aria-hidden="true" />
      {children}
    </div>
  </StageCtx.Provider>
}
