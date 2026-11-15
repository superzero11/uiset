// The sparkline's geometry: a line, an area or bars in a small box, and a name that says
// where the values went. React and the web element draw the same nodes.
import { extent, formatValue } from "../scale"
import { v, type VChild } from "../vnode"

type SparklineOptions = {
  /** The values, oldest first. Gaps (null) break the line. */
  values: readonly (number | null)[]
  /** What the values are, for the accessible name: "Revenue, last 12 weeks". */
  label: string
  format?: (value: number) => string
  /** Reads numbers in this locale; pass it when rendering on a server. */
  locale?: string
  /** "line" (default), "area" for a wash under it, or "bar" for counts. */
  variant?: "line" | "area" | "bar"
  width?: number
  height?: number
}

/** The sparkline's accessible name and its drawing. */
function sparklinePlot({ values, label, format, locale, variant = "line", width = 96, height = 28 }: SparklineOptions): { name: string; svg: VChild[] } {
  const finite = values.filter((n): n is number => n !== null && Number.isFinite(n))
  const first = finite[0]
  const last = finite.at(-1)
  const [low, high] = extent(finite)
  const min = low ?? 0
  const max = high ?? 0
  const read = (n: number | undefined) => formatValue(n, format, locale)
  const name = first === undefined ? `${label}: no data` : `${label}: from ${read(first)} to ${read(last)}, low ${read(min)}, high ${read(max)}`
  const pad = 3
  // Bars grow from zero, so zero is always inside the box, below or above every bar.
  const lo = variant === "bar" ? Math.min(0, min) : min
  const hi = variant === "bar" ? Math.max(0, max) : max
  const span = hi - lo || 1
  const y = (n: number) => height - pad - ((n - lo) / span) * (height - pad * 2)
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0
  const x = (i: number) => (values.length > 1 ? pad + i * step : width / 2)
  // A line, and an area per unbroken run, so a gap stays a gap.
  let d = ""
  let wash = ""
  let run: number[] = []
  const closeRun = () => {
    if (run.length > 1)
      wash += `M${run.map((i) => `${x(i).toFixed(1)},${y(values[i]!).toFixed(1)}`).join("L")}L${x(run.at(-1)!).toFixed(1)},${height - pad}L${x(run[0]!).toFixed(1)},${height - pad}Z`
    run = []
  }
  values.forEach((n, i) => {
    if (n === null || !Number.isFinite(n)) {
      closeRun()
      return
    }
    d += `${run.length ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`
    run.push(i)
  })
  closeRun()
  const lastIndex = values.findLastIndex((n) => n !== null && Number.isFinite(n))
  const barWidth = Math.max(1, Math.min(6, (width - pad * 2) / values.length - 1))
  const svg: VChild[] =
    variant === "bar"
      ? values.map((n, i) =>
          n === null || !Number.isFinite(n)
            ? null
            : v("rect", { key: i, className: "chart-bar", x: pad + (i * (width - pad * 2)) / values.length, y: Math.min(y(n), y(0)), width: barWidth, height: Math.max(1, Math.abs(y(n) - y(0))), rx: 1 }),
        )
      : [
          variant === "area" && wash ? v("path", { key: "area", className: "chart-area", d: wash }) : null,
          v("path", { key: "line", className: "chart-line sparkline-line", d }),
          lastIndex >= 0 ? v("circle", { key: "end", className: "chart-dot", cx: x(lastIndex), cy: y(values[lastIndex]!), r: 2.75 }) : null,
        ]
  return { name, svg }
}

/** The chart slot's color, 1 to 8. */
const sparklineColor = (slot = 1) => `var(--chart-${Math.min(8, Math.max(1, slot))})`

export { sparklineColor, sparklinePlot }
export type { SparklineOptions }
