/**
 * The thread. Two ends of one length of silk, each a chain of point masses
 * integrated with Verlet, pulled toward a per-chapter target shape and coupled to
 * their own neighbours so that a pull travels along the thread as a real wave
 * rather than a keyframed wobble.
 *
 * Pointer forces move the silk; a separate warmth field controls its visibility.
 * Hovering finds the thread without disturbing it, while presses and taps send
 * physical waves along it. Reading the page itself only requires scrolling.
 *
 * The engine owns no React state. It is driven by a getter the host supplies each
 * frame, which keeps scrolling at 60fps free of re-renders.
 */

import {
  FEEL,
  SHAPES,
  blendFeel,
  clamp,
  lerp,
  pullTouchBox,
  smoothstep,
  type ChapterId,
  type Pt,
  type ShapeCtx,
  type ViewBox,
} from './shapes'
import { clipBand, cord, coverRect, ribbon, silk, taper } from './render'

export interface DriverState {
  chapter: ChapterId
  threadAnchor: { x: number; y: number; edge: 'entry' | 'exit' }
  threadPinned: boolean
  next: ChapterId
  /** cross-fade between chapter and next, 0..1 */
  blend: number
  /** progress within `chapter`, 0..1 */
  p: number
  /** viewport y of the active schedule row */
  railY: number
  /** actual DOM photo and knot boxes in viewport pixels */
  pullBox: ViewBox
  knotBox: ViewBox
  /** viewport centre of the invitation the closing ring should encircle */
  ringX: number
  ringY: number
  /** the DOM photo story owns its own connecting thread in chapter I */
  inkOpacity: number
  clipTop: number
  clipBottom: number
  masks: ViewBox[]
  /** chapter presence of the hidden photograph and its two silk windows */
  pullOpacity: number
  /** radius the closed ring needs in order to contain that element */
  ringR: number
  /** viewport y of each name's baseline in the overture */
  nameY: [number, number]
  nameSag: [number, number]
  /** viewport y of the voice each strand is answering in chapter Two */
  voiceY: [number, number]
  /** how squarely that voice sits in the reading position, 0..1 */
  voiceOn: [number, number]
  /** px per frame of recent scrolling, signed */
  scrollVel: number
  /** how dark the page is, 0 paper and 1 night */
  night: number
  /** how visible the thread is when nobody is touching it, 0..1 */
  vis: number
}

/** How much each chapter wants its strand ends drawn as ends rather than run-offs. */
const TAPER: Record<ChapterId, number> = {
  overture: 0,
  thread: 0,
  pull: 0,
  tie: 0,
  day: 1,
  ring: 0,
  heart: 0,
  end: 0,
}

interface Impulse {
  x: number
  y: number
  power: number
  life: number
}

const SUB_DT = 1 / 120

export class LineEngine {
  private cv: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private getDriver: () => DriverState
  reduced: boolean
  private coarse: boolean

  private n = 0
  private x: Float32Array[] = []
  private y: Float32Array[] = []
  private px: Float32Array[] = []
  private py: Float32Array[] = []
  private tx: Float32Array[] = []
  private ty: Float32Array[] = []
  private td: Float32Array[] = []
  private tk: Float32Array[] = []
  private poke: Float32Array[] = []
  private warm: Float32Array[] = []
  private wid: Float32Array[] = []
  /** snapshot of positions at the top of a substep, so forces are computed from
      one consistent state instead of half-updated neighbours */
  private sx: Float32Array[] = []
  private sy: Float32Array[] = []
  private svx: Float32Array[] = []
  private svy: Float32Array[] = []
  private photoBandWidth: Float32Array[] = []
  private photoThreadWidth: Float32Array[] = []
  private photoWarm: Float32Array[] = []
  private frameDt = 1 / 60

  private w = 0
  private h = 0
  private dpr = 1
  private t = 0
  private acc = 0
  private seeded = false

  private ptr = { x: 0, y: 0, vx: 0, vy: 0, active: false, down: false }
  private impulses: Impulse[] = []

  private photo: HTMLImageElement | null = null

  private tmpA: Pt = { x: 0, y: 0, d: 0, k: 0 }
  private tmpB: Pt = { x: 0, y: 0, d: 0, k: 0 }

  /** true once the visitor has uncovered enough of the thread to have found it */
  found = false

  constructor(canvas: HTMLCanvasElement, getDriver: () => DriverState, reduced: boolean, coarse: boolean) {
    this.cv = canvas
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('2d canvas context unavailable')
    this.ctx = ctx
    this.getDriver = getDriver
    this.reduced = reduced
    this.coarse = coarse
  }

  /** Resolution scales with viewport so phones simulate fewer points than desktops. */
  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (w === this.w && h === this.h && dpr === this.dpr && this.seeded) return
    this.w = w
    this.h = h
    this.dpr = dpr
    this.cv.width = Math.round(w * this.dpr)
    this.cv.height = Math.round(h * this.dpr)
    this.cv.style.width = `${w}px`
    this.cv.style.height = `${h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    const n = Math.round(clamp(w / 6.5, 96, 240))
    if (n !== this.n) {
      this.n = n
      const mk = () => [new Float32Array(n), new Float32Array(n)]
      ;[
        this.x, this.y, this.px, this.py,
        this.tx, this.ty, this.td, this.tk, this.poke, this.warm,
        this.wid, this.sx, this.sy, this.svx, this.svy,
      ] = [mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk()]
      this.photoBandWidth = mk()
      this.photoThreadWidth = mk()
      this.photoWarm = mk()
      this.seeded = false
    }
    this.updateTargets()
    this.seed()
    this.draw()
  }

  /** Start exactly at the measured geometry, with no offscreen spring launch. */
  private seed() {
    for (let s = 0; s < 2; s++) {
      this.x[s].set(this.tx[s]); this.px[s].set(this.tx[s])
      this.y[s].set(this.ty[s]); this.py[s].set(this.ty[s])
      this.warm[s].fill(this.getDriver().vis)
      this.poke[s].fill(0)
    }
    this.acc = 0
    this.impulses.length = 0
    this.seeded = true
  }

  /** Carry layout and scroll displacement while retaining only the silk's local wave. */
  private followTargets() {
    for (let s = 0; s < 2; s++) {
      this.sx[s].set(this.tx[s]); this.sy[s].set(this.ty[s])
    }
    this.updateTargets()
    let travel = 0
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < this.n; i++) {
        const dx = this.tx[s][i] - this.sx[s][i]
        const dy = this.ty[s][i] - this.sy[s][i]
        travel = Math.max(travel, Math.abs(dx), Math.abs(dy))
        this.x[s][i] += dx; this.px[s][i] += dx
        this.y[s][i] += dy; this.py[s][i] += dy
      }
    }
    if (travel > Math.max(160, this.h * .45)) this.seed()
  }

  setPhoto(img: HTMLImageElement) {
    this.photo = img
  }

  pointer(x: number, y: number) {
    if (this.reduced) return
    this.ptr.vx = x - this.ptr.x
    this.ptr.vy = y - this.ptr.y
    this.ptr.x = x
    this.ptr.y = y
    this.ptr.active = true
  }

  pointerOut() {
    this.ptr.active = false
    this.ptr.down = false
  }

  press(down: boolean) {
    if (this.reduced) return
    this.ptr.down = down
  }

  /**
   * A discrete strike for an optional tap on the silk. Finds the point
   * on either strand nearest the given spot and pushes it away from the strike.
   */
  pluck(x: number, y: number, power = 1) {
    if (this.reduced || this.n < 3) return
    let bx = x
    let by = y
    let bestD = Infinity
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < this.n; i += 2) {
        const d = Math.hypot(this.x[s][i] - x, this.y[s][i] - y)
        if (d < bestD) {
          bestD = d
          bx = this.x[s][i]
          by = this.y[s][i]
        }
      }
    }
    this.impulses.push({ x: bx, y: by + (by < y ? -14 : 14), power: power * 24, life: 1 })
  }

  /** Viewport position of a normalised point on a strand, for anchoring DOM notes. */
  pointAt(u: number, s: number) {
    const i = clamp(Math.round(u * (this.n - 1)), 0, this.n - 1)
    return { x: this.x[s][i], y: this.y[s][i] }
  }

  /** Average the original pull field over a short span so a note appears gently. */
  disturbAt(u: number, s: number) {
    const i = clamp(Math.round(u * (this.n - 1)), 0, this.n - 1)
    const span = Math.max(2, Math.round(this.n * 0.03))
    let sum = 0
    let count = 0
    for (let k = i - span; k <= i + span; k++) {
      if (k < 0 || k >= this.n) continue
      sum += this.poke[s][k]
      count++
    }
    return count ? sum / count : 0
  }

  /** Keep the blurred background and sharp ribbons on the same face-aware crop. */
  photoPlacement(box: ViewBox) {
    const portrait = this.photo ? this.photo.naturalWidth < this.photo.naturalHeight : this.w <= 640 && this.h > this.w
    const faces = portrait ? [0.466, 0.279, 0.682, 0.244] : [0.403, 0.363, 0.548, 0.319]
    const fit = coverRect(this.photo?.naturalWidth || (portrait ? 4 : 3), this.photo?.naturalHeight || (portrait ? 5 : 2), box.w, box.h)
    fit.y = clamp(box.h * 0.47 - fit.h * (faces[1] + faces[3]) * 0.5, box.h - fit.h, 0)
    return { fit, faces }
  }

  private shapeContext(d: DriverState, p: number): ShapeCtx {
    return {
      w: this.w,
      h: this.h,
      coarse: this.coarse,
      threadAnchor: d.threadAnchor,
      t: this.t,
      p,
      railY: d.railY,
      pullBox: d.pullBox,
      knotBox: d.knotBox,
      ringX: d.ringX,
      ringY: d.ringY,
      ringR: d.ringR,
      nameY: d.nameY,
      nameSag: d.nameSag,
      voiceY: d.voiceY,
      voiceOn: d.voiceOn,
      still: this.reduced,
    }
  }

  private updateTargets() {
    const d = this.getDriver()
    const cA = this.shapeContext(d, d.p)
    const cB: ShapeCtx = { ...cA, p: d.chapter === 'tie' && d.next === 'heart' ? 1 : 0 }
    const A = SHAPES[d.chapter]
    const B = SHAPES[d.chapter === 'tie' && d.next === 'heart' ? 'tie' : d.next]
    const b = d.blend
    const inv = 1 / (this.n - 1)
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < this.n; i++) {
        const u = i * inv
        A(u, s, cA, this.tmpA)
        if (b > 0.001) {
          B(u, s, cB, this.tmpB)
          this.tx[s][i] = lerp(this.tmpA.x, this.tmpB.x, b)
          this.ty[s][i] = lerp(this.tmpA.y, this.tmpB.y, b)
          this.td[s][i] = lerp(this.tmpA.d, this.tmpB.d, b)
          this.tk[s][i] = lerp(this.tmpA.k, this.tmpB.k, b)
        } else {
          this.tx[s][i] = this.tmpA.x
          this.ty[s][i] = this.tmpA.y
          this.td[s][i] = this.tmpA.d
          this.tk[s][i] = this.tmpA.k
        }
        if (d.chapter === 'thread' && d.next === 'tie') {
          // The entering length stays beside the final letter and the knot's
          // headline. Only the empty knot box gives it room to spread sideways.
          const open = smoothstep(d.knotBox.y, d.knotBox.y + d.knotBox.h * (this.reduced ? .08 : .35), this.ty[s][i])
          this.tx[s][i] = lerp(d.threadAnchor.x, this.tx[s][i], open)
        }
      }
    }
  }

  private integrate() {
    const d = this.getDriver()
    const f = blendFeel(FEEL[d.chapter], FEEL[d.next], d.blend)
    const n = this.n
    const grabbed = this.ptr.down
    const R = grabbed ? 150 : 230
    const R2 = R * R
    const scrollWhip = clamp(d.scrollVel, -70, 70) * 0.06
    const vis = d.vis
    // Throwing the page about warms the whole thread a little, so a visitor who
    // only ever scrolls still sees it come up out of the paper.
    const wake = clamp(Math.abs(d.scrollVel) / 26, 0, 1) * 0.5

    for (let s = 0; s < 2; s++) {
      this.sx[s].set(this.x[s])
      this.sy[s].set(this.y[s])
      for (let i = 0; i < n; i++) {
        this.svx[s][i] = this.x[s][i] - this.px[s][i]
        this.svy[s][i] = this.y[s][i] - this.py[s][i]
      }
    }

    for (let s = 0; s < 2; s++) {
      const X = this.x[s]
      const Y = this.y[s]
      const PX = this.px[s]
      const PY = this.py[s]
      const TX = this.tx[s]
      const TY = this.ty[s]
      const POK = this.poke[s]
      const WRM = this.warm[s]
      const SX = this.sx[s]
      const SY = this.sy[s]
      const other = 1 - s
      const MVX = this.svx[s]
      const MVY = this.svy[s]
      const OVX = this.svx[other]
      const OVY = this.svy[other]

      for (let i = 0; i < n; i++) {
        const a = i > 0 ? i - 1 : 0
        const b = i < n - 1 ? i + 1 : n - 1
        const cx = X[i]
        const cy = Y[i]

        // The two ends are anchored: they hold their target hard and take no
        // neighbour term, because a one-sided Laplacian would drag them along the
        // strand and leave the closed ring with a seam where the two arcs meet.
        const anchored = i === 0 || i === n - 1
        const k = anchored ? f.stiffness * 5 : f.stiffness
        const tension = anchored ? 0 : f.tension

        let fx = (TX[i] - cx) * k
        let fy = (TY[i] - cy) * k

        // discrete Laplacian: this is what carries a pluck along the strand
        fx += ((SX[a] - TX[a]) + (SX[b] - TX[b]) - 2 * (cx - TX[i])) * tension
        fy += ((SY[a] - TY[a]) + (SY[b] - TY[b]) - 2 * (cy - TY[i])) * tension

        // Viscosity along the strand. A chapter change can sweep every point a
        // thousand pixels; without this the strand rings at its short modes and
        // the sweep reads as chatter instead of weight.
        if (!anchored) {
          const vi = f.viscosity
          fx += (MVX[a] + MVX[b] - 2 * MVX[i]) * vi
          fy += (MVY[a] + MVY[b] - 2 * MVY[i]) * vi
        }

        // Sympathetic vibration: the strands exchange motion, the way two strings
        // do through a shared bridge. Coupling velocity rather than displacement
        // keeps the exchange dissipative — coupling position drives the pair away.
        if (f.sympathy > 0) {
          fx += (OVX[i] - MVX[i]) * f.sympathy
          fy += (OVY[i] - MVY[i]) * f.sympathy
        }

        // Two verbs, kept strictly apart.
        //
        // A hand passing over the thread only makes it *visible*: warmth is
        // written, no force at all. A hand pressing on it *pulls*: it applies force.
        // This is why sweeping the cursor about cannot smear the thread around —
        // the only way to move it is to take hold of it.
        POK[i] *= 0.988
        WRM[i] += (vis - WRM[i]) * 0.006
        if (this.ptr.active) {
          const dx = this.ptr.x - cx
          const dy = this.ptr.y - cy
          const q = dx * dx + dy * dy
          if (q < R2) {
            // a band around the hand comes fully up, rather than a single bright
            // point with a long fade — finding the thread should feel like
            // uncovering an object, not like carrying a torch
            const g = Math.min(1, (1 - q / R2) * 2.4)
            if (WRM[i] < g) WRM[i] = g
            if (grabbed) {
              const pull = 0.055 * g * g
              fx += dx * pull
              fy += dy * pull
              fx += this.ptr.vx * 0.12 * g
              fy += this.ptr.vy * 0.12 * g
              POK[i] = Math.min(60, POK[i] + g * g * 0.7)
            }
          }
        }

        if (wake > WRM[i]) WRM[i] = wake

        // ends stay put; the middle lags when the page is thrown
        fy -= scrollWhip * Math.sin((i / (n - 1)) * Math.PI) * 0.5

        let vx = (cx - PX[i]) * f.damping
        let vy = (cy - PY[i]) * f.damping
        PX[i] = cx
        PY[i] = cy
        vx += fx
        vy += fy
        X[i] = cx + vx
        Y[i] = cy + vy
        // guard: a step this far out means the integrator has diverged, so drop
        // the point back onto its target rather than let the strand disappear
        if (!(Math.abs(X[i]) < 1e5) || !(Math.abs(Y[i]) < 1e5)) {
          X[i] = TX[i]
          Y[i] = TY[i]
          PX[i] = TX[i]
          PY[i] = TY[i]
        }


      }
    }

    for (let k = this.impulses.length - 1; k >= 0; k--) {
      const im = this.impulses[k]
      for (let s = 0; s < 2; s++) {
        for (let i = 0; i < n; i++) {
          const dx = this.x[s][i] - im.x
          const dy = this.y[s][i] - im.y
          const q = Math.exp(-(dx * dx + dy * dy) / 19000)
          if (q > 0.01) {
            this.y[s][i] += Math.sign(dy || 1) * im.power * q * im.life * 0.2
            this.poke[s][i] = Math.min(60, this.poke[s][i] + q * im.life * 12)
            if (q > this.warm[s][i]) this.warm[s][i] = q
          }
        }
      }
      im.life -= 0.22
      if (im.life <= 0) this.impulses.splice(k, 1)
    }

    this.ptr.vx *= 0.62
    this.ptr.vy *= 0.62
  }

  /** Advance the simulation with a fixed step so physics is frame-rate independent. */
  frame(dtMs: number) {
    const dt = Math.min(dtMs, 100) / 1000
    this.frameDt = dt
    this.t += dt
    this.followTargets()
    const driver = this.getDriver()
    // The visible fifth chapter follows its finished circle from the first frame.
    const completeRing = (driver.chapter === 'ring' || driver.next === 'ring')
      && driver.inkOpacity > .001 && driver.ringY + driver.ringR >= 0 && driver.ringY - driver.ringR <= this.h
    if (this.reduced || completeRing) {
      for (let s = 0; s < 2; s++) {
        this.x[s].set(this.tx[s])
        this.y[s].set(this.ty[s])
        this.px[s].set(this.tx[s])
        this.py[s].set(this.ty[s])
        this.poke[s].fill(0)
        this.warm[s].fill(1)
      }
    } else {
      this.acc = Math.min(this.acc + dt, 0.1)
      while (this.acc >= SUB_DT) {
        this.integrate()
        this.acc -= SUB_DT
      }
    }
    // The SVG owns these DOM pins. Pin both ends after physics so an impulse
    // cannot tear the visible Canvas/SVG junction apart.
    if (driver.chapter === 'thread' && driver.next === 'tie') {
      // Project the simulated positions as well as their targets: scroll inertia
      // and a pointer impulse must not swing this approach across the words.
      for (let s = 0; s < 2; s++) {
        for (let i = 0; i < this.n; i++) {
          const open = smoothstep(driver.knotBox.y, driver.knotBox.y + driver.knotBox.h * (this.reduced ? .08 : .35), this.y[s][i])
          const x = lerp(driver.threadAnchor.x, this.x[s][i], open)
          this.px[s][i] += x - this.x[s][i]
          this.x[s][i] = x
        }
      }
    }
    if (driver.threadPinned) {
      for (let s = 0; s < 2; s++) {
        const atEnd = driver.threadAnchor.edge === 'entry'
        const index = (s === 0) === atEnd ? this.n - 1 : 0
        this.x[s][index] = this.px[s][index] = driver.threadAnchor.x
        this.y[s][index] = this.py[s][index] = driver.threadAnchor.y
      }
    }
    this.draw()
  }

  /**
   * Widths for one pass along a strand.
   *
   * The thread is drawn twice: a constant hairline ghost that is always there, and
   * the found thread on top whose width is scaled by how warm each point is. Where
   * warmth is zero the second pass has no width at all, so the thread is genuinely
   * absent rather than merely faint — and it materialises in weight, not opacity,
   * which is what makes it feel like an object being uncovered.
   */
  private fillWidths(s: number, base: number, taperAmt: number, knotAmt: number, warmed: boolean) {
    const n = this.n
    const W = this.wid[s]
    const inv = 1 / (n - 1)
    for (let i = 0; i < n; i++) {
      const vx = this.x[s][i] - this.px[s][i]
      const vy = this.y[s][i] - this.py[s][i]
      const speed = clamp(Math.hypot(vx, vy) / 5, 0, 1)
      const depth = knotAmt > 0 ? lerp(1, 0.5 + 0.55 * ((this.td[s][i] + 1) / 2), knotAmt) : 1
      // silk bunches where it is knotted, the way a real cord thickens at the node
      const bunch = 1 + 1.3 * this.tk[s][i]
      let w = base * (0.72 + 0.5 * speed) * depth * bunch * taper(i * inv, taperAmt)
      w *= warmed ? this.warm[s][i] : 0.5
      W[i] = Math.max(0.05, w)
    }
    return W
  }

  private draw() {
    const ctx = this.ctx
    const d = this.getDriver()
    ctx.clearRect(0, 0, this.w, this.h)
    if (this.n < 3) return

    const f = blendFeel(FEEL[d.chapter], FEEL[d.next], d.blend)
    const taperAmt = lerp(TAPER[d.chapter], TAPER[d.next], d.blend)
    // depth shading arrives with the winding, so the loose opening of the chapter
    // still reads as the two ends it was a moment ago
    const ringPresent = d.chapter === 'ring' || d.next === 'ring'
    const knotAmt = d.chapter === 'tie' ? 1 : d.next === 'tie' ? d.blend : 0
    const inkOpacity = d.inkOpacity * (1 - d.pullOpacity)
    const colour = silk(d.night, d.chapter === 'overture' ? 1 - d.blend : 0)

    if (d.pullOpacity > 0.001 && d.pullBox.w > 0 && d.pullBox.h > 0) this.drawReveal()
    else for (const warmth of this.photoWarm) warmth.fill(0)

    // A departing invitation cannot leave its simulated ring trailing on the
    // footer. The unclamped target continues updating while this pass is hidden.
    if (d.chapter === 'ring' && (d.ringY + d.ringR < -8 || d.ringY - d.ringR > this.h + 8)) return
    if (inkOpacity <= 0.001) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, Math.max(0, d.clipTop), this.w, Math.max(0, Math.min(this.h, d.clipBottom) - Math.max(0, d.clipTop)))
    ctx.clip()
    // Text masks follow measured document boxes, including the photo introduction.
    for (const mask of d.masks) {
      if (mask.y + mask.h < 0 || mask.y > this.h) continue
      ctx.beginPath()
      ctx.rect(0, 0, this.w, this.h)
      ctx.rect(mask.x, mask.y, mask.w, mask.h)
      ctx.clip('evenodd')
    }
    if (d.chapter === 'overture') {
      cord(ctx, this.x[0], this.y[0], f.weight, colour[0], inkOpacity)
      if (!this.reduced) this.found = true
      ctx.restore()
      return
    }

    // The knot is two continuous cords of even weight, including its long tails.
    // A single stroke per strand avoids the block ends left by depth-run fills.
    if (knotAmt > 0.001 || ringPresent) {
      const weight = ringPresent ? FEEL.ring.weight : f.weight
      for (let s = 0; s < 2; s++) cord(ctx, this.x[s], this.y[s], weight, colour[s], inkOpacity)
      ctx.restore()
      return
    }

    // Pass one: the ghost, so the visitor can tell there is something to find.
    // Once the thread is solid it adds nothing, so the pass is skipped entirely.
    if (d.vis < 0.97) {
      const ghost = 0.12 + 0.1 * d.night
      for (let s = 0; s < 2; s++) {
        const W = this.fillWidths(s, f.weight, taperAmt, knotAmt, false)
        ribbon(ctx, this.x[s], this.y[s], W, { from: 0, to: this.n - 1, alpha: ghost * inkOpacity, color: colour[s] })
      }
    }

    // pass two: the thread as far as it has been uncovered
    for (let s = 0; s < 2; s++) this.fillWidths(s, f.weight, taperAmt, knotAmt, true)
    for (let s = 0; s < 2; s++) {
      ribbon(ctx, this.x[s], this.y[s], this.wid[s], {
        from: 0,
        to: this.n - 1,
        alpha: inkOpacity,
        color: colour[s],
      })
    }

    ctx.restore()

  }

  /** Local focus follows the crossing ribbons over the softly blurred backdrop. */
  private drawReveal() {
    const ctx = this.ctx
    const d = this.getDriver()
    const box = d.pullBox
    ctx.save()
    if (this.coarse) {
      const bounds = pullTouchBox(box, this.h, d.chapter === 'pull' ? d.p : 0)
      ctx.beginPath()
      ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h)
      ctx.clip()
    }
    const colours = silk(d.night)
    const maxWidth = clamp(box.w * 0.29, 76, 110)
    const reach = clamp(box.w * 0.32, 96, 170)
    const wake = clamp(Math.abs(d.scrollVel) / 18, 0, 1) * 0.2
    const brushing = this.ptr.active && this.ptr.down && this.ptr.x >= box.x - 20 && this.ptr.x <= box.x + box.w + 20
      && this.ptr.y >= box.y - 20 && this.ptr.y <= box.y + box.h + 20
    const img = this.photo
    const { fit, faces } = this.photoPlacement(box)
    const faceX = box.x + fit.x + fit.w * (faces[0] + faces[2]) * 0.5
    const peaks = [0, 0]

    for (let strand = 0; strand < 2; strand++) {
      let peak = 0
      for (let i = 0; i < this.n; i++) {
        const v = i / (this.n - 1)
        // The same physical points carry the ink, picture windows and words.
        const x = this.x[strand][i]
        const y = this.y[strand][i]

        // A light scroll hint is local to the faces. A brush opens a much wider
        // window and leaves a short-lived trace as the hand travels onward.
        const faceDistance = (x - faceX) / (box.w * 0.28)
        const hint = wake * Math.exp(-faceDistance * faceDistance)
        const distance = Math.hypot(x - this.ptr.x, (y - this.ptr.y) * 1.15) / reach
        const brush = brushing ? 1 - smoothstep(0.22, 1, distance) : 0
        const want = this.reduced ? 0.78 : Math.max(hint, brush, clamp(this.poke[strand][i] / 40, 0, 1))
        const prior = this.photoWarm[strand][i]
        const rate = want > prior ? 15 : 0.9
        const warmth = this.reduced ? want : prior + (want - prior) * (1 - Math.exp(-this.frameDt * rate))
        this.photoWarm[strand][i] = warmth
        const tip = smoothstep(0, 0.08, v) * smoothstep(0, 0.08, 1 - v)
        // Taper before a band reaches the image or box edge, rather than letting
        // a rectangular clip cut a hard corner through the moving window.
        const room = Math.max(0, 2 * Math.min(x - box.x, box.x + box.w - x,
          y - Math.max(box.y, box.y + fit.y), Math.min(box.y + box.h, box.y + fit.y + fit.h) - y))
        this.photoBandWidth[strand][i] = Math.min(maxWidth * smoothstep(0.025, 0.9, warmth) ** 0.6 * tip, room)
        this.photoThreadWidth[strand][i] = 1.8 + warmth * 1.8
        peak = Math.max(peak, warmth)
      }
      peaks[strand] = peak

      if (img?.complete && img.naturalWidth && peak > 0.025) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(box.x, box.y, box.w, box.h)
        ctx.clip()
        clipBand(ctx, this.x[strand], this.y[strand], this.photoBandWidth[strand], this.n)
        ctx.clip()
        ctx.globalAlpha = d.pullOpacity * Math.min(0.95, 0.12 + peak * 0.88)
        ctx.drawImage(img, box.x + fit.x, box.y + fit.y, fit.w, fit.h)
        ctx.restore()
      }
    }
    for (let strand = 0; strand < 2; strand++) {
      ribbon(ctx, this.x[strand], this.y[strand], this.photoThreadWidth[strand], {
        from: 0,
        to: this.n - 1,
        alpha: d.pullOpacity * (0.4 + peaks[strand] * 0.55),
        color: colours[strand],
      })
    }
    ctx.restore()
  }
}
