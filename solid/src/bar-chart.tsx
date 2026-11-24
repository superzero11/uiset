import type { JSX } from "@solidjs/web"
import { createMemo, omit } from "solid-js"
import type { ChartSelectChange } from "../../registry/uiset/ui/chart/points"
import { barFrame, barHeight, barPlot, type BarOptions } from "../../registry/uiset/ui/chart/plots/bar"
import { ChartFrame, solidPlot } from "./chart"

type BarChartProps<Datum> = BarOptions<Datum> & {
  title: string
  description?: JSX.Element
  height?: number
  selected?: string | null
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  actions?: JSX.Element
  class?: string
}

/** Grouped or stacked bars, rising or running sideways. The geometry is chart/plots/bar.ts. */
function BarChart<Datum>(props: BarChartProps<Datum>) {
  const options = omit(props, "title", "description", "height", "selected", "onSelect", "actions", "class") as BarOptions<Datum>
  const frame = createMemo(() => barFrame(options))
  return (
    <ChartFrame
      title={props.title}
      description={props.description}
      height={barHeight(options, props.height)}
      orientation={frame().orientation}
      class={[frame().className, props.class].filter(Boolean).join(" ")}
      series={frame().series}
      table={frame().table}
      rows={frame().rows}
      selected={props.selected}
      onSelect={props.onSelect}
      actions={props.actions}
      plot={(context) => solidPlot(barPlot(options, context))}
    />
  )
}

export { BarChart }
export type { BarChartProps }
