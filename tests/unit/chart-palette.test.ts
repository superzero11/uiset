// The chart palettes, measured: each skin's categorical slots read apart for people with
// full color vision and under simulated protan and deutan vision (Machado 2009, severity 1,
// ΔE in OKLab ×100, as the dataviz validator measures them). A re-picked color that brings
// back a lookalike pair fails here.
import { readFileSync } from "node:fs"
import { expect, test } from "vitest"

const css = readFileSync("registry/uiset/ui/chart/tokens.css", "utf8")

type Lab = [number, number, number]
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
} as const

// OKLCH → linear sRGB, clipped to the gamut the way a browser shows it.
function linear(l: number, c: number, h: number): Lab {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clip = (x: number) => Math.min(1, Math.max(0, x))
  return [
    clip(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clip(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clip(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
}
function oklab([r, g, b]: Lab): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const simulate = (rgb: Lab, kind: keyof typeof MACHADO): Lab =>
  MACHADO[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as Lab
const distance = (x: Lab, y: Lab) => 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
const normal = (x: Lab, y: Lab) => distance(oklab(x), oklab(y))
const cvd = (x: Lab, y: Lab) => Math.min(distance(oklab(simulate(x, "protan")), oklab(simulate(y, "protan"))), distance(oklab(simulate(x, "deutan")), oklab(simulate(y, "deutan"))))

/** A skin block's --chart-1…8, as linear sRGB. */
function slots(selector: string): Lab[] {
  const block = css.slice(css.indexOf(selector))
  return Array.from({ length: 8 }, (_, i) => {
    const match = block.match(new RegExp(`--chart-${i + 1}: oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`))
    if (!match) throw new Error(`No --chart-${i + 1} in ${selector}`)
    return linear(Number(match[1]), Number(match[2]), Number(match[3]))
  })
}

const blueprint = slots('[data-skin="blueprint"]')

test("Blueprint's neighbors read apart: CVD ΔE ≥ 8 and normal ΔE ≥ 15", () => {
  for (let i = 0; i < 7; i++) {
    expect(cvd(blueprint[i]!, blueprint[i + 1]!), `slots ${i + 1}–${i + 2}`).toBeGreaterThanOrEqual(8)
    expect(normal(blueprint[i]!, blueprint[i + 1]!), `slots ${i + 1}–${i + 2}`).toBeGreaterThanOrEqual(15)
  }
})

test("Blueprint's first six, a segmented bar's most parts, read apart pair by pair", () => {
  for (let i = 0; i < 6; i++)
    for (let j = i + 1; j < 6; j++) {
      expect(cvd(blueprint[i]!, blueprint[j]!), `slots ${i + 1} and ${j + 1}`).toBeGreaterThanOrEqual(8)
      expect(normal(blueprint[i]!, blueprint[j]!), `slots ${i + 1} and ${j + 1}`).toBeGreaterThanOrEqual(15)
    }
})

for (const skin of ["phosphor", "ink"]) {
  const set = slots(`[data-skin="${skin}"]`)
  test(`${skin}'s neighbors read apart, and its first six pair by pair`, () => {
    for (let i = 0; i < 7; i++) {
      expect(cvd(set[i]!, set[i + 1]!), `slots ${i + 1}–${i + 2}`).toBeGreaterThanOrEqual(8)
      expect(normal(set[i]!, set[i + 1]!), `slots ${i + 1}–${i + 2}`).toBeGreaterThanOrEqual(15)
    }
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++) {
        expect(cvd(set[i]!, set[j]!), `slots ${i + 1} and ${j + 1}`).toBeGreaterThanOrEqual(8)
        expect(normal(set[i]!, set[j]!), `slots ${i + 1} and ${j + 1}`).toBeGreaterThanOrEqual(15)
      }
  })
}
