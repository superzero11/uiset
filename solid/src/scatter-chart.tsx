import type { JSX } from "@solidjs/web"
import { createMemo, omit } from "solid-js"
import type { ChartSelectChange } from "../../registry/uiset/ui/chart/points"
import { scatterFrame, scatterPlot, type ScatterOptions, type ScatterSeries } from "../../registry/uiset/ui/chart/plots/scatter"
import { ChartFrame, solidPlot } from "./chart"

type ScatterChartProps<Datum> = ScatterOptions<Datum> & {
  title: string
  description?: JSX.Element
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: JSX.Element
  class?: string
}

/** Two measures per item. The pointer finds the nearest point; arrows go left to right. */
function ScatterChart<Datum>(props: ScatterChartProps<Datum>) {
  const options = omit(props, "title", "description", "height", "selected", "onSelect", "actions", "class") as ScatterOptions<Datum>
  const frame = createMemo(() => scatterFrame(options))
  return (
    <ChartFrame
      title={props.title}
      description={props.description}
      height={props.height ?? 280}
      nearest={frame().nearest}
      class={[frame().className, props.class].filter(Boolean).join(" ")}
      series={frame().series}
      table={frame().table}
      rows={frame().rows}
      selected={props.selected}
      onSelect={props.onSelect}
      actions={props.actions}
      plot={(context) => solidPlot(scatterPlot(options, context))}
    />
  )
}

export { ScatterChart }
export type { ScatterChartProps, ScatterSeries }
