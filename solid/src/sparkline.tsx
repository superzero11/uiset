import { omit } from "solid-js"
import { sparklineColor, sparklinePlot, type SparklineOptions } from "../../registry/uiset/ui/chart/plots/sparkline"
import { toSolid } from "./chart"
import "../../registry/uiset/ui/chart/tokens.css"
import "../../registry/uiset/ui/chart/chart.css"

type SparklineProps = SparklineOptions & {
  /** A chart slot (1-8) for the color; defaults to the first. */
  slot?: number
  class?: string
}

/** A trend in a line of text, a table cell or a stat. Its name says where it went. */
function Sparkline(props: SparklineProps) {
  const width = () => props.width ?? 96
  const height = () => props.height ?? 28
  const drawn = () => sparklinePlot({ ...(omit(props, "slot", "class") as SparklineOptions), width: width(), height: height() })
  return (
    <svg
      class={["sparkline", props.class]}
      role="img"
      aria-label={drawn().name}
      width={width()}
      height={height()}
      viewBox={`0 0 ${width()} ${height()}`}
      style={{ "--series": sparklineColor(props.slot ?? 1) }}
    >
      {toSolid(drawn().svg)}
    </svg>
  )
}

export { Sparkline }
export type { SparklineProps }
