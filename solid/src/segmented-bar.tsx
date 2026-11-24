import type { JSX } from "@solidjs/web"
import { createMemo, omit } from "solid-js"
import type { ChartSelectChange } from "../../registry/uiset/ui/chart/points"
import { segmentedBarFrame, segmentedBarHeight, segmentedBarPlot, type SegmentedBarOptions, type SegmentedBarPart } from "../../registry/uiset/ui/chart/plots/segmented-bar"
import { ChartFrame, solidPlot } from "./chart"

type SegmentedBarProps = SegmentedBarOptions & {
  title: string
  description?: JSX.Element
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: JSX.Element
  class?: string
}

/** One whole split into parts, read at a glance: what a donut is usually asked to do. */
function SegmentedBar(props: SegmentedBarProps) {
  const options = omit(props, "title", "description", "selected", "onSelect", "actions", "class") as SegmentedBarOptions
  const frame = createMemo(() => segmentedBarFrame(options))
  return (
    <ChartFrame
      title={props.title}
      description={props.description}
      height={segmentedBarHeight(options)}
      class={[frame().className, props.class].filter(Boolean).join(" ")}
      series={frame().series}
      table={frame().table}
      rows={frame().rows}
      selected={props.selected}
      onSelect={props.onSelect}
      actions={props.actions}
      plot={(context) => solidPlot(segmentedBarPlot(options, context))}
    />
  )
}

export { SegmentedBar }
export type { SegmentedBarProps, SegmentedBarPart }
