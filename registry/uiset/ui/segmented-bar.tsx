"use client"

import type { ChartSelectChange } from "./chart/points"
import type { ReactNode } from "react"
import { ChartFrame, reactPlot } from "./chart"
import {
  segmentedBarFrame,
  segmentedBarHeight,
  segmentedBarPlot,
  type SegmentedBarOptions,
  type SegmentedBarPart,
} from "./chart/plots/segmented-bar"

type SegmentedBarProps = SegmentedBarOptions & {
  title: string
  description?: ReactNode
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: ReactNode
  className?: string
}

/** One whole split into parts, read at a glance: what a donut is usually asked to do. */
function SegmentedBar({ title, description, selected, onSelect, actions, className, ...options }: SegmentedBarProps) {
  const frame = segmentedBarFrame(options)
  return (
    <ChartFrame
      title={title}
      description={description}
      height={segmentedBarHeight(options)}
      className={[frame.className, className].filter(Boolean).join(" ")}
      series={frame.series}
      table={frame.table}
      rows={frame.rows}
      selected={selected}
      onSelect={onSelect}
      actions={actions}
      plot={(context) => reactPlot(segmentedBarPlot(options, context))}
    />
  )
}

export { SegmentedBar }
export type { SegmentedBarPart, SegmentedBarProps }
