// The bar chart's geometry: grouped or stacked bars, rising or running sideways.
import { seriesColor, focusKey, type ChartFrameData, type ChartGeometry, type ChartPlotContext, type ChartPoint, type ChartSeries } from "../plot"
import { band, formatValue, linear, numberFormat, tickFormatter } from "../scale"
import { tooltipRow, v as node, type VChild } from "../vnode"

type BarOptions<Datum> = {
  data: readonly Datum[]
  /** The category a datum belongs to, like "North" or "Mar". */
  x: (datum: Datum) => string
  series: ChartSeries<Datum>[]
  format?: (value: number) => string
  /** Reads numbers in this locale; pass it when rendering on a server. */
  locale?: string
  /** Columns rise (vertical, the default); bars run sideways (horizontal, for long names). */
  orientation?: "vertical" | "horizontal"
  /** Several series side by side, or stacked to a total. */
  layout?: "grouped" | "stacked"
  /** Rank categories by their total. */
  sort?: "descending" | "ascending"
  /** Print each bar's value at its tip, where it fits. Defaults to one series and few bars. */
  labels?: boolean
}

const MAX_THICKNESS = 24
const GAP = 2
const RADIUS = 4
const charWidth = 6.6

/** A bar with a 4px rounded data end and a square end at the baseline. */
function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  end: "top" | "bottom" | "right" | "left" | "none",
) {
  const r = Math.min(RADIUS, width / 2, height / 2)
  if (end === "none" || r <= 0) return `M${x},${y}h${width}v${height}h${-width}Z`
  if (end === "top")
    return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`
  if (end === "bottom")
    return `M${x},${y}V${y + height - r}Q${x},${y + height} ${x + r},${y + height}H${x + width - r}Q${x + width},${y + height} ${x + width},${y + height - r}V${y}Z`
  if (end === "right")
    return `M${x},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height - r}Q${x + width},${y + height} ${x + width - r},${y + height}H${x}Z`
  return `M${x + width},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + height - r}Q${x},${y + height} ${x + r},${y + height}H${x + width}Z`
}

function barParts<Datum>({ data, x, series, format, locale, sort, layout = "grouped" }: BarOptions<Datum>) {
  const value = (s: ChartSeries<Datum>, d: Datum) => {
    const n = s.value(d)
    return n === null || n === undefined || !Number.isFinite(n) ? null : n
  }
  const total = (d: Datum) => series.reduce((sum, s) => sum + (value(s, d) ?? 0), 0)
  const rows = sort ? [...data].sort((a, b) => (sort === "descending" ? total(b) - total(a) : total(a) - total(b))) : [...data]
  const categories = rows.map(x)
  // Positions are keyed by the datum's place in `data`, so `onSelect("2")` always means
  // data[2], however the bars are sorted.
  const indexOf = new Map(data.map((d, i) => [d, i]))
  const keyOf = (d: Datum) => String(indexOf.get(d))
  const fmt = numberFormat(locale, format)
  const stackedLayout = layout === "stacked" && series.length > 1
  return { value, total, rows, categories, keyOf, fmt, stackedLayout }
}

/** The plot's height: given, or enough for every bar running sideways. */
function barHeight<Datum>(options: BarOptions<Datum>, height?: number) {
  return height ?? (options.orientation === "horizontal" ? Math.max(160, options.data.length * 36 + 40) : 240)
}

function barFrame<Datum>(options: BarOptions<Datum>): ChartFrameData {
  const { series, orientation = "vertical" } = options
  const { value, total, rows, categories, keyOf, fmt, stackedLayout } = barParts(options)
  return {
    className: "bar-chart",
    orientation: orientation === "horizontal" ? "vertical" : "horizontal",
    series: series.map((s) => ({ key: s.key, label: s.label, shape: "rect" })),
    table: {
      head: ["", ...series.map((s) => s.label), ...(stackedLayout ? ["Total"] : [])],
      numeric: [false, ...series.map(() => true), ...(stackedLayout ? [true] : [])],
      rows: rows.map((d, i) => ({
        key: keyOf(d),
        cells: [categories[i]!, ...series.map((s) => formatValue(value(s, d), fmt)), ...(stackedLayout ? [fmt(total(d))] : [])],
      })),
    },
    rows: () =>
      rows.map((d, i) => {
        const row: Record<string, string> = { category: categories[i]! }
        for (const s of series) row[s.label] = formatValue(value(s, d), fmt)
        return row
      }),
  }
}

function barPlot<Datum>(options: BarOptions<Datum>, { width, height: h, shown, active, selected: pinned }: ChartPlotContext): ChartGeometry {
  const { data, x, series, locale, layout = "grouped", labels } = options
  const horizontal = options.orientation === "horizontal"
  const { value, rows, categories, keyOf, fmt } = barParts(options)
  const visible = series.filter((s) => shown(s.key))
  const stacked = layout === "stacked" && visible.length > 1
  const extents = rows.flatMap((d) => {
    if (!stacked) return visible.map((s) => value(s, d) ?? 0)
    let up = 0
    let down = 0
    for (const s of visible) {
      const v = value(s, d) ?? 0
      if (v >= 0) up += v
      else down += v
    }
    return [up, down]
  })
  const top = horizontal ? 4 : 18
  const bottom = horizontal ? 24 : 28
  const categoryWidth = horizontal
    ? Math.min(180, Math.max(0, ...categories.map((c) => c.length)) * charWidth + 12)
    : 0
  // Value axis first, so its labels can size the margin.
  const provisional = linear(extents, [0, 1])
  const tickLabel = tickFormatter(provisional.ticks, locale)
  const shownTotal = (d: Datum) => visible.reduce((sum, s) => sum + (value(s, d) ?? 0), 0)
  const tallest = (d: Datum) =>
    stacked ? shownTotal(d) : Math.max(0, ...visible.map((s) => value(s, d) ?? 0))
  const valueLabelWidth = Math.max(...provisional.ticks.map((t) => tickLabel(t).length)) * charWidth
  const left = horizontal ? categoryWidth : valueLabelWidth + 12
  const right = horizontal ? 48 : 8
  const v = horizontal
    ? linear(extents, [left, width - right])
    : linear(extents, [h - bottom, top])
  const c = horizontal
    ? band(categories, [top, h - bottom], 0.35)
    : band(categories, [left, width - right], 0.35)
  const groupCount = stacked ? 1 : Math.max(1, visible.length)
  const thickness = Math.max(
    2,
    Math.min(MAX_THICKNESS, (c.bandwidth - GAP * (groupCount - 1)) / groupCount),
  )
  const groupSpan = thickness * groupCount + GAP * (groupCount - 1)
  const zero = v(0)
  const focus = focusKey(active, pinned, (key) => rows.some((d) => keyOf(d) === key))
  const showLabels =
    labels ?? (visible.length === 1 && categories.length <= (horizontal ? 24 : 12))

  type Label = { x: number; y: number; text: string; anchor: "start" | "middle" | "end" }
  type Bar = { key: string; series: string; d: string; color: string; label?: Label }
  const bars: Bar[] = []
  rows.forEach((d, i) => {
    const start = c(categories[i]!) + (c.bandwidth - groupSpan) / 2
    let up = 0
    let down = 0
    const stackTop = stacked
      ? visible.filter((s) => (value(s, d) ?? 0) > 0).at(-1)?.key
      : undefined
    const stackBottom = stacked
      ? visible.filter((s) => (value(s, d) ?? 0) < 0).at(-1)?.key
      : undefined
    visible.forEach((s, j) => {
      const raw = value(s, d)
      if (raw === null || raw === 0) return
      const offsetIndex = stacked ? 0 : j
      const pos = start + offsetIndex * (thickness + GAP)
      const from = stacked ? (raw >= 0 ? up : down) : 0
      const to = from + raw
      if (stacked) {
        if (raw >= 0) up = to
        else down = to
      }
      const a = v(from)
      const b = v(to)
      // The 2px surface gap between stacked segments.
      const gap = stacked && from !== 0 ? GAP : 0
      const isEnd = !stacked || s.key === (raw >= 0 ? stackTop : stackBottom)
      let path: string
      let label: Label | undefined
      const text = formatValue(raw, fmt)
      if (horizontal) {
        const x0 = Math.min(a, b) + (raw >= 0 ? gap : 0)
        const len = Math.max(0, Math.abs(b - a) - gap)
        path = barPath(x0, pos, len, thickness, isEnd ? (raw >= 0 ? "right" : "left") : "none")
        if (showLabels && !stacked)
          label =
            raw >= 0
              ? { x: x0 + len + 6, y: pos + thickness / 2, text, anchor: "start" }
              : { x: x0 - 6, y: pos + thickness / 2, text, anchor: "end" }
      } else {
        const y0 = Math.min(a, b)
        const len = Math.max(0, Math.abs(b - a) - gap)
        path = barPath(pos, raw >= 0 ? y0 : y0 + gap, thickness, len, isEnd ? (raw >= 0 ? "top" : "bottom") : "none")
        const fits = text.length * charWidth <= c.step - 4
        if (showLabels && !stacked && fits)
          label = {
            x: pos + thickness / 2,
            y: raw >= 0 ? y0 - 6 : y0 + len + 14,
            text,
            anchor: "middle",
          }
      }
      bars.push({
        key: keyOf(d),
        series: s.key,
        d: path,
        color: seriesColor(series, s.key),
        label,
      })
    })
  })

  const points: ChartPoint[] = rows.map((d, i) => {
    const start = c(categories[i]!) - (c.step - c.bandwidth) / 2
    const readings = visible.map(
      (s) => `${visible.length > 1 ? `${s.label} ` : ""}${formatValue(value(s, d), fmt)}`,
    )
    // A stack's total is in its reading and the table, not only the tooltip.
    if (stacked) readings.push(`total ${fmt(shownTotal(d))}`)
    const reading = `${categories[i]}: ${readings.join(", ")}`
    return horizontal
      ? {
          key: keyOf(d),
          label: reading,
          x: 0,
          y: start,
          width: width,
          height: c.step,
          anchor: { x: Math.max(zero, v(tallest(d))), y: start + c.step / 2 },
        }
      : {
          key: keyOf(d),
          label: reading,
          x: start,
          y: top,
          width: c.step,
          height: h - top - bottom + 22,
          anchor: { x: start + c.step / 2, y: Math.min(zero, v(tallest(d))) },
        }
  })

  const svg: VChild[] = [
    node(
      "g",
      { key: "grid", className: "chart-grid" },
      ...v.ticks.map((t) =>
        horizontal
          ? node("line", { key: t, x1: v(t), x2: v(t), y1: top, y2: h - bottom, "data-zero": t === 0 ? "" : undefined })
          : node("line", { key: t, x1: left, x2: width - right, y1: v(t), y2: v(t), "data-zero": t === 0 ? "" : undefined }),
      ),
    ),
    node(
      "g",
      { key: "value", className: "chart-axis-labels", "data-axis": "value" },
      ...v.ticks.map((t) =>
        horizontal
          ? node("text", { key: t, x: v(t), y: h - bottom + 16, textAnchor: "middle" }, tickLabel(t))
          : node("text", { key: t, x: left - 8, y: v(t), dy: "0.32em", textAnchor: "end" }, tickLabel(t)),
      ),
    ),
    node(
      "g",
      { key: "category", className: "chart-axis-labels", "data-axis": "category" },
      ...categories.map((name, i) => {
        const center = c(name) + c.bandwidth / 2
        const every = horizontal ? 1 : Math.max(1, Math.ceil((name.length * charWidth + 8) / c.step))
        if (i % every !== 0) return null
        return horizontal
          ? node(
              "text",
              { key: i, x: left - 8, y: center, dy: "0.32em", textAnchor: "end" },
              name.length * charWidth > categoryWidth - 12 ? `${name.slice(0, Math.floor((categoryWidth - 24) / charWidth))}…` : name,
            )
          : node("text", { key: i, x: center, y: h - bottom + 18, textAnchor: "middle" }, name)
      }),
    ),
    ...bars.map((bar) =>
      node("path", {
        key: `${bar.key}-${bar.series}`,
        className: "chart-bar",
        d: bar.d,
        "data-dim": focus !== null && focus !== bar.key ? "" : undefined,
        style: { "--series": bar.color },
      }),
    ),
    ...bars.map((bar) =>
      bar.label
        ? node(
            "text",
            {
              key: `label-${bar.key}-${bar.series}`,
              className: "chart-value-label",
              x: bar.label.x,
              y: bar.label.y,
              dy: horizontal ? "0.32em" : undefined,
              textAnchor: bar.label.anchor,
            },
            bar.label.text,
          )
        : null,
    ),
  ]

  return {
    svg,
    points,
    tooltip: (key) => {
      const d = data[Number(key)]
      if (d === undefined) return null
      return [
        node("span", { key: "title", className: "chart-tooltip-title" }, x(d)),
        ...visible.map((s) => tooltipRow(seriesColor(series, s.key), formatValue(value(s, d), fmt), s.label, "rect", s.key)),
        stacked && node("span", { key: "total", className: "chart-tooltip-total" }, node("strong", {}, fmt(shownTotal(d))), " total"),
      ]
    },
  }
}

export { barFrame, barHeight, barPlot }
export type { BarOptions }
