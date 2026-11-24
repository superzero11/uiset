import type { JSX } from "@solidjs/web"
import { createMemo, omit } from "solid-js"
import type { ChartSelectChange } from "../../registry/uiset/ui/chart/points"
import { lineFrame, linePlot, type LineOptions } from "../../registry/uiset/ui/chart/plots/line"
import { ChartFrame, solidPlot } from "./chart"

type LineChartProps<Datum> = LineOptions<Datum> & {
  title: string
  description?: JSX.Element
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: JSX.Element
  class?: string
}

/** Lines, areas or stacks over evenly spaced x positions. The geometry is chart/plots/line.ts. */
function LineChart<Datum>(props: LineChartProps<Datum>) {
  const options = omit(props, "title", "description", "height", "selected", "onSelect", "actions", "class") as LineOptions<Datum>
  const frame = createMemo(() => lineFrame(options))
  return (
    <ChartFrame
      title={props.title}
      description={props.description}
      height={props.height ?? 240}
      class={[frame().className, props.class].filter(Boolean).join(" ")}
      series={frame().series}
      table={frame().table}
      rows={frame().rows}
      selected={props.selected}
      onSelect={props.onSelect}
      actions={props.actions}
      plot={(context) => solidPlot(linePlot(options, context))}
    />
  )
}

export { LineChart }
export type { LineChartProps }
