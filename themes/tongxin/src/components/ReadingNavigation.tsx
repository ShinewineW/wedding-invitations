import { useEffect, useRef, useState } from 'react'
import { useStage } from '../line/stageApi'
import './ReadingNavigation.css'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const bottom = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
const screensPerSecond = 5.4

/** Screen-sized steps and touch scrolling share one clock, so they cannot race. */
export function ReadingNavigation() {
  const { reduced } = useStage()
  const [atEnd, setAtEnd] = useState(false)
  const [moving, setMoving] = useState(false)
  const nextRef = useRef<() => void>(() => {})

  useEffect(() => {
    let raf = 0
    let lastFrame = 0
    let target: number | null = null
    let scrollDirection = 0
    let tween: { from: number; to: number; start: number; duration: number } | null = null
    let touch: { id: number; y: number; time: number; velocity: number; direction: number; reverse: number; handle: HTMLElement | null } | null = null

    const updateEnd = () => setAtEnd(bottom() - window.scrollY <= 2)
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
      target = null
      tween = null
      touch = null
      scrollDirection = 0
      setMoving(false)
    }
    const tick = (now: number) => {
      // A queued RAF can carry a timestamp earlier than the input handler that
      // started us in that frame. Negative elapsed time would reverse the step.
      const dt = clamp((now - lastFrame) / 1000, 0, 0.032)
      lastFrame = now
      if (tween) {
        const progress = clamp((now - tween.start) / tween.duration, 0, 1)
        const eased = (1 - Math.cos(progress * Math.PI)) / 2
        window.scrollTo({ top: clamp(tween.from + (tween.to - tween.from) * eased, 0, bottom()), behavior: 'instant' })
        if (progress >= 1) {
          stop()
          updateEnd()
          return
        }
      } else if (target !== null) {
        target = clamp(target, 0, bottom())
        const position = window.scrollY
        // Browser anchoring or a native move must never be undone by an old target.
        if ((target - position) * scrollDirection < 0) target = position
        const difference = target - position
        if (Math.abs(difference) < 1) {
          raf = 0
          updateEnd()
          return
        }
        // No native fling runs alongside this: actual document movement is
        // limited to 5.4 screens/second, including the short release glide.
        const maxStep = window.innerHeight * screensPerSecond * dt
        const step = clamp(difference * Math.min(1, dt * 28), -maxStep, maxStep)
        window.scrollTo({ top: position + step, behavior: 'instant' })
      } else {
        raf = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (raf) return
      lastFrame = performance.now()
      raf = requestAnimationFrame(tick)
    }

    nextRef.current = () => {
      if (tween) return // Repeated taps do not queue up skipped screens.
      const max = bottom()
      const from = window.scrollY
      stop()
      if (max - from <= 2) {
        window.scrollTo({ top: 0, behavior: 'instant' })
        updateEnd()
        return
      }
      const to = Math.min(max, from + window.innerHeight * 0.88)
      if (reduced) {
        window.scrollTo({ top: to, behavior: 'instant' })
        updateEnd()
        return
      }
      tween = {
        from, to, start: performance.now(),
        duration: Math.max(200, (to - from) / (window.innerHeight * screensPerSecond) * Math.PI / 2 * 1000),
      }
      setMoving(true)
      start()
    }

    const onTouchStart = (event: TouchEvent) => {
      const element = event.target as HTMLElement | null
      if (element?.closest('[data-reading-nav]')) return
      stop()
      // The helix owns only its narrow strip; leaving it resumes page scrolling.
      if (event.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1.01
        || element?.closest('a, button, input, textarea, select')) return
      const finger = event.touches[0]
      const handle = element?.closest<HTMLElement>('[data-pull-handle]') ?? null
      touch = { id: finger.identifier, y: finger.clientY, time: event.timeStamp, velocity: 0, direction: 0, reverse: 0, handle }
      target = handle ? null : window.scrollY
    }
    const onTouchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return
      const finger = Array.from(event.touches).find(item => item.identifier === touch?.id)
      if (!finger) return
      // If the browser has taken this gesture, do not pull it back with scrollTo.
      if (!event.cancelable) { stop(); return }
      event.preventDefault()
      if (touch.handle) {
        const r = touch.handle.getBoundingClientRect()
        if (finger.clientX >= r.left && finger.clientX <= r.right && finger.clientY >= r.top && finger.clientY <= r.bottom) {
          touch.y = finger.clientY
          touch.time = event.timeStamp
          return
        }
        touch.y = clamp(finger.clientY, r.top, r.bottom)
        touch.handle = null
        target = window.scrollY
      }
      let delta = touch.y - finger.clientY
      const elapsed = Math.max(8, event.timeStamp - touch.time)
      const direction = Math.sign(delta)
      touch.y = finger.clientY
      touch.time = event.timeStamp
      if (!direction) return
      if (touch.direction && direction !== touch.direction) {
        touch.reverse += delta
        // Ignore the small finger recoil just before lift-off. A deliberate
        // reversal still works once it travels twelve pixels in the new direction.
        if (Math.abs(touch.reverse) < 12) return
        delta = touch.reverse
        target = window.scrollY
      }
      touch.reverse = 0
      const pending = window.innerHeight * 2.1
      target = clamp((target ?? window.scrollY) + delta, Math.max(0, window.scrollY - pending), Math.min(bottom(), window.scrollY + pending))
      touch.velocity = clamp(delta / elapsed * 1000, -window.innerHeight * screensPerSecond, window.innerHeight * screensPerSecond)
      touch.direction = direction
      scrollDirection = direction
      start()
    }
    const onTouchEnd = (event: TouchEvent) => {
      if (!touch) return
      if (event.touches.length) { stop(); return }
      if (touch.handle) { stop(); return }
      const velocity = event.timeStamp - touch.time < 100 && touch.reverse === 0 ? touch.velocity : 0
      if (!reduced && target !== null) {
        target = clamp(target + velocity * 0.1, 0, bottom())
      }
      touch = null
      start()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stop()
    }

    updateEnd()
    window.addEventListener('scroll', updateEnd, { passive: true })
    window.addEventListener('resize', stop)
    window.addEventListener('resize', updateEnd)
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('hashchange', stop)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', stop, { passive: true })
    const observer = new ResizeObserver(updateEnd)
    observer.observe(document.body)
    return () => {
      stop()
      observer.disconnect()
      window.removeEventListener('scroll', updateEnd)
      window.removeEventListener('resize', stop)
      window.removeEventListener('resize', updateEnd)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('hashchange', stop)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', stop)
    }
  }, [reduced])

  return (
    <button className="reading-nav" data-reading-nav data-direction={atEnd ? 'up' : 'down'}
      aria-label={atEnd ? '回到顶部' : '向下阅读一屏'} aria-disabled={moving}
      onClick={() => nextRef.current()}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v15M5.5 12.5 12 19l6.5-6.5" />
      </svg>
      <span className="visually-hidden">{atEnd ? '回到顶部' : '向下阅读一屏'}</span>
    </button>
  )
}
