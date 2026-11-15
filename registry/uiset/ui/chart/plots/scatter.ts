// The scatter chart's geometry: two measures per item, in up to three groups.
import { seriesColor, focusKey, type ChartFrameData, type ChartGeometry, type ChartPlotContext, type ChartPoint } from "../plot"
import { formatValue, linear, numberFormat, tickFormatter } from "../scale"
import { tooltipRow, v, type VChild } from "../vnode"

type ScatterSeries<Datum> = {
  key: string
  label: string
  /** Which data belong to this series. */
  match: (datum: Datum) => boolean
}

type ScatterOptions<Datum> = {
  data: readonly Datum[]
  /** Names each point in readings and tooltips: "Acme". */
  label: (datum: Datum) => string
  x: (datum: Datum) => number
  y: (datum: Datum) => number
  xLabel: string
  yLabel: string
  /** Up to three groups. Every pair must stay apart for color-blind readers, so no more. */
  series?: ScatterSeries<Datum>[]
  formatX?: (value: number) => string
  formatY?: (value: number) => string
  /** Reads numbers in this locale; pass it when rendering on a server. */
  locale?: string
}

const charWidth = 6.6
const HIT = 24

function scatterParts<Datum>({ data, x, y, yLabel, series, formatX: fx, formatY: fy, locale }: ScatterOptions<Datum>) {
  const formatX = numberFormat(locale, fx)
  const formatY = numberFormat(locale, fy)
  const groups = (series ?? [{ key: "all", label: yLabel, match: () => true }]).slice(0, 3)
  const groupOf = (d: Datum) => groups.find((g) => g.match(d))
  // Data order for the keyboard is left to right, then bottom to top.
  const ordered = data
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => Number.isFinite(x(d)) && Number.isFinite(y(d)) && groupOf(d))
    .sort((a, b) => x(a.d) - x(b.d) || y(a.d) - y(b.d))
  return { formatX, formatY, groups, groupOf, ordered }
}

function scatterFrame<Datum>(options: ScatterOptions<Datum>): ChartFrameData {
  const { label, x, y, xLabel, yLabel, series } = options
  const { formatX, formatY, groups, groupOf, ordered } = scatterParts(options)
  return {
    className: "scatter-chart",
    nearest: true,
    series: groups.map((g) => ({ key: g.key, label: g.label, shape: "dot" })),
    table: {
      head: ["", xLabel, yLabel, ...(series ? ["Group"] : [])],
      numeric: [false, true, true, false],
      rows: ordered.map(({ d, i }) => ({
        key: `${i}`,
        cells: [label(d), formatValue(x(d), formatX), formatValue(y(d), formatY), ...(series ? [groupOf(d)!.label] : [])],
      })),
    },
    rows: () =>
      ordered.map(({ d }) => ({
        name: label(d),
        [xLabel]: formatValue(x(d), formatX),
        [yLabel]: formatValue(y(d), formatY),
        ...(series ? { group: groupOf(d)!.label } : {}),
      })),
  }
}

function scatterPlot<Datum>(options: ScatterOptions<Datum>, { width, height: h, shown, active, selected: pinned }: ChartPlotContext): ChartGeometry {
  const { label, x, y, xLabel, yLabel, series, locale } = options
  const { formatX, formatY, groups, groupOf, ordered } = scatterParts(options)
  const visible = ordered.filter(({ d }) => shown(groupOf(d)!.key))
  const top = 10
  const bottom = 44
  const yScale = linear(visible.map(({ d }) => y(d)), [h - bottom, top], { zero: false })
  const yTick = tickFormatter(yScale.ticks, locale)
  const left = Math.max(0, ...yScale.ticks.map((t) => yTick(t).length)) * charWidth + 14
  const right = 12
  const xScale = linear(visible.map(({ d }) => x(d)), [left, width - right], { zero: false })
  const xTick = tickFormatter(xScale.ticks, locale)
  const focus = focusKey(active, pinned, (key) => visible.some(({ i }) => `${i}` === key))

  const points: ChartPoint[] = visible.map(({ d, i }) => {
    const cx = xScale(x(d))
    const cy = yScale(y(d))
    return {
      key: `${i}`,
      label: `${label(d)}: ${xLabel} ${formatValue(x(d), formatX)}, ${yLabel} ${formatValue(y(d), formatY)}${series ? `, ${groupOf(d)!.label}` : ""}`,
      x: cx - HIT / 2,
      y: cy - HIT / 2,
      width: HIT,
      height: HIT,
      anchor: { x: cx, y: cy - 4 },
    }
  })

  const svg: VChild[] = [
    v(
      "g",
      { key: "grid", className: "chart-grid" },
      ...yScale.ticks.map((t) => v("line", { key: `y${t}`, x1: left, x2: width - right, y1: yScale(t), y2: yScale(t) })),
      ...xScale.ticks.map((t) => v("line", { key: `x${t}`, x1: xScale(t), x2: xScale(t), y1: top, y2: h - bottom })),
    ),
    v(
      "g",
      { key: "labels", className: "chart-axis-labels" },
      ...yScale.ticks.map((t) => v("text", { key: `y${t}`, x: left - 8, y: yScale(t), dy: "0.32em", textAnchor: "end" }, yTick(t))),
      ...xScale.ticks.map((t) => v("text", { key: `x${t}`, x: xScale(t), y: h - bottom + 16, textAnchor: "middle" }, xTick(t))),
      v("text", { key: "x-title", className: "chart-axis-title", x: (left + width - right) / 2, y: h - 6, textAnchor: "middle" }, xLabel),
      v("text", { key: "y-title", className: "chart-axis-title", x: left, y: top - 2, dy: "-0.2em", textAnchor: "start" }, yLabel),
    ),
    ...visible.map(({ d, i }) =>
      v("circle", {
        key: i,
        className: "chart-dot",
        "data-active": focus === `${i}` ? "" : undefined,
        "data-dim": focus !== null && focus !== `${i}` ? "" : undefined,
        cx: xScale(x(d)),
        cy: yScale(y(d)),
        r: focus === `${i}` ? 6 : 4.5,
        style: { "--series": seriesColor(groups, groupOf(d)!.key) },
      }),
    ),
  ]
  return {
    svg,
    points,
    tooltip: (key) => {
      const found = ordered.find(({ i }) => `${i}` === key)
      if (!found) return null
      const { d } = found
      const color = seriesColor(groups, groupOf(d)!.key)
      return [
        v("span", { key: "title", className: "chart-tooltip-title" }, label(d)),
        tooltipRow(color, formatValue(x(d), formatX), xLabel, "dot", "x"),
        tooltipRow(color, formatValue(y(d), formatY), yLabel, "dot", "y"),
      ]
    },
  }
}

export { scatterFrame, scatterPlot }
export type { ScatterOptions, ScatterSeries }
