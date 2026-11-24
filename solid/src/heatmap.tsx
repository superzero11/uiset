import type { JSX } from "@solidjs/web"
import { createMemo, omit } from "solid-js"
import type { ChartSelectChange } from "../../registry/uiset/ui/chart/points"
import { heatmapFrame, heatmapHeight, heatmapPlot, type HeatmapOptions } from "../../registry/uiset/ui/chart/plots/heatmap"
import { ChartFrame, solidPlot } from "./chart"

type HeatmapProps<Datum> = HeatmapOptions<Datum> & {
  title: string
  description?: JSX.Element
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: JSX.Element
  class?: string
}

/** Magnitude on a grid, in one hue: the more, the stronger. Arrows move by cell and row. */
function Heatmap<Datum>(props: HeatmapProps<Datum>) {
  const options = omit(props, "title", "description", "height", "selected", "onSelect", "actions", "class") as HeatmapOptions<Datum>
  const frame = createMemo(() => heatmapFrame(options))
  return (
    <ChartFrame
      title={props.title}
      description={props.description}
      height={heatmapHeight(options.rows, props.height)}
      columns={frame().columns}
      class={[frame().className, props.class].filter(Boolean).join(" ")}
      series={frame().series}
      table={frame().table}
      rows={frame().rows}
      selected={props.selected}
      onSelect={props.onSelect}
      actions={props.actions}
      plot={(context) => solidPlot(heatmapPlot(options, context))}
    />
  )
}

export { Heatmap }
export type { HeatmapProps }
