/**
 * Drawing helpers for the strand. Pure functions over typed arrays: no state,
 * no knowledge of chapters, so the simulation and the ink stay separable.
 */

import { smoothstep } from './shapes'

/**
 * The silk, by day and by night. Two values of one red rather than two colours:
 * together they read as a single cord with a lit side and a shaded side, which is
 * what makes the knot legible. On the night page the thread is the brightest
 * thing there is, so it carries more light.
 */
const SILK = {
  day: [
    [0xba, 0x40, 0x29],
    [0x7a, 0x24, 0x18],
  ],
  night: [
    [0xf4, 0x64, 0x3f],
    [0xb0, 0x38, 0x22],
  ],
} as const

const mixByte = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)

/** The two strand colours at a given darkness, 0 paper and 1 night. */
export function silk(night: number, opening = 0): [string, string] {
  const out: string[] = []
  for (let s = 0; s < 2; s++) {
    const d = SILK.day[s]
    const n = SILK.night[s]
    const red = s === 0 ? [230, 0, 18] : [206, 0, 17]
    out.push(`rgb(${d.map((value, channel) => mixByte(mixByte(value, n[channel], night), red[channel], opening)).join(',')})`)
  }
  return [out[0], out[1]]
}

export interface RibbonOpts {
  from: number
  to: number
  alpha: number
  color: string
  /** a narrow shaded edge separates the upper cord at a woven crossing */
  lifted?: boolean
}

/**
 * Trace one strand as a filled outline rather than a stroke, so the weight can
 * vary along its length. Width comes from the caller (speed, curvature, depth),
 * which is what gives the line the feel of a loaded brush instead of a CSS border.
 */
export function ribbon(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  ws: Float32Array,
  o: RibbonOpts,
) {
  const { from, to } = o
  if (to - from < 2) return
  ctx.beginPath()
  // forward along the left offset
  for (let i = from; i <= to; i++) {
    normalAt(xs, ys, i, from, to)
    const nx = nrm.x
    const ny = nrm.y
    const hw = ws[i] * 0.5
    const x = xs[i] + nx * hw
    const y = ys[i] + ny * hw
    if (i === from) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  // back along the right offset
  for (let i = to; i >= from; i--) {
    normalAt(xs, ys, i, from, to)
    const nx = nrm.x
    const ny = nrm.y
    const hw = ws[i] * 0.5
    ctx.lineTo(xs[i] - nx * hw, ys[i] - ny * hw)
  }
  ctx.closePath()
  ctx.globalAlpha = o.alpha
  ctx.fillStyle = o.color
  if (o.lifted) {
    ctx.lineWidth = 2.4
    ctx.strokeStyle = 'rgba(20, 8, 3, 0.72)'
    ctx.stroke()
  }
  ctx.fill()
  ctx.globalAlpha = 1
}

/** A whole strand in one smooth, round stroke, with no depth-run seams. */
export function cord(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  width: number,
  color: string,
  alpha: number,
) {
  const n = xs.length
  if (n < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(xs[0], ys[0])
  for (let i = 1; i < n - 1; i++) {
    ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) * 0.5, (ys[i] + ys[i + 1]) * 0.5)
  }
  ctx.lineTo(xs[n - 1], ys[n - 1])
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha
  ctx.stroke()
  ctx.restore()
}

/**
 * Unit normal of the polyline at i, using the neighbours that exist. Written into
 * a shared pair rather than returned, because this runs a few hundred times per
 * frame and a fresh array each time is pure garbage.
 */
const nrm = { x: 0, y: 0 }
function normalAt(xs: Float32Array, ys: Float32Array, i: number, from: number, to: number) {
  const a = i > from ? i - 1 : i
  const b = i < to ? i + 1 : i
  const dx = xs[b] - xs[a]
  const dy = ys[b] - ys[a]
  const len = Math.hypot(dx, dy) || 1
  nrm.x = -dy / len
  nrm.y = dx / len
}

/** Contiguous spans of one sign of depth, so a twisted cord can occlude itself. */
export interface Run {
  from: number
  to: number
  depth: number
}

export function depthRuns(ds: Float32Array, n: number): Run[] {
  const runs: Run[] = []
  let start = 0
  let sign = ds[0] >= 0 ? 1 : -1
  let acc = 0
  for (let i = 0; i < n; i++) {
    const s = ds[i] >= 0 ? 1 : -1
    if (s !== sign && i - start > 1) {
      runs.push({ from: start, to: i, depth: acc / (i - start) })
      start = i - 1
      acc = 0
      sign = s
    }
    acc += ds[i]
  }
  runs.push({ from: start, to: n - 1, depth: acc / Math.max(1, n - start) })
  return runs
}

/** Cover-fit an image into its measured photo box, the canvas equivalent of object-fit: cover. */
export function coverRect(iw: number, ih: number, w: number, h: number) {
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh }
}

/** A local window through one strand; width follows the visitor's brush. */
export function clipBand(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  widths: Float32Array,
  n: number,
) {
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    normalAt(xs, ys, i, 0, n - 1)
    const half = widths[i] * 0.5
    const x = xs[i] + nrm.x * half
    const y = ys[i] + nrm.y * half
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let i = n - 1; i >= 0; i--) {
    normalAt(xs, ys, i, 0, n - 1)
    const half = widths[i] * 0.5
    ctx.lineTo(xs[i] - nrm.x * half, ys[i] - nrm.y * half)
  }
  ctx.closePath()
}

/** Weight envelope that fades a strand out at its two ends. */
export function taper(u: number, amount: number) {
  if (amount <= 0) return 1
  const e = smoothstep(0, 0.06, u) * smoothstep(0, 0.06, 1 - u)
  return 1 - amount + amount * e
}
