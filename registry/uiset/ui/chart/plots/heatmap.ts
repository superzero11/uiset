// The heatmap's geometry: magnitude on a grid, in one hue.
import { LABEL_CHAR_WIDTH, focusKey, type ChartFrameData, type ChartGeometry, type ChartPlotContext, type ChartPoint } from "../plot"
import { extent, formatValue, numberFormat } from "../scale"
import { v, type VChild } from "../vnode"

type HeatmapOptions<Datum> = {
  data: readonly Datum[]
  /** Row and column labels; the grid follows the order given in `rows` and `columns`. */
  rows: readonly string[]
  columns: readonly string[]
  row: (datum: Datum) => string
  column: (datum: Datum) => string
  value: (datum: Datum) => number | null | undefined
  /** Names the measure in readings: "Sessions". */
  measure: string
  format?: (value: number) => string
  /** Reads numbers in this locale; pass it when rendering on a server. */
  locale?: string
}

const STEPS = 7
const charWidth = LABEL_CHAR_WIDTH

function heatmapParts<Datum>({ data, row, column, value, format: formatOption, locale }: HeatmapOptions<Datum>) {
  const cells = new Map<string, number | null>()
  for (const d of data) {
    const n = value(d)
    cells.set(`${row(d)}\u0001${column(d)}`, n === null || n === undefined || !Number.isFinite(n) ? null : n)
  }
  const at = (r: string, c: string) => cells.get(`${r}\u0001${c}`) ?? null
  const format = numberFormat(locale, formatOption)
  const [low, high] = extent([...cells.values()])
  const min = low ?? 0
  const max = high ?? 0
  const stepOf = (n: number) => (max === min ? Math.ceil(STEPS / 2) : Math.min(STEPS, 1 + Math.floor(((n - min) / (max - min)) * STEPS)))
  return { at, format, min, max, stepOf }
}

/** The plot's height: given, or enough for every row. */
const heatmapHeight = (rows: readonly string[], height?: number) => height ?? Math.max(120, rows.length * 30 + 52)

function heatmapFrame<Datum>(options: HeatmapOptions<Datum>): ChartFrameData {
  const { rows, columns, measure } = options
  const { at, format } = heatmapParts(options)
  return {
    className: "heatmap",
    series: [{ key: "value", label: measure, shape: "rect" }],
    columns: columns.length,
    table: {
      head: ["", ...columns],
      numeric: [false, ...columns.map(() => true)],
      rows: rows.map((r) => ({ key: r, cells: [r, ...columns.map((c) => formatValue(at(r, c), format))] })),
    },
    rows: () => rows.flatMap((r) => columns.map((c) => ({ row: r, column: c, [measure]: formatValue(at(r, c), format) }))),
  }
}

function heatmapPlot<Datum>(options: HeatmapOptions<Datum>, { width, height: h, active, selected: pinned }: ChartPlotContext): ChartGeometry {
  const { rows, columns, measure } = options
  const { at, format, min, max, stepOf } = heatmapParts(options)
  const keyOf = (r: number, c: number) => `${r}:${c}`
  const left = Math.min(120, Math.max(0, ...rows.map((r) => r.length)) * charWidth + 12)
  const top = 4
  const legendBand = 30
  const bottom = 20 + legendBand
  const cellW = (width - left) / Math.max(1, columns.length)
  const cellH = (h - top - bottom) / Math.max(1, rows.length)
  const gap = 2
  const focus = focusKey(active, pinned, (key) => {
    const [r, c] = key.split(":").map(Number)
    return Number.isInteger(r) && Number.isInteger(c) && r! >= 0 && c! >= 0 && r! < rows.length && c! < columns.length
  })
  const labelEvery = Math.max(1, Math.ceil((Math.max(0, ...columns.map((c) => c.length)) * charWidth + 6) / cellW))

  const points: ChartPoint[] = rows.flatMap((r, i) =>
    columns.map((c, j) => ({
      key: keyOf(i, j),
      label: `${r}, ${c}: ${measure} ${formatValue(at(r, c), format)}`,
      x: left + j * cellW,
      y: top + i * cellH,
      width: cellW,
      height: cellH,
      anchor: { x: left + j * cellW + cellW / 2, y: top + i * cellH },
    })),
  )

  const legendY = h - legendBand + 8
  const swatch = Math.min(28, (width - left - 80) / STEPS)
  const svg: VChild[] = [
    v("g", { key: "rows", className: "chart-axis-labels", "data-axis": "rows" }, ...rows.map((r, i) => v("text", { key: r, x: left - 8, y: top + i * cellH + cellH / 2, dy: "0.32em", textAnchor: "end" }, r))),
    v(
      "g",
      { key: "columns", className: "chart-axis-labels", "data-axis": "columns" },
      ...columns.map((c, j) => (j % labelEvery === 0 ? v("text", { key: c, x: left + j * cellW + cellW / 2, y: top + rows.length * cellH + 14, textAnchor: "middle" }, c) : null)),
    ),
    ...rows.flatMap((r, i) =>
      columns.map((c, j) => {
        const n = at(r, c)
        const key = keyOf(i, j)
        return v("rect", {
          key,
          className: "heatmap-cell",
          "data-empty": n === null ? "" : undefined,
          "data-active": focus === key ? "" : undefined,
          x: left + j * cellW + gap / 2,
          y: top + i * cellH + gap / 2,
          width: Math.max(0, cellW - gap),
          height: Math.max(0, cellH - gap),
          rx: Math.min(4, cellW / 4, cellH / 4),
          style: n === null ? undefined : { "--cell": `var(--chart-seq-${stepOf(n)})` },
        })
      }),
    ),
    // The scale: one hue, light to strong, with its ends labeled.
    v(
      "g",
      { key: "scale", className: "heatmap-scale", "aria-hidden": "true" },
      v("text", { className: "heatmap-scale-label", x: left, y: legendY + 8, dy: "0.32em", textAnchor: "start" }, formatValue(min, format)),
      ...Array.from({ length: STEPS }, (_, k) =>
        v("rect", { key: k, className: "heatmap-cell", x: left + 44 + k * (swatch + 2), y: legendY, width: swatch, height: 16, rx: 3, style: { "--cell": `var(--chart-seq-${k + 1})` } }),
      ),
      v("text", { className: "heatmap-scale-label", x: left + 44 + STEPS * (swatch + 2) + 6, y: legendY + 8, dy: "0.32em" }, formatValue(max, format)),
    ),
  ]
  return {
    svg,
    points,
    tooltip: (key) => {
      const [i, j] = key.split(":").map(Number)
      const r = rows[i!]!
      const c = columns[j!]!
      return [
        v("span", { key: "title", className: "chart-tooltip-title" }, r, ", ", c),
        v("span", { key: "row", className: "chart-tooltip-row heatmap-tooltip-row" }, v("strong", {}, formatValue(at(r, c), format)), v("span", {}, measure)),
      ]
    },
  }
}

export { heatmapFrame, heatmapHeight, heatmapPlot }
export type { HeatmapOptions }
