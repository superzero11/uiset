"use client"

import type { ChartSelectChange } from "./chart/points"
import type { ReactNode } from "react"
import { ChartFrame, reactPlot } from "./chart"
import { scatterFrame, scatterPlot, type ScatterOptions, type ScatterSeries } from "./chart/plots/scatter"

type ScatterChartProps<Datum> = ScatterOptions<Datum> & {
  title: string
  description?: ReactNode
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: ReactNode
  className?: string
}

/** Two measures per item. The pointer finds the nearest point; arrows go left to right. */
function ScatterChart<Datum>({ title, description, height = 280, selected, onSelect, actions, className, ...options }: ScatterChartProps<Datum>) {
  const frame = scatterFrame(options)
  return (
    <ChartFrame
      title={title}
      description={description}
      height={height}
      nearest={frame.nearest}
      className={[frame.className, className].filter(Boolean).join(" ")}
      series={frame.series}
      table={frame.table}
      rows={frame.rows}
      selected={selected}
      onSelect={onSelect}
      actions={actions}
      plot={(context) => reactPlot(scatterPlot(options, context))}
    />
  )
}

export { ScatterChart }
export type { ScatterChartProps, ScatterSeries }
