// The theme generator's model: a key color and a few choices in, every color the base
// skin uses out, for light and dark, with each pair that matters checked. Tokens the
// generator derives are solved to pass; the key is yours, so when it fails a check the
// check says so and offers the nearest lightness that passes. No React, no DOM.
import { contrast, hue, maxChroma, mix, nearestLightness, perceive, relativeLuminance, seenCvdDeltaE, seenDeltaE, tidy, type Oklch, type Seen } from "./color"

type Scheme = "light" | "dark"
type Density = "compact" | "default" | "comfortable"
type TextSize = "small" | "default" | "large"
type Start = "base" | "dark"

type GeneratorInput = {
  key: Oklch
  /** The neutrals' hue; null follows the key's. */
  neutralHue: number | null
  /** How much color is in the greys, 0 (pure grey) to 100 (clearly tinted). */
  tint: number
  /** Corner radius in rem. */
  radius: number
  density: Density
  textSize: TextSize
  /** "base" starts from the base skin's surfaces; "dark" from a deeper dark one, dark by default. */
  start: Start
  /** Lead the chart colors with the key's hue, or with UISet's blue. */
  chartsFromKey: boolean
}

const SCHEMES: readonly Scheme[] = ["light", "dark"]

const UI_TOKENS = [
  "ui-background",
  "ui-foreground",
  "ui-muted",
  "ui-muted-foreground",
  "ui-border",
  "ui-input",
  "ui-primary",
  "ui-primary-foreground",
  "ui-ring",
  "ui-ring-border",
  "ui-destructive",
] as const
const TONE_TOKENS = ["tone-info", "tone-success", "tone-warning", "tone-danger"] as const
const CHART_TOKENS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8"] as const
const SEQ_TOKENS = ["chart-seq-1", "chart-seq-2", "chart-seq-3", "chart-seq-4", "chart-seq-5", "chart-seq-6", "chart-seq-7"] as const
/** Every color the generator writes, in the order the exports list them. */
const COLOR_TOKENS = [...UI_TOKENS, ...TONE_TOKENS, ...CHART_TOKENS, ...SEQ_TOKENS] as const
/** Sizes, the same in both schemes. */
const SIZE_TOKENS = ["ui-radius", "ui-spacing", "ui-font-size"] as const

type ColorToken = (typeof COLOR_TOKENS)[number]
type SizeToken = (typeof SIZE_TOKENS)[number]
type SchemeColors = Record<ColorToken, Oklch>

const presets: { name: string; input: Pick<GeneratorInput, "key" | "tint"> & Partial<GeneratorInput> }[] = [
  { name: "Indigo", input: { key: { l: 0.5, c: 0.19, h: 268 }, tint: 30 } },
  { name: "Blue", input: { key: { l: 0.55, c: 0.18, h: 250 }, tint: 30 } },
  { name: "Teal", input: { key: { l: 0.55, c: 0.11, h: 190 }, tint: 25 } },
  { name: "Green", input: { key: { l: 0.55, c: 0.15, h: 150 }, tint: 20 } },
  { name: "Ochre", input: { key: { l: 0.62, c: 0.14, h: 70 }, tint: 35 } },
  { name: "Red", input: { key: { l: 0.55, c: 0.2, h: 27 }, tint: 20 } },
  { name: "Pink", input: { key: { l: 0.58, c: 0.2, h: 350 }, tint: 25 } },
  { name: "Violet", input: { key: { l: 0.52, c: 0.21, h: 300 }, tint: 35 } },
  { name: "Graphite", input: { key: { l: 0.35, c: 0.02, h: 260 }, tint: 15 } },
]

const defaultInput: GeneratorInput = {
  key: { l: 0.5, c: 0.19, h: 268 },
  neutralHue: null,
  tint: 30,
  radius: 0.5,
  density: "default",
  textSize: "default",
  start: "base",
  chartsFromKey: true,
}

function presetInput(name: string): GeneratorInput {
  const preset = presets.find((p) => p.name === name) ?? presets[0]!
  return { ...defaultInput, ...preset.input, neutralHue: null }
}

/* ------------------------------------------------------------------ targets */

// The base skin's neutrals (skins/base.css) as [lightness, chroma at tint 30].
type Neutral = "bg" | "fg" | "muted" | "quiet" | "border" | "input"
const NEUTRALS: Record<"light" | "dark" | "deep", Record<Neutral, [number, number]>> = {
  light: { bg: [0.995, 0.002], fg: [0.21, 0.012], muted: [0.962, 0.006], quiet: [0.47, 0.016], border: [0.9, 0.008], input: [0.6, 0.014] },
  dark: { bg: [0.17, 0.008], fg: [0.96, 0.004], muted: [0.235, 0.01], quiet: [0.73, 0.012], border: [0.3, 0.012], input: [0.56, 0.014] },
  // Dark first: a deeper surface, near black, for apps that live in the dark.
  deep: { bg: [0.145, 0.008], fg: [0.965, 0.004], muted: [0.205, 0.01], quiet: [0.72, 0.012], border: [0.275, 0.012], input: [0.53, 0.014] },
}

// Status colors from shell/shell.css, the starting points the solver moves from.
const TONES: Record<(typeof TONE_TOKENS)[number], Record<Scheme, Oklch>> = {
  "tone-info": { light: { l: 0.48, c: 0.15, h: 255 }, dark: { l: 0.86, c: 0.08, h: 240 } },
  "tone-success": { light: { l: 0.47, c: 0.12, h: 150 }, dark: { l: 0.87, c: 0.11, h: 150 } },
  "tone-warning": { light: { l: 0.5, c: 0.12, h: 70 }, dark: { l: 0.89, c: 0.11, h: 85 } },
  "tone-danger": { light: { l: 0.46, c: 0.19, h: 27 }, dark: { l: 0.86, c: 0.08, h: 25 } },
}
// UI SDK's own destructive color.
const DESTRUCTIVE: Record<Scheme, Oklch> = { light: { l: 0.552, c: 0.224, h: 25.5 }, dark: { l: 0.712, c: 0.181, h: 22.8 } }

// Chart colors are built, not picked from a list: the first is the key's hue (or UISet's
// blue), and each next one is the most pleasant candidate that still reads apart from the
// ones it must. Candidates hold 3:1 on the background and sit in a band per scheme.
const CHART_BAND: Record<Scheme, [number, number]> = { light: [0.38, 0.7], dark: [0.55, 0.88] }
const CHART_TARGET: Record<Scheme, number> = { light: 0.56, dark: 0.72 }
const CHART_CHROMA: Record<Scheme, number> = { light: 0.19, dark: 0.17 }
// UISet's chart hues in their order (chart/tokens.css): blue, orange, teal, amber, pink,
// green, violet, red. Each slot leans toward the next one the lead hasn't taken.
const ROLE_HUES = [255, 42, 168, 80, 350, 140, 290, 25]
const UISET_BLUE = ROLE_HUES[0]!
// The default sequential ramp (chart/tokens.css), light; dark runs it from the surface up.
const SEQ_L = [0.905, 0.812, 0.717, 0.622, 0.527, 0.433, 0.338]
const SEQ_C = [0.041, 0.079, 0.118, 0.161, 0.15, 0.128, 0.103]

const SPACING: Record<Density, string> = { compact: "0.2rem", default: "0.25rem", comfortable: "0.3rem" }
const FONT_SIZE: Record<TextSize, string> = { small: "0.8125rem", default: "0.875rem", large: "0.9375rem" }

/* ------------------------------------------------------------------ checks */

const TEXT = 4.5
const EDGE = 3
const CVD = 8
const NORMAL = 15
// The solver aims a little past each line, so rounding in the browser never tips it under.
const MARGIN = 0.04

type CheckGroup = "Text" | "Controls" | "Status" | "Charts"
type Fix = { label: string; input: GeneratorInput }
type Check = {
  id: string
  scheme: Scheme
  group: CheckGroup
  label: string
  /** The worst pair measured, in words ("chart-4 on background"). */
  detail: string
  value: number
  need: number
  kind: "contrast" | "difference"
  pass: boolean
  /** One click that makes it pass, changing as little as it can. */
  fix: Fix | null
}

type Theme = {
  input: GeneratorInput
  light: SchemeColors
  dark: SchemeColors
  sizes: Record<SizeToken, string>
  checks: Check[]
  /** Derived colors the solver moved, in words. */
  notes: string[]
  /** What can't pass with these inputs, in words. */
  impossible: string[]
}

const WHITE: Oklch = { l: 1, c: 0, h: 0 }
const BLACK: Oklch = { l: 0, c: 0, h: 0 }

/* ------------------------------------------------------------------ input */

const num = (value: unknown, fallback: number, lo: number, hi: number) => {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/** Any partial or hand-edited input, clamped to the ranges the controls allow. */
function normalizeInput(raw: Partial<GeneratorInput> = {}): GeneratorInput {
  const key = raw.key ?? defaultInput.key
  return {
    key: { l: num(key.l, defaultInput.key.l, 0, 1), c: num(key.c, defaultInput.key.c, 0, 0.37), h: hue(num(key.h, defaultInput.key.h, 0, 360)) },
    neutralHue: raw.neutralHue === null || raw.neutralHue === undefined ? null : hue(num(raw.neutralHue, 0, 0, 360)),
    tint: num(raw.tint, defaultInput.tint, 0, 100),
    radius: num(raw.radius, defaultInput.radius, 0, 1.25),
    density: raw.density && raw.density in SPACING ? raw.density : defaultInput.density,
    textSize: raw.textSize && raw.textSize in FONT_SIZE ? raw.textSize : defaultInput.textSize,
    start: raw.start === "dark" ? "dark" : "base",
    chartsFromKey: raw.chartsFromKey ?? true,
  }
}

/* ------------------------------------------------------------------ solving */

type Solve = { color: Oklch; moved: boolean; ok: boolean }

/** The start color if it passes, else the nearest lightness that does. */
function solve(start: Oklch, passes: (c: Oklch) => boolean, range?: { min?: number; max?: number }): Solve {
  const first = tidy(start)
  if (passes(first)) return { color: first, moved: false, ok: true }
  const found = nearestLightness(start, passes, range)
  return found ? { color: found, moved: true, ok: true } : { color: first, moved: false, ok: false }
}

const hueGap = (a: number, b: number) => {
  const d = Math.abs(hue(a) - hue(b))
  return Math.min(d, 360 - d)
}

/** Text on a fill: white if it reads, then a near-black ink, then black. */
function textOn(fill: Oklch, inkHue: number): Oklch {
  const ink = tidy({ l: 0.2, c: 0.02, h: inkHue })
  for (const candidate of [WHITE, ink, BLACK]) if (contrast(candidate, fill) >= TEXT + MARGIN) return candidate
  return contrast(WHITE, fill) > contrast(BLACK, fill) ? WHITE : BLACK
}

/* ------------------------------------------------------------------ charts */

type Swatch = { color: Oklch; seen: Seen }
const swatch = (color: Oklch): Swatch => ({ color, seen: perceive(color) })
const cvdOf = (x: Swatch, y: Swatch) => seenCvdDeltaE(x.seen, y.seen)
const normalOf = (x: Swatch, y: Swatch) => seenDeltaE(x.seen, y.seen)
/** How far apart two colors read, as a share of the line: 1 is exactly on it. */
const separation = (x: Swatch, y: Swatch) => Math.min(cvdOf(x, y) / CVD, normalOf(x, y) / NORMAL)

/** Neighbors (1–2 … 7–8) and the first six pair by pair: the pairs the chart checks cover. */
function chartPairs(): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < 7; i++) pairs.push([i, i + 1])
  for (let i = 0; i < 6; i++) for (let j = i + 2; j < 6; j++) pairs.push([i, j])
  return pairs
}

const swatchCache = new Map<Scheme, (Swatch & { y: number })[]>()
/** Every candidate for a chart slot in this scheme: hue every 10°, lightness every 0.03. */
function chartPool(scheme: Scheme, bg: Oklch): Swatch[] {
  let all = swatchCache.get(scheme)
  if (!all) {
    const [lo, hi] = CHART_BAND[scheme]
    all = []
    for (let h = 0; h < 360; h += 10) {
      for (let l = lo; l <= hi + 1e-9; l += 0.03) {
        // Very light colors lose chroma, so a dark-mode set never glows neon.
        const soft = l > 0.78 ? CHART_CHROMA[scheme] - (l - 0.78) * 0.6 : CHART_CHROMA[scheme]
        const color = tidy({ l, c: Math.min(soft, maxChroma(l, h)), h })
        if (color.c >= 0.08) all.push({ ...swatch(color), y: relativeLuminance(color) })
      }
    }
    swatchCache.set(scheme, all)
  }
  const y = relativeLuminance(bg)
  const need = EDGE + MARGIN * 2
  return all.filter((s) => (Math.max(s.y, y) + 0.05) / (Math.min(s.y, y) + 0.05) >= need)
}

/**
 * Eight categorical colors, greedily: slot 1 is given; slots 2–6 must read apart from every
 * earlier slot, 7 and 8 from their neighbor (and not repeat anyone). Among the candidates
 * that clear the line with room to spare, the pick is the one with the freshest hue, nearest
 * the scheme's lightness and with the most chroma; with no room, the farthest apart.
 */
function buildChart(first: Oklch, scheme: Scheme, bg: Oklch): Oklch[] {
  const pool = chartPool(scheme, bg)
  const picked: Swatch[] = [swatch(first)]
  const taken = ROLE_HUES.reduce((best, h) => (hueGap(h, first.h) < hueGap(best, first.h) ? h : best))
  const wanted = ROLE_HUES.filter((h) => h !== taken)
  for (let slot = 1; slot < 8; slot++) {
    const against = slot <= 5 ? picked : [picked[slot - 1]!]
    let best: { s: Swatch; cost: number } | null = null
    let farthest: { s: Swatch; sep: number } | null = null
    for (const candidate of pool) {
      let sep = Infinity
      for (const other of against) sep = Math.min(sep, separation(candidate, other))
      if (!farthest || sep > farthest.sep) farthest = { s: candidate, sep }
      // Early slots keep extra room so later ones still have somewhere to go.
      if (sep < (slot <= 5 ? 1.15 : 1.06)) continue
      let hueRoom = 180
      let repeat = Infinity
      for (const other of picked) {
        hueRoom = Math.min(hueRoom, hueGap(candidate.color.h, other.color.h))
        repeat = Math.min(repeat, normalOf(candidate, other))
      }
      if (slot > 5 && repeat < 10) continue
      const cost =
        hueGap(candidate.color.h, wanted[slot - 1]!) / 10 +
        (hueRoom < 30 ? (30 - hueRoom) / 2 : 0) +
        Math.abs(candidate.color.l - CHART_TARGET[scheme]) / 0.03 +
        (CHART_CHROMA[scheme] - candidate.color.c) / 0.02
      if (!best || cost < best.cost) best = { s: candidate, cost }
    }
    picked.push(best?.s ?? farthest!.s)
  }
  return picked.map((s) => s.color)
}

function chartsPass(colors: Oklch[]) {
  const s = colors.map(swatch)
  return chartPairs().every(([i, j]) => cvdOf(s[i]!, s[j]!) >= CVD && normalOf(s[i]!, s[j]!) >= NORMAL)
}

function chartColors(input: GeneratorInput, scheme: Scheme, bg: Oklch) {
  const [lo, hi] = CHART_BAND[scheme]
  const holds = (c: Oklch) => contrast(c, bg) >= EDGE + MARGIN * 2
  const h = input.chartsFromKey ? input.key.h : UISET_BLUE
  // The key's own lightness where it fits the band; a low-chroma key gets enough color to be a series.
  const c = input.chartsFromKey ? Math.min(Math.max(input.key.c, 0.1), CHART_CHROMA[scheme]) : CHART_CHROMA[scheme]
  const l = input.chartsFromKey && scheme === "light" ? input.key.l : CHART_TARGET[scheme]
  const lead = solve({ l: Math.min(hi, Math.max(lo, l)), c, h }, holds, { min: lo, max: hi }).color
  // If nothing fits around the lead's own lightness, try it a little lighter and darker.
  for (const d of [0, 0.06, -0.06, 0.12, -0.12]) {
    const start = d === 0 ? lead : solve({ ...lead, l: lead.l + d }, holds, { min: lo, max: hi }).color
    const colors = buildChart(start, scheme, bg)
    if (chartsPass(colors)) return { colors, ok: true }
  }
  return { colors: buildChart(lead, scheme, bg), ok: false }
}

function sequential(lead: Oklch, scheme: Scheme): Oklch[] {
  const scale = Math.min(1.2, Math.max(0.6, lead.c / 0.161))
  const steps = SEQ_L.map((l, i) => tidy({ l, c: SEQ_C[i]! * scale, h: lead.h }))
  return scheme === "light" ? steps : steps.reverse()
}

/* ------------------------------------------------------------------ generate */

function generateScheme(input: GeneratorInput, scheme: Scheme, notes: string[], impossible: string[]): SchemeColors {
  const where = scheme === "light" ? "light" : "dark"
  const table = NEUTRALS[scheme === "light" ? "light" : input.start === "dark" ? "deep" : "dark"]
  const nh = input.neutralHue ?? input.key.h
  const tint = input.tint / 30
  const neutral = (role: Neutral) => tidy({ l: table[role][0], c: table[role][1] * tint, h: nh })

  const bg = neutral("bg")
  const muted = neutral("muted")
  const border = neutral("border")
  const away = scheme === "light" ? { max: bg.l } : { min: bg.l }
  const keep = (name: string, s: Solve, need: string) => {
    if (!s.ok) impossible.push(`${name}, ${where}: no lightness reaches ${need} with this tint.`)
    else if (s.moved) notes.push(`${name}, ${where}: moved to lightness ${s.color.l} to hold ${need}.`)
    return s.color
  }
  const readsOn = (need: number) => (c: Oklch) => contrast(c, bg) >= need + MARGIN && contrast(c, muted) >= need + MARGIN
  const fg = keep("Text", solve(neutral("fg"), readsOn(TEXT), away), "4.5:1")
  const quiet = keep("Quiet text", solve(neutral("quiet"), readsOn(TEXT), away), "4.5:1")
  const input3 = keep("Control edges", solve(neutral("input"), (c) => contrast(c, bg) >= EDGE + MARGIN, away), "3:1")

  // The key is used as picked in light. Dark lifts it until checked controls hold 3:1.
  const key = tidy(input.key)
  const onBg = (c: Oklch) => contrast(c, bg) >= EDGE + MARGIN
  let primary = key
  if (scheme === "dark" && !onBg(key)) {
    primary = keep("Primary", solve(key, onBg, { min: key.l }), "3:1 on the background")
  }
  const ringBorder =
    scheme === "light"
      ? keep("Focus ring", solve(key, onBg), "3:1")
      : keep("Focus ring", solve(mix(primary, WHITE, 0.65), onBg, { min: bg.l }), "3:1")

  const tone = (start: Oklch, name: string, tintShare: number) =>
    keep(
      name,
      solve(start, (c) => contrast(c, bg) >= TEXT + MARGIN && contrast(c, mix(c, bg, tintShare)) >= TEXT + MARGIN),
      "4.5:1",
    )
  const tones = Object.fromEntries(
    TONE_TOKENS.map((t) => [t, tone(TONES[t][scheme], t.replace("tone-", "").replace(/^./, (x) => x.toUpperCase()), 0.1)]),
  ) as Record<(typeof TONE_TOKENS)[number], Oklch>
  // Destructive text sits on its own button, 8% tint at rest and 14% on hover.
  const destructive = tone(DESTRUCTIVE[scheme], "Destructive", 0.14)

  const charts = chartColors(input, scheme, bg)
  if (!charts.ok) impossible.push(`Chart colors, ${where}: no order of eight colors keeps every pair apart${input.chartsFromKey ? " with the key leading" : ""}.`)
  const seq = sequential(charts.colors[0]!, scheme)

  return {
    "ui-background": bg,
    "ui-foreground": fg,
    "ui-muted": muted,
    "ui-muted-foreground": quiet,
    "ui-border": border,
    "ui-input": input3,
    "ui-primary": primary,
    "ui-primary-foreground": textOn(primary, key.h),
    "ui-ring": { ...primary, alpha: scheme === "light" ? 0.3 : 0.35 },
    "ui-ring-border": ringBorder,
    "ui-destructive": destructive,
    ...tones,
    ...(Object.fromEntries(CHART_TOKENS.map((t, i) => [t, charts.colors[i]!])) as Record<(typeof CHART_TOKENS)[number], Oklch>),
    ...(Object.fromEntries(SEQ_TOKENS.map((t, i) => [t, seq[i]!])) as Record<(typeof SEQ_TOKENS)[number], Oklch>),
  }
}

/** The key's nearest lightness at which every check that hangs on it passes in light. */
function keyFix(input: GeneratorInput): Fix | null {
  const theme = generateUnchecked(input)
  const bg = theme.light["ui-background"]
  const found = nearestLightness(input.key, (c) => contrast(c, bg) >= EDGE + MARGIN, { min: 0.05, max: 0.98 })
  if (!found) return null
  return { label: `Use lightness ${found.l} for the key`, input: { ...input, key: { ...input.key, l: found.l, c: found.c } } }
}

function generateUnchecked(raw: Partial<GeneratorInput>) {
  const input = normalizeInput(raw)
  const notes: string[] = []
  const impossible: string[] = []
  const light = generateScheme(input, "light", notes, impossible)
  const dark = generateScheme(input, "dark", notes, impossible)
  const sizes: Record<SizeToken, string> = {
    "ui-radius": `${Math.round(input.radius * 1000) / 1000}rem`,
    "ui-spacing": SPACING[input.density],
    "ui-font-size": FONT_SIZE[input.textSize],
  }
  return { input, light, dark, sizes, notes, impossible }
}

const ratio = (x: Oklch, y: Oklch) => contrast(x, y)

/** Every pair that matters, in one scheme. */
function checkScheme(theme: ReturnType<typeof generateUnchecked>, scheme: Scheme): Check[] {
  const t = theme[scheme]
  const bg = t["ui-background"]
  const muted = t["ui-muted"]
  const out: Check[] = []
  const add = (group: CheckGroup, id: string, label: string, detail: string, value: number, need: number, kind: Check["kind"] = "contrast", fix: Fix | null = null) =>
    out.push({ id: `${scheme}:${id}`, scheme, group, label, detail, value, need, kind, pass: value >= need, fix })

  add("Text", "text-bg", "Text on background", "ui-foreground on ui-background", ratio(t["ui-foreground"], bg), TEXT)
  add("Text", "text-muted", "Text on muted surfaces", "ui-foreground on ui-muted", ratio(t["ui-foreground"], muted), TEXT)
  add("Text", "quiet-bg", "Quiet text on background", "ui-muted-foreground on ui-background", ratio(t["ui-muted-foreground"], bg), TEXT)
  add("Text", "quiet-muted", "Quiet text on muted surfaces", "ui-muted-foreground on ui-muted", ratio(t["ui-muted-foreground"], muted), TEXT)
  add("Text", "text-primary", "Text on primary", "ui-primary-foreground on ui-primary", ratio(t["ui-primary-foreground"], t["ui-primary"]), TEXT)

  add("Controls", "input-bg", "Control edges", "ui-input on ui-background", ratio(t["ui-input"], bg), EDGE)
  add("Controls", "ring-bg", "Focus ring", "ui-ring-border on ui-background", ratio(t["ui-ring-border"], bg), EDGE)
  add("Controls", "primary-bg", "Checked and selected controls", "ui-primary on ui-background", ratio(t["ui-primary"], bg), EDGE)

  for (const token of [...TONE_TOKENS, "ui-destructive"] as const) {
    const share = token === "ui-destructive" ? 0.14 : 0.1
    const onBg = ratio(t[token], bg)
    const onTint = ratio(t[token], mix(t[token], bg, share))
    const name = token === "ui-destructive" ? "Destructive" : token.slice(5).replace(/^./, (x) => x.toUpperCase())
    add(
      "Status",
      token,
      `${name} as text`,
      onTint < onBg ? `${token} on its ${token === "ui-destructive" ? "button" : "badge"}` : `${token} on ui-background`,
      Math.min(onBg, onTint),
      TEXT,
    )
  }

  const charts = CHART_TOKENS.map((c) => t[c])
  let worst = { value: Infinity, detail: "" }
  charts.forEach((c, i) => {
    const v = ratio(c, bg)
    if (v < worst.value) worst = { value: v, detail: `chart-${i + 1} on ui-background` }
  })
  add("Charts", "chart-bg", "Chart colors on background", worst.detail, worst.value, EDGE)

  let cvdWorst = { value: Infinity, detail: "" }
  let normalWorst = { value: Infinity, detail: "" }
  const seen = charts.map(swatch)
  for (const [i, j] of chartPairs()) {
    const detail = `chart-${i + 1} and chart-${j + 1}`
    const cvd = cvdOf(seen[i]!, seen[j]!)
    const normal = normalOf(seen[i]!, seen[j]!)
    if (cvd < cvdWorst.value) cvdWorst = { value: cvd, detail }
    if (normal < normalWorst.value) normalWorst = { value: normal, detail }
  }
  add("Charts", "chart-cvd", "Chart colors apart with protan and deutan vision", cvdWorst.detail, cvdWorst.value, CVD, "difference")
  add("Charts", "chart-normal", "Chart colors apart with full color vision", normalWorst.detail, normalWorst.value, NORMAL, "difference")
  return out
}

/** The whole theme: tokens for light and dark, every check, and a fix for each one that fails. */
function generateTheme(raw: Partial<GeneratorInput> = {}): Theme {
  const theme = generateUnchecked(raw)
  const checks = SCHEMES.flatMap((s) => checkScheme(theme, s))
  const failing = checks.filter((c) => !c.pass)
  if (failing.length) {
    const fixKey = failing.some((c) => ["text-primary", "primary-bg", "ring-bg"].some((id) => c.id.endsWith(id))) ? keyFix(theme.input) : null
    const fixCharts = theme.input.chartsFromKey ? { label: "Lead the charts with UISet's blue", input: { ...theme.input, chartsFromKey: false } } : null
    for (const check of failing) {
      if (check.id.endsWith("primary-bg") || check.id.endsWith("text-primary") || check.id.endsWith("ring-bg")) check.fix = fixKey
      else if (check.group === "Charts") check.fix = fixCharts
    }
  }
  return { ...theme, checks }
}

/** Every fix, applied until nothing fails or nothing more can be fixed. */
function fixAll(raw: Partial<GeneratorInput>): GeneratorInput {
  let input = normalizeInput(raw)
  for (let i = 0; i < 4; i++) {
    const fix = generateTheme(input).checks.find((c) => !c.pass && c.fix)?.fix
    if (!fix) break
    input = fix.input
  }
  return input
}

/* ------------------------------------------------------------------ the URL */

const r3 = (n: number) => String(Math.round(n * 1000) / 1000)
const r4 = (n: number) => String(Math.round(n * 10000) / 10000)

/** The inputs as a query string, short enough to paste. */
function toQuery(input: GeneratorInput): string {
  const q = new URLSearchParams()
  // Four places, as the key is stored, so a typed hex color comes back exactly.
  q.set("key", `${r4(input.key.l)},${r4(input.key.c)},${r4(input.key.h)}`)
  q.set("tint", r3(input.tint))
  q.set("tintHue", input.neutralHue === null ? "key" : r3(input.neutralHue))
  q.set("radius", r3(input.radius))
  q.set("density", input.density)
  q.set("text", input.textSize)
  q.set("start", input.start)
  q.set("charts", input.chartsFromKey ? "key" : "uiset")
  return q.toString()
}

/** A query string back to inputs; anything missing or malformed takes its default. */
function fromQuery(search: string): GeneratorInput {
  const q = new URLSearchParams(search)
  const [l, c, h] = (q.get("key") ?? "").split(",").map(Number)
  const tintHue = q.get("tintHue")
  return normalizeInput({
    key: l !== undefined && c !== undefined && h !== undefined && [l, c, h].every(Number.isFinite) ? { l, c, h } : defaultInput.key,
    tint: q.has("tint") ? Number(q.get("tint")) : defaultInput.tint,
    neutralHue: tintHue === null || tintHue === "key" ? null : Number(tintHue),
    radius: q.has("radius") ? Number(q.get("radius")) : defaultInput.radius,
    density: (q.get("density") as Density) ?? undefined,
    textSize: (q.get("text") as TextSize) ?? undefined,
    start: (q.get("start") as Start) ?? undefined,
    chartsFromKey: q.get("charts") !== "uiset",
  })
}

export {
  CHART_TOKENS,
  COLOR_TOKENS,
  SCHEMES,
  SEQ_TOKENS,
  SIZE_TOKENS,
  TONE_TOKENS,
  UI_TOKENS,
  chartPairs,
  defaultInput,
  fixAll,
  fromQuery,
  generateTheme,
  normalizeInput,
  presetInput,
  presets,
  toQuery,
}
export type { Check, CheckGroup, ColorToken, Density, Fix, GeneratorInput, Scheme, SchemeColors, SizeToken, Start, TextSize, Theme }
