// Framework-free scales and ticks for UISet charts. Pure functions, so they run on a
// server and in tests, and every chart shares one idea of "a nice axis".

type Linear = {
  (value: number): number
  domain: [number, number]
  range: [number, number]
  ticks: number[]
  invert: (pixel: number) => number
}

// 1, 2, 2.5, 5 × 10^n: steps people read without effort.
function niceStep(span: number, count: number) {
  const raw = span / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * power
}

/** Rounds a domain out to nice steps and lists its ticks. Zero stays in when asked. */
function niceDomain(min: number, max: number, count = 5, zero = true) {
  let lo = zero ? Math.min(0, min) : min
  let hi = zero ? Math.max(0, max) : max
  if (lo === hi) {
    hi = lo === 0 ? 1 : lo + Math.abs(lo) * 0.5
    if (!zero) lo -= Math.abs(lo) * 0.5 || 1
  }
  const step = niceStep(hi - lo, count)
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)))
  return { domain: [lo, hi] as [number, number], ticks }
}

/** The smallest and largest finite values, or undefined for none. A loop, so any length works. */
function extent(values: readonly (number | null | undefined)[]): [number | undefined, number | undefined] {
  let lo: number | undefined
  let hi: number | undefined
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    if (lo === undefined || v < lo) lo = v
    if (hi === undefined || v > hi) hi = v
  }
  return [lo, hi]
}

function linear(
  values: readonly number[],
  range: [number, number],
  { count = 5, zero = true, domain }: { count?: number; zero?: boolean; domain?: [number, number] } = {},
): Linear {
  const [lo, hi] = extent(values)
  const nice = domain
    ? niceDomain(domain[0], domain[1], count, false)
    : niceDomain(lo ?? 0, hi ?? 1, count, zero)
  const [d0, d1] = nice.domain
  const [r0, r1] = range
  const scale = ((value: number) => r0 + ((value - d0) / (d1 - d0 || 1)) * (r1 - r0)) as Linear
  scale.domain = nice.domain
  scale.range = range
  scale.ticks = nice.ticks
  scale.invert = (pixel) => d0 + ((pixel - r0) / (r1 - r0 || 1)) * (d1 - d0)
  return scale
}

type Band = {
  (key: string): number
  bandwidth: number
  step: number
  keys: readonly string[]
}

/** Even bands for categories, with an inner gap between them and an outer margin. */
function band(keys: readonly string[], range: [number, number], padding = 0.3): Band {
  const [r0, r1] = range
  const n = Math.max(1, keys.length)
  const step = (r1 - r0) / (n + padding)
  const bandwidth = step * (1 - padding)
  const index = new Map(keys.map((key, i) => [key, i]))
  const scale = ((key: string) => r0 + step * padding + step * (index.get(key) ?? 0)) as Band
  scale.bandwidth = bandwidth
  scale.step = step
  scale.keys = keys
  return scale
}

/** Points spread evenly across the range, for x positions of a line. */
function point(count: number, range: [number, number]) {
  const [r0, r1] = range
  return (index: number) => (count <= 1 ? (r0 + r1) / 2 : r0 + ((r1 - r0) * index) / (count - 1))
}

/** Axis labels: full under 10,000, compact past it (10K, 1.2M), one style per axis. */
function tickFormatter(ticks: readonly number[], locale?: string) {
  const top = Math.max(...ticks.map(Math.abs))
  const compact = top >= 10000
  const step = ticks.length > 1 ? Math.abs(ticks[1]! - ticks[0]!) : 1
  // As many decimals as the step has (0.25 → 2), so ticks never round onto each other.
  const digits = Math.min(4, (String(Number(step.toFixed(10))).split(".")[1] ?? "").length)
  const format = new Intl.NumberFormat(locale, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : digits,
  })
  return (value: number) => format.format(value)
}

/** Picks up to `count` evenly spaced indexes to label, always keeping the first and last. */
function labelIndexes(length: number, count: number) {
  if (length <= count) return Array.from({ length }, (_, i) => i)
  const step = Math.ceil((length - 1) / (count - 1))
  const picked: number[] = []
  for (let i = 0; i < length; i += step) picked.push(i)
  if (picked.at(-1) !== length - 1) {
    if (length - 1 - picked.at(-1)! < step / 2) picked.pop()
    picked.push(length - 1)
  }
  return picked
}

type ChartValue = number | null | undefined

/**
 * A value formatter: yours, or plain numbers in `locale`. Pass a locale when rendering on
 * a server, so server and browser print the same digits.
 */
function numberFormat(locale?: string, format?: (value: number) => string): (value: number) => string {
  return format ?? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format
}

/** A value as a person reads it, or "No data" for a gap. */
function formatValue(value: ChartValue, format?: (value: number) => string, locale?: string) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "No data"
    : numberFormat(locale, format)(value)
}

export {
  band,
  extent,
  formatValue,
  labelIndexes,
  linear,
  niceDomain,
  niceStep,
  numberFormat,
  point,
  tickFormatter,
}
export type { Band, ChartValue, Linear }
