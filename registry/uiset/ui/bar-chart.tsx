"use client"

import type { ChartSelectChange } from "./chart/points"
import type { ReactNode } from "react"
import { ChartFrame, reactPlot } from "./chart"
import { barFrame, barHeight, barPlot, type BarOptions } from "./chart/plots/bar"

type BarChartProps<Datum> = BarOptions<Datum> & {
  title: string
  description?: ReactNode
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: ReactNode
  className?: string
}

/** Grouped or stacked bars, rising or running sideways. The geometry is chart/plots/bar.ts. */
function BarChart<Datum>({ title, description, height, selected, onSelect, actions, className, ...options }: BarChartProps<Datum>) {
  const frame = barFrame(options)
  return (
    <ChartFrame
      title={title}
      description={description}
      height={barHeight(options, height)}
      orientation={frame.orientation}
      className={[frame.className, className].filter(Boolean).join(" ")}
      series={frame.series}
      table={frame.table}
      rows={frame.rows}
      selected={selected}
      onSelect={onSelect}
      actions={actions}
      plot={(context) => reactPlot(barPlot(options, context))}
    />
  )
}

export { BarChart }
export type { BarChartProps }
