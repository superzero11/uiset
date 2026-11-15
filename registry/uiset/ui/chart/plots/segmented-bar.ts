// The segmented bar's geometry: one whole split into parts.
import { seriesColor, focusKey, type ChartFrameData, type ChartGeometry, type ChartPlotContext, type ChartPoint } from "../plot"
import { formatValue, numberFormat } from "../scale"
import { tooltipRow, v } from "../vnode"

type SegmentedBarPart = { key: string; label: string; value: number }

type SegmentedBarOptions = {
  /** Up to six parts of one whole, in the order they should read. Fold a long tail into "Other". */
  parts: readonly SegmentedBarPart[]
  format?: (value: number) => string
  /** Reads numbers in this locale; pass it when rendering on a server. */
  locale?: string
  /**
   * "tall" (28px) prints each part's share inside it where it fits; "thin" (8px) is for a
   * bar beside its figures, like in a table row.
   */
  variant?: "tall" | "thin"
}

const GAP = 2

function segmentedParts({ parts, format: formatOption, locale, variant = "tall" }: SegmentedBarOptions) {
  const series = parts.map((p) => ({ key: p.key, label: p.label, shape: "rect" as const }))
  const total = parts.reduce((sum, p) => sum + Math.max(0, p.value), 0)
  const format = numberFormat(locale, formatOption)
  const share = (n: number) =>
    new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: total && n / total < 0.1 ? 1 : 0 }).format(total ? n / total : 0)
  const thick = variant === "tall" ? 28 : 8
  return { series, total, format, share, thick, height: thick + 16 }
}

/** The plot's height: the bar and room around it. */
const segmentedBarHeight = (options: SegmentedBarOptions) => segmentedParts(options).height

function segmentedBarFrame(options: SegmentedBarOptions): ChartFrameData {
  const { parts } = options
  const { series, format, share } = segmentedParts(options)
  return {
    className: "segmented-bar",
    series,
    table: {
      head: ["", "Amount", "Share"],
      numeric: [false, true, true],
      rows: parts.map((p) => ({ key: p.key, cells: [p.label, formatValue(p.value, format), share(p.value)] })),
    },
    rows: () => parts.map((p) => ({ part: p.label, amount: formatValue(p.value, format), share: share(p.value) })),
  }
}

function segmentedBarPlot(options: SegmentedBarOptions, { width, shown, active, selected: pinned }: ChartPlotContext): ChartGeometry {
  const { parts, variant = "tall" } = options
  const { series, total, format, share, thick, height } = segmentedParts(options)
  const shownParts = parts.filter((p) => p.value > 0)
  const gaps = GAP * Math.max(0, shownParts.length - 1)
  const usable = Math.max(0, width - gaps)
  const focus = focusKey(active, pinned, (key) => shownParts.some((p) => p.key === key))
  let x = 0
  const blocks = shownParts.map((p) => {
    const w = total ? (p.value / total) * usable : 0
    const block = { p, x, w }
    x += w + GAP
    return block
  })
  const y = 8
  const points: ChartPoint[] = blocks.map(({ p, x: bx, w }) => ({
    key: p.key,
    label: `${p.label}: ${formatValue(p.value, format)}, ${share(p.value)}`,
    x: bx,
    y: 0,
    width: Math.max(w, 1),
    height,
    anchor: { x: bx + w / 2, y },
  }))
  const svg = blocks.map(({ p, x: bx, w }, i) => {
    const first = i === 0
    const last = i === blocks.length - 1
    const r = variant === "thin" ? thick / 2 : 4
    const text = share(p.value)
    const fits = variant === "tall" && text.length * 7.2 + 16 <= w
    return v(
      "g",
      {
        key: p.key,
        className: "chart-series",
        "data-dim": !shown(p.key) || (focus !== null && focus !== p.key) ? "" : undefined,
        style: { "--series": seriesColor(series, p.key) },
      },
      v("rect", { className: "chart-bar", x: bx, y, width: Math.max(0, w), height: thick, rx: variant === "thin" ? (first || last ? r : 0) : r }),
      fits && v("text", { className: "segmented-bar-label", x: bx + 8, y: y + thick / 2, dy: "0.34em" }, text),
    )
  })
  return {
    svg,
    points,
    tooltip: (key) => {
      const p = parts.find((part) => part.key === key)!
      return [tooltipRow(seriesColor(series, p.key), `${formatValue(p.value, format)} · ${share(p.value)}`, p.label, "rect")]
    },
  }
}

export { segmentedBarFrame, segmentedBarHeight, segmentedBarPlot }
export type { SegmentedBarOptions, SegmentedBarPart }
