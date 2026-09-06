/**
 * Target geometry for the two ends of the thread, one function per chapter.
 *
 * Every shape maps a normalised position along a strand (u, 0..1) to a point in
 * viewport pixels, plus a depth in -1..1 for occlusion and a knot density that
 * tells the renderer where the silk is bunching. Chapters are cross-faded by
 * interpolating two shapes, which is what makes the thread survive a section
 * boundary instead of being cut and restarted.
 */

export type ChapterId = 'overture' | 'thread' | 'pull' | 'tie' | 'day' | 'ring' | 'heart' | 'end'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ShapeCtx {
  coarse: boolean
  threadAnchor: { x: number; y: number; edge: 'entry' | 'exit' }
  /** viewport width in CSS pixels */
  w: number
  /** viewport height in CSS pixels */
  h: number
  /** seconds since start, for idle drift */
  t: number
  /** progress through the chapter, 0..1 */
  p: number
  /** viewport y of the active schedule row */
  railY: number
  /** measured photo and knot boxes, in viewport CSS pixels */
  pullBox: ViewBox
  knotBox: ViewBox
  /** viewport centre of the invitation the closing ring should encircle */
  ringX: number
  ringY: number
  /** radius the closed ring needs in order to contain that element */
  ringR: number
  /** viewport y of the baseline each name sits on, in the overture */
  nameY: [number, number]
  nameSag: [number, number]
  /** viewport y of the line each voice is currently speaking, in chapter I */
  voiceY: [number, number]
  /** how squarely that voice sits in the reading position, 0..1 */
  voiceOn: [number, number]
  /** true when the simulation is frozen for prefers-reduced-motion */
  still: boolean
}

export interface Pt {
  x: number
  y: number
  d: number
  /** 0 outside the knot, 1 at its densest — the renderer thickens the silk here */
  k: number
}

export const TAU = Math.PI * 2
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a || 1), 0, 1)
  return t * t * (3 - 2 * t)
}
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Half-distance between the two vertical rules in chapter I.
 * The stylesheet derives the text column from the same expression
 * (`min(880px, 88vw)` wide), so type and drawing stay locked together.
 */
export const twoGap = (w: number) => Math.min(440, w * 0.44)

/** Radius of the actual invitation box, including its corners and breathing room. */
export const ringRadiusFor = (boxW: number, boxH: number) =>
  Math.hypot(boxW, boxH) * 0.5 + 18

/** Phones keep the helix by the faces, at one third of its desktop amplitude. */
export const pullAmplitude = (h: number, p: number, coarse: boolean) =>
  h * lerp(0.05, 0.1, easeInOut(p)) / (coarse ? 3 : 1)

export const pullAxis = (box: ViewBox, coarse: boolean) => box.y + box.h * (coarse ? 0.3 : 0.47)

/** Only the coil itself plus one coil-height above and below owns a touch. */
export function pullTouchBox(box: ViewBox, h: number, p: number): ViewBox {
  const height = (pullAmplitude(h, p, true) * 2 + 4) * 3
  return { x: box.x, y: pullAxis(box, true) - height * 0.5, w: box.w, h: height }
}

type ShapeFn = (u: number, s: number, c: ShapeCtx, out: Pt) => void

/**
 * Strand B is drawn from the far end, so the two ends of the thread enter the page
 * from opposite edges. Every shape must agree on this mapping: if one chapter runs
 * a strand left-to-right and the next runs it right-to-left, the cross-fade drags
 * every point through the middle of the screen and the strand collapses.
 */
const dir = (u: number, s: number) => (s === 0 ? u : 1 - u)

/**
 * Overture — one calm length of silk below the complete name box.
 *
 * The sag follows the measured name baseline. Phones leave room beneath the
 * lettering and flatten the curve so it cannot rise through the outer glyphs.
 */
const overture: ShapeFn = (u, s, c, out) => {
  const v = dir(u, s)
  out.x = lerp(-0.08 * c.w, 1.08 * c.w, v)
  const slack = c.nameSag[0] * lerp(1, .7, easeInOut(c.p))
  const hang = slack * (1 - Math.sin(clamp(v, 0, 1) * Math.PI))
  const breath = c.still ? 0 : Math.sin(v * TAU * 0.9 + c.t * 0.28) * 1.4
  out.y = c.nameY[0] + slack - hang + breath
  out.d = 0
  out.k = 0
}

/**
 * Chapter I — the two ends stand upright on separate pages.
 *
 * Each rule belongs to one of them, so it bows toward its own voice as that line
 * comes into the reading position. Because the two columns are staggered, the two
 * rules lean in turn: the chapter's call and response is drawn as well as set.
 */
const chapterThread: ShapeFn = (u, s, c, out) => {
  const v = dir(u, s)
  const anchor = c.threadAnchor
  out.x = anchor.x
  out.y = anchor.edge === 'entry'
    ? lerp(Math.min(-0.12 * c.h, anchor.y - c.h), anchor.y, v)
    : lerp(anchor.y, Math.max(1.12 * c.h, anchor.y + c.h), v)
  out.d = 0
  out.k = 0
}

/**
 * Chapter II — the original long, horizontal pair of waves. Scroll takes up
 * their slack and adds a turn. On phones the photo supplies the width, and the
 * smaller wave stays within the narrow touch strip by the faces.
 */
const pull: ShapeFn = (u, s, c, out) => {
  const v = dir(u, s)
  out.x = c.coarse ? c.pullBox.x + c.pullBox.w * v : lerp(-0.06 * c.w, 1.06 * c.w, v)
  const amp = pullAmplitude(c.h, c.p, c.coarse)
  const k = lerp(1.6, 2.6, c.p)
  const phase = c.still ? 0 : c.t * 0.5
  const env = Math.sin(clamp(v, 0, 1) * Math.PI) ** 0.55
  out.y = pullAxis(c.pullBox, c.coarse)
    + Math.sin(v * TAU * k + phase + s * Math.PI) * amp * env
  out.d = 0
  out.k = 0
}

/**
 * One diagonal pair of long, relaxed knot loops. Shared Catmull-Rom tangents at
 * every waypoint make both the lobe joins and entry/exit C1-continuous. The outer
 * four waypoints are replaced with box-wide tails when the shape is evaluated.
 */
const KNOT_POINTS = [
  [-2.8, 0.28], [-1.9, 0.34], [-1.15, 0.18], [-0.32, -0.24],
  [-0.43, -0.89], [-0.93, -1.04], [-1.16, -0.53], [-0.51, -0.11],
  [0, 0],
  [0.51, 0.11], [1.16, 0.53], [0.93, 1.04], [0.43, 0.89],
  [0.32, 0.24], [1.15, -0.18], [1.9, -0.34], [2.8, -0.28],
] as const

function knotX(index: number, extent: number) {
  if (index === 0) return -extent
  if (index === 1) return -(extent + 1.15) * 0.5
  if (index === 15) return (extent + 1.15) * 0.5
  if (index === 16) return extent
  return KNOT_POINTS[index][0]
}

const catmull = (a: number, b: number, c: number, d: number, t: number) =>
  b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))

/**
 * Chapter III — the continuous silk gathers into a symmetric Chinese-inspired
 * knot. Its compact woven core leaves long, lightly bowed tails spanning the
 * whole DOM box, so it remains a length of cord rather than an isolated emblem.
 */
const tie: ShapeFn = (u, s, c, out) => {
  const v = dir(u, s)
  const e = smoothstep(.12, .72, c.p)
  const box = c.knotBox
  const cx = box.x + box.w * 0.5
  const cy = box.y + box.h * 0.5
  const scale = Math.min(box.w * 0.2, box.h * 0.4)
  const extent = (box.w * 0.495) / (scale || 1)
  const piece = Math.min(15, Math.floor(v * 16))
  const q = v * 16 - piece
  const a = Math.max(0, piece - 1)
  const b = piece
  const next = piece + 1
  const d = Math.min(16, piece + 2)
  const x = catmull(knotX(a, extent), knotX(b, extent), knotX(next, extent), knotX(d, extent), q)
  const y = catmull(KNOT_POINTS[a][1], KNOT_POINTS[b][1], KNOT_POINTS[next][1], KNOT_POINTS[d][1], q)
  const side = s === 0 ? 1 : -1
  out.x = lerp(box.x + box.w * (0.005 + 0.99 * v), cx + x * scale, e)
  out.y = lerp(cy, cy + side * y * scale, e)
  out.d = Math.cos(v * TAU * 2) * side * e
  out.k = e * smoothstep(0.14, 0.3, v) * smoothstep(0.14, 0.3, 1 - v)
}

/**
 * Chapter IV — one taut rail with the sag of a real thread, parked on the active
 * row. Its actual rule position is allowed to leave the viewport with the row;
 * clamping it to the screen would park a stray rail across unrelated text.
 */
const day: ShapeFn = (u, s, c, out) => {
  const v = dir(u, s)
  const half = Math.min(c.w * 0.44, 440)
  out.x = c.w * 0.5 + (v - 0.5) * half * 2
  const sag = Math.sin(clamp(v, 0, 1) * Math.PI) * 7
  out.y = c.railY + sag + (s === 0 ? -1.1 : 1.1)
  out.d = 0
  out.k = 0
}

/** Chapter V arrives complete and stays anchored around its invitation. */
const ring: ShapeFn = (u, s, c, out) => {
  const angle = Math.PI * (dir(u, s) - .5)
  out.x = c.ringX + c.ringR * Math.sin(angle)
  out.y = c.ringY + (s === 0 ? 1 : -1) * c.ringR * Math.cos(angle)
  out.d = 0
  out.k = 0
}

export const SHAPES: Record<ChapterId, ShapeFn> = {
  overture,
  thread: chapterThread,
  pull,
  tie,
  day,
  ring,
  heart: ring,
  end: ring,
}

/**
 * How dark the page is during each chapter, 0 paper and 1 night. Yue Lao works at
 * night, so the chapter in which he ties the knot is the one that inverts; the
 * chapter before it carries a little dusk so the change is arrived at, not sprung.
 */
export const NIGHT: Record<ChapterId, number> = {
  overture: 0,
  thread: 0,
  pull: 0.07,
  tie: 1,
  day: 0,
  ring: 0,
  heart: 0,
  end: 0,
}

/**
 * How visible the thread is when nobody is touching it. It starts all but
 * invisible — that is the story — and becomes a solid object once it has been
 * found, tied and made into a ring.
 */
export const VISIBILITY: Record<ChapterId, number> = {
  overture: 0.9,
  thread: 0.4,
  pull: 0.72,
  tie: 1,
  day: 1,
  ring: 1,
  heart: 0,
  end: 0,
}

/** Per-chapter feel of the silk itself: how eagerly it recovers, and how it rings. */
export interface Feel {
  stiffness: number
  damping: number
  /** neighbour coupling — this is what makes a pull travel along the thread */
  tension: number
  /** velocity coupling between the two ends: motion is shared, not position, so
      they can ring together without the pair driving itself away */
  sympathy: number
  /** viscosity along the thread: damps the short-wavelength chatter a big chapter
      change would otherwise excite, and leaves long travel alone */
  viscosity: number
  /** base stroke weight in CSS pixels */
  weight: number
}

export const FEEL: Record<ChapterId, Feel> = {
  overture: { stiffness: 0.03, damping: 0.9, tension: 0.24, sympathy: 0, viscosity: 0.22, weight: 2.8 },
  thread: { stiffness: 0.04, damping: 0.89, tension: 0.2, sympathy: 0, viscosity: 0.26, weight: 1.9 },
  pull: { stiffness: 0.028, damping: 0.93, tension: 0.3, sympathy: 0.09, viscosity: 0.22, weight: 2.1 },
  tie: { stiffness: 0.06, damping: 0.88, tension: 0.24, sympathy: 0.04, viscosity: 0.16, weight: 3.4 },
  day: { stiffness: 0.075, damping: 0.87, tension: 0.26, sympathy: 0, viscosity: 0.12, weight: 1.6 },
  heart: { stiffness: 0.08, damping: 0.88, tension: 0.28, sympathy: 0, viscosity: 0.12, weight: 2 },
  end: { stiffness: 0.08, damping: 0.88, tension: 0.28, sympathy: 0, viscosity: 0.12, weight: 2 },
  ring: { stiffness: 0.08, damping: 0.88, tension: 0.28, sympathy: 0, viscosity: 0.12, weight: 2 },
}

export const blendFeel = (a: Feel, b: Feel, t: number): Feel => ({
  stiffness: lerp(a.stiffness, b.stiffness, t),
  damping: lerp(a.damping, b.damping, t),
  tension: lerp(a.tension, b.tension, t),
  sympathy: lerp(a.sympathy, b.sympathy, t),
  viscosity: lerp(a.viscosity, b.viscosity, t),
  weight: lerp(a.weight, b.weight, t),
})
