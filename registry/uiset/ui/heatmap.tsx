"use client"

import type { ChartSelectChange } from "./chart/points"
import type { ReactNode } from "react"
import { ChartFrame, reactPlot } from "./chart"
import { heatmapFrame, heatmapHeight, heatmapPlot, type HeatmapOptions } from "./chart/plots/heatmap"

type HeatmapProps<Datum> = HeatmapOptions<Datum> & {
  title: string
  description?: ReactNode
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: ReactNode
  className?: string
}

/** Magnitude on a grid, in one hue: the more, the stronger. Arrows move by cell and row. */
function Heatmap<Datum>({ title, description, height, selected, onSelect, actions, className, ...options }: HeatmapProps<Datum>) {
  const frame = heatmapFrame(options)
  return (
    <ChartFrame
      title={title}
      description={description}
      height={heatmapHeight(options.rows, height)}
      columns={frame.columns}
      className={[frame.className, className].filter(Boolean).join(" ")}
      series={frame.series}
      table={frame.table}
      rows={frame.rows}
      selected={selected}
      onSelect={onSelect}
      actions={actions}
      plot={(context) => reactPlot(heatmapPlot(options, context))}
    />
  )
}

export { Heatmap }
export type { HeatmapProps }
