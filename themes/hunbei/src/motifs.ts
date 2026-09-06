// Exact static silhouettes from vendor-source/components/red-thread/PhotoThread.tsx.
type Point = [number, number]
type Curve = [Point, Point, Point]

// These are open cord gestures, in reading order: a loose knot, paired loops,
// a soft heart before the rose room, then an oval that leads towards the ring.
// Each silhouette is authored once; animation only relaxes its sampled points.
export const MOTIFS: { id: string; start: Point; curves: Curve[] }[] = [
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
