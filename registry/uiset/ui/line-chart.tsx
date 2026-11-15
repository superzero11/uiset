"use client"

import type { ChartSelectChange } from "./chart/points"
import type { ReactNode } from "react"
import { ChartFrame, reactPlot } from "./chart"
import { lineFrame, linePlot, type LineOptions } from "./chart/plots/line"

type LineChartProps<Datum> = LineOptions<Datum> & {
  title: string
  description?: ReactNode
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: ReactNode
  className?: string
}

/** Lines, areas or stacks over evenly spaced x positions. The geometry is chart/plots/line.ts. */
function LineChart<Datum>({ title, description, height = 240, selected, onSelect, actions, className, ...options }: LineChartProps<Datum>) {
  const frame = lineFrame(options)
  return (
    <ChartFrame
      title={title}
      description={description}
      height={height}
      className={[frame.className, className].filter(Boolean).join(" ")}
      series={frame.series}
      table={frame.table}
      rows={frame.rows}
      selected={selected}
      onSelect={onSelect}
      actions={actions}
      plot={(context) => reactPlot(linePlot(options, context))}
    />
  )
}

export { LineChart }
export type { LineChartProps }
