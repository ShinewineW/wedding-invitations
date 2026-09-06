import { useEffect, useRef } from 'react'
import { couple, storyPhotos, thread } from '../content'
import { FEEL } from '../line/shapes'

const POINTS = 73
const cubic = (a: number, b: number, c: number, d: number, t: number) =>
  a * (1 - t) ** 3 + 3 * b * (1 - t) ** 2 * t + 3 * c * (1 - t) * t * t + d * t ** 3

/** One continuous cord joins the five photographs at their actual positions. */
export function TheThread() {
  const storyRef = useRef<HTMLDivElement>(null)
  const cordRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const story = storyRef.current
    const cord = cordRef.current
    const path = pathRef.current
    if (!story || !cord || !path) return
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const touchReading = window.matchMedia('(pointer: coarse)').matches
    let frames: { x: number; top: number; bottom: number }[] = []
    let width = 1
    let visible = false
    let raf = 0
    let previousTime = 0
    let previousScroll = window.scrollY
    let scrollVelocity = 0
    let scrollAt = performance.now()
    let accumulator = 0
    const ropes = storyPhotos.slice(1).map(() => ({
      x: new Float32Array(POINTS), y: new Float32Array(POINTS),
      dx: new Float32Array(POINTS), dy: new Float32Array(POINTS),
      px: new Float32Array(POINTS), py: new Float32Array(POINTS),
      sx: new Float32Array(POINTS), sy: new Float32Array(POINTS),
      vx: new Float32Array(POINTS), vy: new Float32Array(POINTS),
    }))

    const draw = () => {
      if (!frames.length) return
      let d = `M ${frames[0].x} 0 L ${frames[0].x} ${frames[0].top}`
      frames.forEach((frame, i) => {
        d += ` L ${frame.x} ${frame.bottom - 36}`
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
        d += ` L ${next.x} ${next.top}`
      })
      path.setAttribute('d', d)
    }

    const measure = () => {
      const bounds = story.getBoundingClientRect()
      width = bounds.width
      frames = Array.from(story.querySelectorAll<HTMLElement>('[data-thread-photo]'))
        .map((el) => {
          const rect = el.getBoundingClientRect()
          return { x: rect.left - bounds.left + rect.width / 2, top: rect.top - bounds.top, bottom: rect.bottom - bounds.top }
        })
      frames.slice(0, -1).forEach((frame, i) => {
        const next = frames[i + 1]
        const edge = i % 2 === 0 ? width - 12 : 12
        const start = frame.bottom + 20
        const end = next.top - 118
        const span = end - start
        for (let j = 0; j < POINTS; j++) {
          const part = Math.min(2, Math.floor(j / 24))
          const t = j / 24 - part
          const rope = ropes[i]
          if (part === 0) {
            rope.x[j] = cubic(frame.x, frame.x, edge, edge, t)
            rope.y[j] = cubic(frame.bottom - 36, frame.bottom + 8, frame.bottom - 28, start, t)
          } else if (part === 1) {
            rope.x[j] = edge
            rope.y[j] = cubic(start, start + span * 0.34, end - span * 0.34, end, t)
          } else {
            rope.x[j] = cubic(edge, edge, next.x, next.x, t)
            rope.y[j] = cubic(end, next.top - 44, next.top - 78, next.top, t)
          }
        }
      })
      cord.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`)
      draw()
    }

    const step = (time: number) => {
      const f = FEEL.thread
      const whip = Math.max(-70, Math.min(70, scrollVelocity)) * (touchReading ? 0.012 : 0.06)
      const amplitude = 8 + Math.min(touchReading ? 12 : 30, Math.abs(scrollVelocity) * (touchReading ? 0.65 : 1.5))
      ropes.forEach((rope, i) => {
        rope.sx.set(rope.dx)
        rope.sy.set(rope.dy)
        for (let j = 0; j < POINTS; j++) {
          rope.vx[j] = rope.dx[j] - rope.px[j]
          rope.vy[j] = rope.dy[j] - rope.py[j]
        }
        for (let j = 1; j < POINTS - 1; j++) {
          const u = j / (POINTS - 1)
          const arm = Math.max(0, (j - 48) / 24)
          const envelope = Math.sin(arm * Math.PI)
          const phase = window.scrollY * (touchReading ? 0.006 : 0.018) + time * 0.0005 + i * 1.3
          const targetY = Math.sin(phase + arm * Math.PI * 2) * amplitude * envelope
          const targetX = Math.sin(phase + u * Math.PI * 3) * 9 * Math.sin(u * Math.PI)
          const dx = rope.sx[j]
          const dy = rope.sy[j]
          const fx = (targetX - dx) * f.stiffness
            + (rope.sx[j - 1] + rope.sx[j + 1] - 2 * dx) * f.tension
            + (rope.vx[j - 1] + rope.vx[j + 1] - 2 * rope.vx[j]) * f.viscosity
          const fy = (targetY - dy) * f.stiffness
            + (rope.sy[j - 1] + rope.sy[j + 1] - 2 * dy) * f.tension
            + (rope.vy[j - 1] + rope.vy[j + 1] - 2 * rope.vy[j]) * f.viscosity
            - whip * Math.sin(u * Math.PI) * (0.25 + envelope * 0.75)
          rope.px[j] = dx
          rope.py[j] = dy
          rope.dx[j] = Math.max(-10, Math.min(10, dx + rope.vx[j] * f.damping + fx))
          const travel = j < 24 ? 8 : j < 48 ? 18 : 48 * envelope
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
      if (motionPreference.matches) {
        ropes.forEach(rope => {
          rope.dx.fill(0); rope.dy.fill(0); rope.px.fill(0); rope.py.fill(0)
        })
        draw()
      } else if (visible) {
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
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      motionPreference.removeEventListener('change', syncMotion)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <section className="chapter thread" data-chapter="thread" aria-labelledby="thread-title">
      <header className="thread__head">
        <p className="index">{thread.index}</p>
        <h2 className="lead" id="thread-title">{thread.lead}</h2>
        <p className="body legend">{thread.body}</p>
      </header>
      <div className="thread__story" ref={storyRef}>
        <svg className="thread__cord" ref={cordRef} aria-hidden="true">
          <path ref={pathRef} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        {storyPhotos.map((photo, i) => (
          <article className="thread__moment" key={photo.src}>
            <figure className="thread__photo" data-thread-photo>
              <span className="thread__pin" aria-hidden="true" />
              <img src={photo.src} width={960} height={1200} alt={photo.alt} loading="lazy" decoding="async" />
            </figure>
            {i === 0 ? (
              <p className="aside thread__aside">{thread.aside}</p>
            ) : (
              <div className="pair">
                <p className="voice voice--a">
                  <span className="voice__who">{couple.a.voice}</span>
                  {thread.pairs[i - 1].a}
                </p>
                <p className="voice voice--b">
                  <span className="voice__who">{couple.b.voice}</span>
                  {thread.pairs[i - 1].b}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
