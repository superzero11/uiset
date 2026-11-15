// Color math for the theme generator: OKLCH in and out, sRGB gamut, WCAG 2 contrast, and
// the chart checks (ΔE in OKLab ×100, with protan and deutan simulated the Machado 2009
// way, severity 1), ported from tests/unit/chart-palette.test.ts. No React, no DOM.

type Oklch = { l: number; c: number; h: number; alpha?: number }
/** Linear-light sRGB, 0 to 1 per channel inside the gamut. */
type Rgb = [number, number, number]
type Lab = [number, number, number]

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const round = (x: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(x * f) / f
}
const hue = (h: number) => ((h % 360) + 360) % 360

function oklchToOklab({ l, c, h }: Oklch): Lab {
  const r = (h * Math.PI) / 180
  return [l, c * Math.cos(r), c * Math.sin(r)]
}

function oklabToLinear([l, a, b]: Lab): Rgb {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

function linearToOklab([r, g, b]: Rgb): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToOklch([l, a, b]: Lab): Oklch {
  const c = Math.hypot(a, b)
  return { l, c, h: c < 1e-4 ? 0 : hue((Math.atan2(b, a) * 180) / Math.PI) }
}

/** OKLCH → linear sRGB, clipped to the gamut the way a browser shows it. */
function toLinear(color: Oklch): Rgb {
  const [r, g, b] = oklabToLinear(oklchToOklab(color))
  return [clamp(r), clamp(g), clamp(b)]
}

function inGamut(color: Oklch, epsilon = 1e-4) {
  return oklabToLinear(oklchToOklab(color)).every((x) => x >= -epsilon && x <= 1 + epsilon)
}

/** The highest chroma sRGB can show at this lightness and hue. */
function maxChroma(l: number, h: number) {
  if (l <= 0 || l >= 1) return 0
  let lo = 0
  let hi = 0.4
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ l, c: mid, h })) lo = mid
    else hi = mid
  }
  return lo
}

/** The same lightness and hue, with chroma lowered until sRGB can show it. */
function toGamut(color: Oklch): Oklch {
  if (inGamut(color)) return color
  return { ...color, c: maxChroma(color.l, color.h) }
}

/** Rounded the way the exports write it, so checks measure exactly what ships. */
function tidy(color: Oklch): Oklch {
  const inside = toGamut({ ...color, l: clamp(color.l), c: Math.max(0, color.c), h: hue(color.h) })
  // Four places hold a hex color exactly. Chroma rounds down, so rounding never pushes a
  // color back out of the gamut.
  const c = Math.floor(inside.c * 10000 + 1e-6) / 10000
  return { l: round(inside.l, 4), c, h: c === 0 ? 0 : round(inside.h, 2), ...(color.alpha === undefined ? {} : { alpha: color.alpha }) }
}

function formatOklch(color: Oklch) {
  const parts = `${round(color.l, 4)} ${round(color.c, 4)} ${round(color.h, 2)}`
  return color.alpha === undefined || color.alpha >= 1 ? `oklch(${parts})` : `oklch(${parts} / ${round(color.alpha, 2)})`
}

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
const decode = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)

function toHex(color: Oklch) {
  return `#${toLinear(color)
    .map((x) =>
      Math.round(clamp(encode(x)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}

/** "#5b5bd6", "5b5bd6" or "#55d" → OKLCH; null when it isn't a hex color. */
function parseHex(input: string): Oklch | null {
  const text = input.trim().replace(/^#/, "")
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) return null
  const full = text.length === 3 ? [...text].map((x) => x + x).join("") : text
  const rgb = [0, 2, 4].map((i) => decode(parseInt(full.slice(i, i + 2), 16) / 255)) as Rgb
  const color = oklabToOklch(linearToOklab(rgb))
  return { l: round(color.l, 4), c: Math.floor(color.c * 10000 + 1e-6) / 10000, h: round(color.h, 2) }
}

/* ------------------------------------------------------------------ contrast (WCAG 2) */

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** WCAG 2 relative luminance. */
const relativeLuminance = (color: Oklch) => luminance(toLinear(color))

function contrast(x: Oklch, y: Oklch) {
  const [hi, lo] = [luminance(toLinear(x)), luminance(toLinear(y))].sort((p, q) => q - p) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** color-mix(in oklab, x amount, y): `amount` of x, the rest y. */
function mix(x: Oklch, y: Oklch, amount: number): Oklch {
  const a = oklchToOklab(x)
  const b = oklchToOklab(y)
  return oklabToOklch([0, 1, 2].map((i) => a[i]! * amount + b[i]! * (1 - amount)) as Lab)
}

/* ------------------------------------------------------------------ telling colors apart */

const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const

type Deficiency = keyof typeof MACHADO

const simulate = (rgb: Rgb, kind: Deficiency): Rgb =>
  MACHADO[kind].map((row) => clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) as Rgb

const distance = (x: Lab, y: Lab) => 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])

/** ΔE in OKLab ×100 with full color vision. */
function deltaE(x: Oklch, y: Oklch) {
  return distance(linearToOklab(toLinear(x)), linearToOklab(toLinear(y)))
}

/** How a color is seen: OKLab with full color vision, and with protan and deutan vision. */
type Seen = { normal: Lab; protan: Lab; deutan: Lab }
function perceive(color: Oklch): Seen {
  const rgb = toLinear(color)
  return { normal: linearToOklab(rgb), protan: linearToOklab(simulate(rgb, "protan")), deutan: linearToOklab(simulate(rgb, "deutan")) }
}
const seenDeltaE = (x: Seen, y: Seen) => distance(x.normal, y.normal)
const seenCvdDeltaE = (x: Seen, y: Seen) => Math.min(distance(x.protan, y.protan), distance(x.deutan, y.deutan))

/** The smaller ΔE of the two common red–green deficiencies (protan and deutan). */
function cvdDeltaE(x: Oklch, y: Oklch) {
  const a = toLinear(x)
  const b = toLinear(y)
  return Math.min(
    distance(linearToOklab(simulate(a, "protan")), linearToOklab(simulate(b, "protan"))),
    distance(linearToOklab(simulate(a, "deutan")), linearToOklab(simulate(b, "deutan"))),
  )
}

/* ------------------------------------------------------------------ solving */

/**
 * The lightness nearest to the color's own at which `passes` holds, keeping its hue and
 * chroma (lowered where sRGB runs out). Null when no lightness in [min, max] passes.
 */
function nearestLightness(color: Oklch, passes: (candidate: Oklch) => boolean, { min = 0, max = 1, step = 0.005 } = {}): Oklch | null {
  const start = tidy(color)
  if (start.l >= min && start.l <= max && passes(start)) return start
  for (let i = 1; i * step <= 1; i++) {
    for (const l of [color.l - i * step, color.l + i * step]) {
      if (l < min - 1e-9 || l > max + 1e-9) continue
      const candidate = tidy({ ...color, l })
      if (passes(candidate)) return candidate
    }
  }
  return null
}

export {
  clamp,
  contrast,
  cvdDeltaE,
  deltaE,
  formatOklch,
  hue,
  inGamut,
  maxChroma,
  mix,
  nearestLightness,
  parseHex,
  perceive,
  relativeLuminance,
  round,
  seenCvdDeltaE,
  seenDeltaE,
  tidy,
  toGamut,
  toHex,
  toLinear,
}
export type { Deficiency, Oklch, Rgb, Seen }
