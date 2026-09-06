import { clamp, lerp } from './shapes'

type RGB = readonly [number, number, number]

const PAPER: RGB = [243, 239, 229]
const NIGHT: RGB = [20, 16, 12]
const luminance = (rgb: RGB) => rgb.reduce((sum, byte, i) => {
  const c = byte / 255
  return sum + (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i]
}, 0)
const contrast = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
const css = (rgb: RGB) => `rgb(${rgb.map(Math.round).join(' ')})`

/** Match the dark overlay's simple fade and keep its text above 4.5:1. */
export function daylight(night: number) {
  const amount = clamp(night, 0, 1)
  const ground = PAPER.map((v, i) => Math.round(lerp(v, NIGHT[i], amount))) as [number, number, number]
  const light = luminance(ground)
  const onDark = contrast(1, light) > contrast(0, light)
  const edge: RGB = onDark ? [255, 255, 255] : [0, 0, 0]
  const readable = (preferred: RGB) => {
    let chosen: RGB = preferred
    for (let i = 0; i <= 20; i++) {
      chosen = preferred.map((v, channel) => Math.round(lerp(v, edge[channel], i / 20))) as [number, number, number]
      if (contrast(luminance(chosen), light) >= 4.5) break
    }
    return css(chosen)
  }
  return {
    ground: css(ground),
    ink: readable(onDark ? [239, 232, 217] : [22, 19, 15]),
    secondary: readable(onDark ? [182, 173, 155] : [75, 69, 59]),
    red: readable(onDark ? [244, 100, 63] : [144, 46, 44]),
  }
}
