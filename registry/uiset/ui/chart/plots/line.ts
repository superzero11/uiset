// The line chart's geometry: lines, areas or stacks over evenly spaced x positions.
import { seriesColor, focusKey, type ChartFrameData, type ChartGeometry, type ChartPlotContext, type ChartPoint, type ChartSeries } from "../plot"
import { formatValue, labelIndexes, linear, numberFormat, point, tickFormatter } from "../scale"
import { tooltipRow, v, type VChild } from "../vnode"

type LineOptions<Datum> = {
  data: readonly Datum[]
  /** The x label for a datum, like "Mar 3". Points are evenly spaced, in data order. */
  x: (datum: Datum) => string
  series: ChartSeries<Datum>[]
  /** Formats values in tooltips, end labels and the table. */
  format?: (value: number) => string
  /** Reads numbers in this locale; pass it when rendering on a server. */
  locale?: string
  /** Lines; lines with a soft area under each; or areas stacked to a total. */
  layout?: "line" | "area" | "stacked"
  /** Keep zero on the axis. Defaults to true; turn off for values far from zero. */
  zero?: boolean
}

const TICK = 12
const charWidth = 6.6

function path(points: readonly ([number, number] | null)[]) {
  let d = ""
  let open = false
  for (const p of points) {
    if (!p) {
      open = false
      continue
    }
    d += `${open ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`
    open = true
  }
  return d
}

/** An area between two edges, one closed shape per unbroken run (gaps stay gaps). */
function areaPath(upper: readonly ([number, number] | null)[], lower: readonly [number, number][]) {
  let d = ""
  let run: number[] = []
  const close = () => {
    if (run.length > 1) {
      d += `M${run.map((i) => `${upper[i]![0].toFixed(1)},${upper[i]![1].toFixed(1)}`).join("L")}`
      d += `L${[...run]
        .reverse()
        .map((i) => `${lower[i]![0].toFixed(1)},${lower[i]![1].toFixed(1)}`)
        .join("L")}Z`
    }
    run = []
  }
  upper.forEach((p, i) => (p ? run.push(i) : close()))
  close()
  return d
}

function lineParts<Datum>({ data, x, series, format, locale, layout = "line" }: LineOptions<Datum>) {
  const stacked = layout === "stacked"
  const filled = layout !== "line"
  const fmt = numberFormat(locale, format)
  const labels = data.map(x)
  const value = (s: ChartSeries<Datum>, d: Datum) => {
    const n = s.value(d)
    return n === null || n === undefined || !Number.isFinite(n) ? null : n
  }
  const total = (list: readonly ChartSeries<Datum>[], d: Datum) => list.reduce((sum, s) => sum + (value(s, d) ?? 0), 0)
  return { stacked, filled, fmt, labels, value, total }
}

function lineFrame<Datum>(options: LineOptions<Datum>): ChartFrameData {
  const { data, series } = options
  const { stacked, filled, fmt, labels, value, total } = lineParts(options)
  return {
    className: ["line-chart", stacked && "chart-stacked"].filter(Boolean).join(" "),
    series: series.map((s) => ({ key: s.key, label: s.label, shape: filled ? "rect" : "line" })),
    table: {
      head: ["", ...series.map((s) => s.label), ...(stacked ? ["Total"] : [])],
      numeric: [false, ...series.map(() => true), ...(stacked ? [true] : [])],
      rows: data.map((d, i) => ({
        key: `${i}`,
        cells: [labels[i]!, ...series.map((s) => formatValue(value(s, d), fmt)), ...(stacked ? [fmt(total(series, d))] : [])],
      })),
    },
    rows: () =>
      data.map((d, i) => {
        const row: Record<string, string> = { x: labels[i]! }
        for (const s of series) row[s.label] = formatValue(value(s, d), fmt)
        return row
      }),
  }
}

function linePlot<Datum>(options: LineOptions<Datum>, { width, height: h, shown, active, selected: pinned }: ChartPlotContext): ChartGeometry {
  const { data, series, locale, zero = true } = options
  const { stacked, filled, fmt, labels, value, total } = lineParts(options)
  const keyOf = (index: number) => `${index}`
  const visible = series.filter((s) => shown(s.key))
  const lastIndex = data.length - 1
  // The axis covers every edge drawn: values for lines; each running total for stacks, so a
  // negative layer never pushes another off the plot.
  const extents: number[] = []
  for (const d of data) {
    let sum = 0
    for (const s of visible) {
      const n = value(s, d)
      if (stacked) {
        sum += n ?? 0
        extents.push(sum)
      } else if (n !== null) extents.push(n)
    }
  }
  const top = 8
  const bottom = 28
  const y = linear(extents, [h - bottom, top], { zero: zero || filled })
  const yLabel = tickFormatter(y.ticks, locale)
  const left = Math.max(0, ...y.ticks.map((t) => yLabel(t).length)) * charWidth + TICK
  // Direct labels at line ends for two to four series, when they don't collide.
  const ends =
    lastIndex >= 0
      ? visible.map((s) => ({ s, n: value(s, data[lastIndex]!) })).filter((e): e is { s: ChartSeries<Datum>; n: number } => e.n !== null)
      : []
  const labelEnds = !stacked && visible.length > 1 && visible.length <= 4 && ends.length > 0
  const right = labelEnds ? Math.min(140, Math.max(0, ...ends.map((e) => e.s.label.length)) * charWidth + 16) : 12
  const px = point(data.length, [left, width - right])
  const baseline = y(Math.max(y.domain[0], Math.min(0, y.domain[1])))

  const base = data.map(() => 0)
  const marks = visible.map((s) => {
    const color = seriesColor(series, s.key)
    const tops = data.map((d, i) => {
      const n = value(s, d)
      if (n === null) return null
      return [px(i), y(stacked ? base[i]! + n : n)] as [number, number]
    })
    let fill: string | null = null
    if (filled) {
      const lower = data.map((_, i) => [px(i), stacked ? y(base[i]!) : baseline] as [number, number])
      fill = areaPath(tops, lower)
    }
    if (stacked) data.forEach((d, i) => (base[i] = base[i]! + (value(s, d) ?? 0)))
    return { s, color, line: path(tops), fill, tops }
  })

  const focusIndex = Number(focusKey(active, pinned, (key) => /^\d+$/.test(key) && Number(key) < data.length) ?? NaN)
  const xLabels = labelIndexes(data.length, Math.max(2, Math.floor((width - left - right) / 84)))

  // Each position's target runs halfway to its neighbors, so the pointer only has to be
  // nearest to an x, never on a 2px line.
  const edge = (i: number) => (i <= 0 ? left : i > lastIndex ? width - right : (px(i - 1) + px(i)) / 2)
  const points: ChartPoint[] = data.map((d, i) => {
    const readings = visible.map((s) => `${s.label} ${formatValue(value(s, d), fmt)}`)
    if (stacked && visible.length > 1) readings.push(`total ${fmt(total(visible, d))}`)
    const tops = marks.map((m) => m.tops[i]?.[1]).filter((n): n is number => n !== undefined)
    return {
      key: keyOf(i),
      label: `${labels[i]}: ${readings.join(", ")}`,
      x: edge(i),
      y: top,
      width: edge(i + 1) - edge(i),
      height: h - top - bottom,
      anchor: { x: px(i), y: Math.min(h - bottom, ...tops) },
    }
  })

  let endLabels: VChild[] = []
  if (labelEnds) {
    const placed = marks
      .map((m) => ({ m, end: m.tops[lastIndex] }))
      .filter((e): e is { m: (typeof marks)[number]; end: [number, number] } => !!e.end)
      .sort((a, b) => a.end[1] - b.end[1])
    const collide = placed.some((p, i) => i > 0 && p.end[1] - placed[i - 1]!.end[1] < 14)
    if (!collide)
      endLabels = placed.map(({ m, end }) => v("text", { key: `end-${m.s.key}`, className: "chart-end-label", x: end[0] + 10, y: end[1], dy: "0.32em" }, m.s.label))
  }

  const svg: VChild[] = [
    v("g", { key: "grid", className: "chart-grid" }, ...y.ticks.map((t) => v("line", { key: t, x1: left, x2: width - right, y1: y(t), y2: y(t), "data-zero": t === 0 ? "" : undefined }))),
    v("g", { key: "y", className: "chart-axis-labels", "data-axis": "y" }, ...y.ticks.map((t) => v("text", { key: t, x: left - 8, y: y(t), dy: "0.32em", textAnchor: "end" }, yLabel(t)))),
    v(
      "g",
      { key: "x", className: "chart-axis-labels", "data-axis": "x" },
      ...xLabels.map((i) =>
        v(
          "text",
          { key: i, x: px(i), y: h - bottom + 18, textAnchor: data.length > 1 && i === 0 ? "start" : data.length > 1 && i === lastIndex ? "end" : "middle" },
          labels[i],
        ),
      ),
    ),
    Number.isFinite(focusIndex) && v("line", { key: "crosshair", className: "chart-crosshair", x1: px(focusIndex), x2: px(focusIndex), y1: top, y2: h - bottom }),
    ...marks.map((m) => {
      const end = lastIndex >= 0 ? m.tops[lastIndex] : null
      const at = Number.isFinite(focusIndex) ? m.tops[focusIndex] : null
      return v(
        "g",
        { key: m.s.key, className: "chart-series", style: { "--series": m.color } },
        m.fill && v("path", { className: "chart-area", d: m.fill }),
        v("path", { className: "chart-line", d: m.line }),
        end && !Number.isFinite(focusIndex) && v("circle", { className: "chart-dot", cx: end[0], cy: end[1], r: 4 }),
        at && v("circle", { className: "chart-dot", "data-active": "", cx: at[0], cy: at[1], r: 4.5 }),
      )
    }),
    ...endLabels,
  ]

  return {
    svg,
    points,
    tooltip: (key) => {
      const i = Number(key)
      const d = data[i]
      if (d === undefined) return null
      return [
        v("span", { key: "title", className: "chart-tooltip-title" }, labels[i]),
        ...visible.map((s) => tooltipRow(seriesColor(series, s.key), formatValue(value(s, d), fmt), s.label, filled ? "rect" : "line", s.key)),
        stacked && visible.length > 1 && v("span", { key: "total", className: "chart-tooltip-total" }, v("strong", {}, fmt(total(visible, d))), " total"),
      ]
    },
  }
}

export { lineFrame, linePlot }
export type { LineOptions }
