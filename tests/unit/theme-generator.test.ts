// The theme generator's math, checked from the outside: every preset and a sweep of random
// inputs come out passing (or say why they can't), measured here with formulas written
// independently of src/site/generator; the exports carry every token; the shadcn/ui export
// is exactly what the base skin adopts; the link restores the inputs.
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { formatOklch, parseHex, toHex, type Oklch } from "@/src/site/generator/color"
import { SHADCN, designTokens, shadcnCss, shareUrl, skinCss, skinNameProblem } from "@/src/site/generator/exports"
import {
  CHART_TOKENS,
  COLOR_TOKENS,
  SCHEMES,
  SIZE_TOKENS,
  TONE_TOKENS,
  fixAll,
  fromQuery,
  generateTheme,
  normalizeInput,
  presetInput,
  presets,
  toQuery,
  type GeneratorInput,
  type SchemeColors,
  type Theme,
} from "@/src/site/generator/tokens"

/* ------------------------------------------------------------------ independent measures */

type V3 = [number, number, number]
// OKLCH → linear sRGB, clipped as a browser shows it (Björn Ottosson's matrices).
function linear({ l, c, h }: Oklch): V3 {
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
function oklab([r, g, b]: V3): V3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
// WCAG 2 contrast, from 8-bit sRGB the way axe reads a rendered page.
function ratio(x: Oklch, y: Oklch) {
  const lum = (c: Oklch) => {
    const [r, g, b] = linear(c).map((v) => {
      const s = Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)) / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }) as V3
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
// color-mix(in oklab, x share, y)
function mix(x: Oklch, y: Oklch, share: number): Oklch {
  const p = (c: Oklch): V3 => [c.l, c.c * Math.cos((c.h * Math.PI) / 180), c.c * Math.sin((c.h * Math.PI) / 180)]
  const [a, b] = [p(x), p(y)]
  const m = [0, 1, 2].map((i) => a[i]! * share + b[i]! * (1 - share)) as V3
  return { l: m[0], c: Math.hypot(m[1], m[2]), h: (Math.atan2(m[2], m[1]) * 180) / Math.PI }
}
// The chart formulas from tests/unit/chart-palette.test.ts (Machado 2009, severity 1).
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
} as const
const simulate = (rgb: V3, kind: keyof typeof MACHADO): V3 =>
  MACHADO[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as V3
const distance = (x: V3, y: V3) => 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
const normal = (x: Oklch, y: Oklch) => distance(oklab(linear(x)), oklab(linear(y)))
const cvd = (x: Oklch, y: Oklch) =>
  Math.min(
    distance(oklab(simulate(linear(x), "protan")), oklab(simulate(linear(y), "protan"))),
    distance(oklab(simulate(linear(x), "deutan")), oklab(simulate(linear(y), "deutan"))),
  )

/** Every rule the page promises, measured on the tokens: what fails, in words. */
function problems(t: SchemeColors, scheme: string): string[] {
  const out: string[] = []
  const need = (what: string, value: number, min: number) => value < min && out.push(`${scheme}: ${what} ${value.toFixed(2)} < ${min}`)
  const bg = t["ui-background"]
  const muted = t["ui-muted"]
  need("text on background", ratio(t["ui-foreground"], bg), 4.5)
  need("text on muted", ratio(t["ui-foreground"], muted), 4.5)
  need("quiet text on background", ratio(t["ui-muted-foreground"], bg), 4.5)
  need("quiet text on muted", ratio(t["ui-muted-foreground"], muted), 4.5)
  need("text on primary", ratio(t["ui-primary-foreground"], t["ui-primary"]), 4.5)
  need("control edges", ratio(t["ui-input"], bg), 3)
  need("focus ring", ratio(t["ui-ring-border"], bg), 3)
  need("checked controls", ratio(t["ui-primary"], bg), 3)
  for (const tone of TONE_TOKENS) {
    need(`${tone} on background`, ratio(t[tone], bg), 4.5)
    need(`${tone} on its badge`, ratio(t[tone], mix(t[tone], bg, 0.1)), 4.5)
  }
  need("destructive on its button", ratio(t["ui-destructive"], mix(t["ui-destructive"], bg, 0.14)), 4.5)
  const charts = CHART_TOKENS.map((c) => t[c])
  charts.forEach((c, i) => need(`chart-${i + 1} on background`, ratio(c, bg), 3))
  const pairs: [number, number][] = []
  for (let i = 0; i < 7; i++) pairs.push([i, i + 1])
  for (let i = 0; i < 6; i++) for (let j = i + 2; j < 6; j++) pairs.push([i, j])
  for (const [i, j] of pairs) {
    need(`chart-${i + 1}/${j + 1} CVD ΔE`, cvd(charts[i]!, charts[j]!), 8)
    need(`chart-${i + 1}/${j + 1} ΔE`, normal(charts[i]!, charts[j]!), 15)
  }
  return out
}
const allProblems = (theme: Theme) => SCHEMES.flatMap((s) => problems(theme[s], s))

// A seeded generator, so the sweep is the same on every run.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function sweep(count: number, seed = 7): GeneratorInput[] {
  const r = random(seed)
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!
  return Array.from({ length: count }, () =>
    normalizeInput({
      key: { l: r(), c: r() * 0.37, h: r() * 360 },
      tint: r() * 100,
      neutralHue: r() < 0.5 ? null : r() * 360,
      radius: r() * 1.25,
      density: pick(["compact", "default", "comfortable"] as const),
      textSize: pick(["small", "default", "large"] as const),
      start: pick(["base", "dark"] as const),
      chartsFromKey: r() < 0.8,
    }),
  )
}

/* ------------------------------------------------------------------ the theme */

describe("generated themes pass", () => {
  for (const preset of presets) {
    test(`the ${preset.name} preset passes every check, measured independently`, () => {
      const theme = generateTheme(presetInput(preset.name))
      expect(theme.impossible).toEqual([])
      expect(theme.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([])
      expect(allProblems(theme)).toEqual([])
    })
  }

  test("UISet's own chart lead passes too", () => {
    const theme = generateTheme({ chartsFromKey: false })
    expect(allProblems(theme)).toEqual([])
  })

  test("a sweep of random inputs passes once fixed, or says it can't", () => {
    const failures: string[] = []
    for (const input of sweep(150)) {
      const theme = generateTheme(input)
      // Anything the generator derives passes on its own; a check that fails is the key's,
      // and comes with a fix, or the theme says why it can't pass.
      for (const check of theme.checks.filter((c) => !c.pass)) {
        if (!check.fix && !theme.impossible.length) failures.push(`${toQuery(input)}: ${check.id} fails with no fix`)
      }
      const fixed = generateTheme(fixAll(input))
      if (fixed.impossible.length) continue
      const left = allProblems(fixed)
      if (left.length) failures.push(`${toQuery(input)}: ${left.join("; ")}`)
    }
    expect(failures).toEqual([])
  }, 60_000)

  test("only the key's own checks can fail; derived colors are solved", () => {
    for (const input of sweep(80, 11)) {
      const theme = generateTheme(input)
      if (theme.impossible.length) continue
      const ids = theme.checks.filter((c) => !c.pass).map((c) => c.id)
      expect(ids.every((id) => id === "light:primary-bg"), `${toQuery(input)}: ${ids.join(", ")}`).toBe(true)
    }
  }, 30_000)

  test("every check the page lists is there, in both schemes", () => {
    const ids = generateTheme().checks.map((c) => c.id)
    for (const scheme of SCHEMES)
      for (const id of ["text-bg", "text-muted", "quiet-bg", "quiet-muted", "text-primary", "input-bg", "ring-bg", "primary-bg", ...TONE_TOKENS, "ui-destructive", "chart-bg", "chart-cvd", "chart-normal"])
        expect(ids).toContain(`${scheme}:${id}`)
  })
})

describe("the one-click fix", () => {
  const amber = normalizeInput({ key: { l: 0.8, c: 0.16, h: 80 } })

  test("a key too light for checked controls fails, with a fix", () => {
    const check = generateTheme(amber).checks.find((c) => c.id === "light:primary-bg")!
    expect(check.pass).toBe(false)
    expect(check.fix?.label).toMatch(/^Use lightness 0\.\d+ for the key$/)
  })

  test("the fix passes, keeps the hue, and is the nearest lightness that does", () => {
    const fix = generateTheme(amber).checks.find((c) => c.id === "light:primary-bg")!.fix!
    const fixed = generateTheme(fix.input)
    expect(fixed.checks.filter((c) => !c.pass)).toEqual([])
    expect(allProblems(fixed)).toEqual([])
    expect(fix.input.key.h).toBe(amber.key.h)
    expect(fix.input.key.l).toBeLessThan(amber.key.l)
    // One step closer to the original fails, so nothing nearer was skipped.
    const closer = generateTheme({ ...fix.input, key: { ...fix.input.key, l: fix.input.key.l + 0.005 } })
    expect(closer.checks.find((c) => c.id === "light:primary-bg")!.pass).toBe(false)
    // Nothing else moved.
    expect({ ...fix.input, key: null }).toEqual({ ...amber, key: null })
  })

  test("fix all reaches a passing theme", () => {
    expect(generateTheme(fixAll(amber)).checks.every((c) => c.pass)).toBe(true)
  })
})

/* ------------------------------------------------------------------ exports */

const oklchText = (c: Oklch) => formatOklch(c).replace(/[()/.]/g, "\\$&")

describe("exports carry every token", () => {
  const theme = generateTheme(presetInput("Teal"))

  test("the skin sets every color as light-dark(light, dark), and every size", () => {
    const css = skinCss(theme, { name: "harbor" })
    expect(css).toContain('[data-uiset][data-skin="harbor"]')
    expect(css).toContain("@layer uiset.skin")
    // Leaving color-scheme alone keeps theme="light" / "dark" working on the root.
    expect(css).not.toMatch(/color-scheme/)
    for (const token of COLOR_TOKENS)
      expect(css, token).toMatch(new RegExp(`--${token}: light-dark\\(${oklchText(theme.light[token])}, ${oklchText(theme.dark[token])}\\);`))
    for (const token of SIZE_TOKENS) expect(css, token).toContain(`--${token}: ${theme.sizes[token]};`)
  })

  test("design tokens hold every color in both schemes, in DTCG form", () => {
    const doc = JSON.parse(designTokens(theme))
    for (const scheme of SCHEMES) {
      expect(doc[scheme].$type).toBe("color")
      for (const token of COLOR_TOKENS) {
        const i = token.indexOf("-")
        const entry = doc[scheme][token.slice(0, i)][token.slice(i + 1)]
        const color = theme[scheme][token]
        expect(entry, `${scheme} ${token}`).toBeDefined()
        expect(entry.$value.colorSpace).toBe("oklch")
        expect(entry.$value.components).toEqual([color.l, color.c, color.h])
        expect(entry.$value.hex).toBe(toHex(color))
      }
    }
    for (const token of SIZE_TOKENS) expect(doc.size.ui[token.slice(3)].$value).toEqual({ value: parseFloat(theme.sizes[token]), unit: "rem" })
  })

  test("the shadcn/ui export names every variable shadcn/ui uses, in :root and .dark", () => {
    const css = shadcnCss(theme)
    const names = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]
    const root = block(css, ":root")
    const dark = block(css, ".dark")
    for (const name of names) {
      expect(root, name).toHaveProperty(name)
      expect(dark, name).toHaveProperty(name)
    }
    expect(root.radius).toBe(theme.sizes["ui-radius"])
  })
})

/** A selector's declarations in a stylesheet, as { name: value }. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`No ${selector} in the export`)
  const body = css.slice(start, css.indexOf("}", start))
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
}

describe("the shadcn/ui export round-trips through the base skin", () => {
  // The names the base skin adopts, read from the skin itself: --ui-X: var(--Y, …).
  const skin = readFileSync("registry/uiset/ui/uiset/skins/base.css", "utf8")
  const tokens = readFileSync("registry/uiset/ui/uiset/tokens.css", "utf8")
  const adopted = [...skin.matchAll(/--(ui-[a-z-]+):\s*var\(\s*--([a-z-]+)\s*,/g)].map((m) => [m[1]!, m[2]!] as const)
  // --ui-primary is var(--uiset-key), which takes --primary; --ui-radius takes --radius.
  const viaKey = /--uiset-key:\s*var\(--primary\b/.test(skin) && /--ui-primary:\s*var\(--uiset-key\)/.test(skin)
  const viaRadius = /--uiset-radius:\s*var\(--radius\b/.test(tokens) && /--ui-radius:\s*var\(--uiset-radius\)/.test(skin)

  test("the base skin still adopts what this test expects", () => {
    expect(adopted.map(([, name]) => name).sort()).toEqual(["background", "border", "foreground", "input", "muted", "muted-foreground"])
    expect(viaKey).toBe(true)
    expect(viaRadius).toBe(true)
  })

  for (const preset of ["Indigo", "Ochre", "Graphite"]) {
    test(`${preset}: what the base skin reads back is the generated token, light and dark`, () => {
      const theme = generateTheme(presetInput(preset))
      const css = shadcnCss(theme)
      const schemes = { light: block(css, ":root"), dark: block(css, ".dark") }
      for (const scheme of SCHEMES) {
        const vars = schemes[scheme]
        for (const [ui, name] of [...adopted, ["ui-primary", "primary"] as const])
          expect(vars[name], `${scheme} --${name} → --${ui}`).toBe(formatOklch(theme[scheme][ui as keyof SchemeColors]))
      }
      expect(schemes.light.radius).toBe(theme.sizes["ui-radius"])
      // And the mapping table itself sends each adopted name to the token it came from.
      for (const [ui, name] of adopted) expect(SHADCN.find(([n]) => n === name)?.[1]).toBe(ui)
    })
  }
})

/* ------------------------------------------------------------------ inputs and color math */

describe("inputs", () => {
  test("the link restores every input", () => {
    for (const input of [...sweep(30, 3), ...presets.map((p) => presetInput(p.name))]) {
      const back = fromQuery(toQuery(input))
      expect(back.key.l).toBeCloseTo(input.key.l, 3)
      expect(back.key.c).toBeCloseTo(input.key.c, 3)
      expect(back.key.h).toBeCloseTo(input.key.h, 3)
      expect(back.tint).toBeCloseTo(input.tint, 3)
      expect(back.radius).toBeCloseTo(input.radius, 3)
      if (input.neutralHue === null) expect(back.neutralHue).toBeNull()
      else expect(back.neutralHue).toBeCloseTo(input.neutralHue, 3)
      expect([back.density, back.textSize, back.start, back.chartsFromKey]).toEqual([input.density, input.textSize, input.start, input.chartsFromKey])
    }
    const theme = generateTheme(presetInput("Pink"))
    const url = new URL(shareUrl(theme, "https://uiset.dev"))
    expect(url.pathname).toBe("/themes/generator")
    expect(generateTheme(fromQuery(url.search)).light).toEqual(theme.light)
  })

  test("a malformed link falls back to defaults instead of breaking", () => {
    const input = fromQuery("?key=banana&tint=-40&radius=9&density=huge&start=sideways")
    expect(input).toEqual(normalizeInput({ tint: 0, radius: 1.25 }))
  })

  test("hex goes both ways", () => {
    for (const hex of ["#3655cd", "#000000", "#ffffff", "#f3b01d", "#0f766e", "#c026d3"]) {
      expect(toHex(parseHex(hex)!)).toBe(hex)
      // A typed color survives the link, and is the primary the theme ships.
      const input = fromQuery(toQuery(normalizeInput({ key: parseHex(hex)! })))
      expect(toHex(input.key)).toBe(hex)
      expect(toHex(generateTheme(input).light["ui-primary"])).toBe(hex)
    }
    expect(toHex(parseHex("#fa0")!)).toBe("#ffaa00")
    expect(parseHex("#12345")).toBeNull()
    expect(parseHex("teal")).toBeNull()
  })

  test("skin names that would clash or break the selector are refused", () => {
    expect(skinNameProblem("harbor")).toBeNull()
    expect(skinNameProblem("base")).not.toBeNull()
    expect(skinNameProblem('x"]{}')).not.toBeNull()
  })
})
