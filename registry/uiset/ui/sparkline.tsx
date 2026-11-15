import { createElement, type CSSProperties, type ReactNode } from "react"
import { sparklineColor, sparklinePlot, type SparklineOptions } from "./chart/plots/sparkline"
import type { VChild } from "./chart/vnode"
import "./chart/tokens.css"
import "./chart/chart.css"

type SparklineProps = SparklineOptions & {
  /** A chart slot (1-8) for the color; defaults to the first. */
  slot?: number
  className?: string
}

// The drawing's nodes as React elements, here rather than from the chart frame, so a
// sparkline stays a Server Component.
const nodes = (children: readonly VChild[]): ReactNode[] =>
  children.map((child, i) => {
    if (child === null || child === undefined || child === false) return null
    if (typeof child !== "object") return child
    const props: Record<string, unknown> = { key: child.key ?? i }
    // Node attributes use React's names already (className, textAnchor).
    Object.assign(props, child.attrs)
    return createElement(child.tag, props, ...nodes(child.children))
  })

/** A trend in a line of text, a table cell or a stat. Its name says where it went. */
function Sparkline({ width = 96, height = 28, slot = 1, className, ...options }: SparklineProps) {
  const { name, svg } = sparklinePlot({ ...options, width, height })
  return (
    <svg
      className={["sparkline", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={name}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ "--series": sparklineColor(slot) } as CSSProperties}
    >
      {nodes(svg)}
    </svg>
  )
}

export { Sparkline }
export type { SparklineProps }
