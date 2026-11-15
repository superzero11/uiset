// What every chart hands its frame, framework-free: the series for the legend, the table
// twin, rows for agents, and, for a given size, the drawing and the data positions.
import type { ChartValue } from "./scale"
import type { VChild, VNode } from "./vnode"

type ChartSeries<Datum> = {
  key: string
  label: string
  value: (datum: Datum) => ChartValue
}

type ChartFrameSeries = { key: string; label: string; shape: "line" | "rect" | "dot" }

/** One data position people and assistive tech can reach: its reading and its box. */
type ChartPoint = {
  key: string
  /** What a screen reader hears, and what an agent reads: "March: Revenue $12,400". */
  label: string
  x: number
  y: number
  width: number
  height: number
  /** Where the tooltip points. */
  anchor: { x: number; y: number }
}

type ChartPlotContext = {
  width: number
  height: number
  shown: (series: string) => boolean
  active: string | null
  selected: string | null
}

type ChartTable = {
  head: string[]
  rows: { key: string; cells: string[] }[]
  /** Columns holding numbers, aligned to the end. */
  numeric?: boolean[]
}

/** A chart's drawing at one size: SVG nodes, the positions over them, and tooltips. */
type ChartGeometry = {
  svg: VChild[]
  points: ChartPoint[]
  tooltip?: (key: string) => VChild[] | null
  /** Drawn over the options, under the tooltip: crosshairs, end labels. */
  overlay?: VNode[]
}

/** What the frame shows besides the drawing. */
type ChartFrameData = {
  series: ChartFrameSeries[]
  table: ChartTable
  rows: () => unknown[]
  className: string
  orientation?: "horizontal" | "vertical"
  /** Options in rows of this many (a heatmap), so Up and Down move by a row. */
  columns?: number
  /** Hover picks the nearest point rather than the one under the pointer (scatter). */
  nearest?: boolean
}

const slotOf = (index: number) => (index < 8 ? `var(--chart-${index + 1})` : "var(--chart-other)")

/** Color follows the entity: a series keeps its slot whatever else is shown. */
function seriesColor(series: readonly { key: string }[], key: string) {
  return slotOf(series.findIndex((s) => s.key === key))
}

/**
 * The position the drawing follows: the one under the pointer or focus, else the pinned
 * one, and never a key the data no longer has (a stale pin draws nothing, not a crosshair
 * off the edge).
 */
function focusKey(active: string | null, pinned: string | null, has: (key: string) => boolean) {
  if (active !== null && has(active)) return active
  if (pinned !== null && has(pinned)) return pinned
  return null
}

export { focusKey, seriesColor, slotOf }
export type { ChartFrameData, ChartFrameSeries, ChartGeometry, ChartPlotContext, ChartPoint, ChartSeries, ChartTable }
