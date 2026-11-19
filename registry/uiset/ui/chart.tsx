"use client"

import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import type { StateOf } from "@ui-sdk/core"
import {
  createElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { chartPoints, type ChartCommands, type ChartSelectChange } from "./chart/points"
import { formatValue, type ChartValue } from "./chart/scale"
import { ScrollBox } from "./scroll-area"
import { SegmentedControl, SegmentedControlItem } from "./segmented-control"
import "./shell/shell.css"
import "./chart/tokens.css"
import "./chart/chart.css"

// The frame every UISet chart shares. A chart computes geometry; the frame gives it a
// title, a legend that isolates series, a Chart/Table switch with the table twin, the
// accessible layer of data positions over the drawing, the tooltip, and agent actions.

import {
  seriesColor,
  slotOf,
  type ChartFrameSeries,
  type ChartGeometry,
  type ChartPlotContext,
  type ChartPoint,
  type ChartSeries,
  type ChartTable,
} from "./chart/plot"
import { tooltipRow, type VChild } from "./chart/vnode"

type ChartPlot = {
  svg: ReactNode
  points: ChartPoint[]
  tooltip?: (key: string) => ReactNode
  /** Drawn over the options, under the tooltip: crosshairs, end labels. */
  overlay?: ReactNode
}

type ChartFrameProps = {
  title: string
  description?: ReactNode
  height?: number
  series: ChartFrameSeries[]
  table: ChartTable
  orientation?: "horizontal" | "vertical"
  /** Options in rows of this many (a heatmap), so Up and Down move by a row. */
  columns?: number
  /** Hover picks the nearest point rather than the one under the pointer (scatter). */
  nearest?: boolean
  selected?: string | null
  /** The pin changed: by a person, an agent, or new data dropping the pinned position. */
  onSelect?: (key: string | null, details: ChartSelectChange) => void
  /** Rows for agents: the data as a person would read it. */
  rows: () => unknown[]
  plot: (context: ChartPlotContext) => ChartPlot
  actions?: ReactNode
  className?: string
}

/** A chart's drawing, as nodes, turned into React elements. */
function toReact(children: readonly VChild[] | undefined): ReactNode {
  return children?.map((child, index) => {
    if (child === null || child === undefined || child === false) return null
    if (typeof child !== "object") return child
    // Unkeyed nodes take their place, marked so it can't meet a numeric key ("0").
    const props: Record<string, unknown> = { key: child.key ?? `#${index}` }
    for (const [name, value] of Object.entries(child.attrs)) {
      if (value === undefined || value === null || value === false) continue
      props[name === "class" ? "className" : name] = value
    }
    return createElement(child.tag, props, ...((toReact(child.children) as ReactNode[] | undefined) ?? []))
  })
}

/** A chart's geometry, drawn by the React frame. */
function reactPlot(geometry: ChartGeometry): ChartPlot {
  return {
    svg: toReact(geometry.svg),
    points: geometry.points,
    tooltip: geometry.tooltip ? (key) => toReact(geometry.tooltip!(key) ?? undefined) : undefined,
    overlay: geometry.overlay ? toReact(geometry.overlay) : undefined,
  }
}

function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // A hidden plot (the table is showing) measures 0; keep the last width.
    const measure = () => {
      if (el.clientWidth > 0) setWidth(Math.max(120, Math.round(el.clientWidth)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

type PointState = StateOf<typeof chartPoints, "point">

function ChartOption({ value, ...props }: { value: string } & PartProps<"div", PointState>) {
  return usePart(chartPoints, "point", { value }, props, "div")
}

function ChartLegend({
  title,
  series,
  isolated,
  onIsolate,
}: {
  title: string
  series: ChartFrameSeries[]
  isolated: string | null
  onIsolate: (key: string | null) => void
}) {
  // Agents isolate a series with the chart's own `isolate`, which these buttons repeat.
  return (
    <div className="chart-legend" role="group" aria-label={`${title} series`} data-agent-hidden>
      {series.map((s) => (
        <button
          key={s.key}
          type="button"
          className="chart-legend-item"
          aria-pressed={isolated === s.key}
          data-dimmed={isolated && isolated !== s.key ? "" : undefined}
          onClick={() => onIsolate(isolated === s.key ? null : s.key)}
          style={{ "--series": seriesColor(series, s.key) } as CSSProperties}
        >
          <span className="chart-swatch" data-shape={s.shape} aria-hidden="true" />
          {s.label}
        </button>
      ))}
    </div>
  )
}

function ChartTableView({ title, table }: { title: string; table: ChartTable }) {
  return (
    <ScrollBox
      axis="both"
      data-frame="none"
      className="chart-table-frame"
      // A group, not a region: a page of charts shouldn't be a page of landmarks. Not "<title>
      // table" either: that would contain the chart's own name, which agents act on.
      viewport={{ className: "chart-table-scroller", role: "group", "aria-label": "Data table" }}
    >
      <table className="chart-table">
        <caption className="uiset-visually-hidden">{title}</caption>
        <thead>
          <tr>
            {table.head.map((cell, i) => (
              <th key={i} scope="col" data-numeric={table.numeric?.[i] ? "" : undefined}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i} data-numeric={table.numeric?.[i] ? "" : undefined}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  )
}

function ChartFrame({
  title,
  description,
  height = 240,
  series,
  table,
  orientation = "horizontal",
  columns,
  nearest = false,
  selected: selectedProp,
  onSelect,
  rows,
  plot,
  actions,
  className,
}: ChartFrameProps) {
  const titleId = useId()
  const [view, setView] = useState<"chart" | "table">("chart")
  const [isolatedInner, setIsolated] = useState<string | null>(null)
  // A series that's gone isn't isolated: new `series` show them all.
  const isolated = isolatedInner !== null && series.some((s) => s.key === isolatedInner) ? isolatedInner : null
  const [active, setActive] = useState<string | null>(null)
  const [selectedInner, setSelectedInner] = useState<string | null>(null)
  const selected = selectedProp !== undefined ? selectedProp : selectedInner
  const [plotRef, width] = useWidth()
  const shown = (key: string) => !isolated || isolated === key
  const select = (key: string | null, details: ChartSelectChange) => {
    if (selectedProp === undefined) setSelectedInner(key)
    onSelect?.(key, details)
  }
  const drawn = plot({ width, height, shown, active, selected })
  // Agents name a position by what people read ("March"), and only then by its key: a
  // sorted bar chart's keys aren't its readings.
  const byLabel = (name: string) => {
    const wanted = name.toLowerCase()
    return (
      drawn.points.find((p) => p.label.toLowerCase() === wanted) ??
      drawn.points.find((p) => p.label.toLowerCase().startsWith(`${wanted}:`)) ??
      drawn.points.find((p) => p.key === name)
    )
  }
  // A pin the data no longer has is let go, and the page hears so.
  const stale = selected !== null && !drawn.points.some((p) => p.key === selected)
  useEffect(() => {
    if (stale) select(null, { source: "data", reason: "removed" })
  })

  const commands: ChartCommands = {
    select: (name) => {
      if (name === null) {
        select(null, { source: "agent", reason: "command" })
        return true
      }
      const point = byLabel(name)
      if (!point) throw new Error(`No "${name}" in ${title}.`)
      select(point.key, { source: "agent", reason: "command" })
      return true
    },
    isolate: (name) => {
      const found = series.find(
        (s) => s.key === name || s.label.toLowerCase() === name.toLowerCase(),
      )
      if (!found)
        throw new Error(
          `No series "${name}" in ${title}. Its series: ${series.map((s) => s.label).join(", ")}.`,
        )
      setIsolated(found.key)
      return true
    },
    showAll: () => {
      setIsolated(null)
      return true
    },
    showTable: (on) => {
      setView(on ? "table" : "chart")
      return true
    },
  }

  const handle = usePrimitive(chartPoints, {
    orientation,
    columns,
    nearest,
    selected,
    onSelect: select,
    onActiveChange: setActive,
    items: rows,
    view: {
      showing: view,
      series: isolated ? series.find((s) => s.key === isolated)?.label : "all",
      ...(selected ? { pinned: drawn.points.find((p) => p.key === selected)?.label } : {}),
    },
    commands,
  })

  const anchor = drawn.points.find((p) => p.key === active) ?? drawn.points.find((p) => p.key === selected)
  const tip = anchor && drawn.tooltip?.(anchor.key)
  const flip = anchor ? anchor.anchor.x > width * 0.6 : false

  const layer = usePart(
    handle,
    "root",
    {},
    {
      "aria-label": title,
      className: "chart-points",
      // Scatter points can sit close together; the pointer only has to be nearest.
      onPointerMove: nearest
        ? (event: React.PointerEvent<HTMLDivElement>) => {
            const box = event.currentTarget.getBoundingClientRect()
            const px = event.clientX - box.left
            const py = event.clientY - box.top
            let best: ChartPoint | undefined
            let distance = 48 * 48
            for (const point of drawn.points) {
              const dx = point.x + point.width / 2 - px
              const dy = point.y + point.height / 2 - py
              const d = dx * dx + dy * dy
              if (d < distance) {
                distance = d
                best = point
              }
            }
            handle.api.setActive(best?.key ?? null)
          }
        : undefined,
      // A click pins the point the tooltip shows.
      onClick: nearest
        ? (event: React.MouseEvent) => {
            if (event.detail > 0) handle.api.toggleActive()
          }
        : undefined,
      children: drawn.points.map((point) => (
        <ChartOption
          key={point.key}
          value={point.key}
          aria-label={point.label}
          className="chart-point"
          style={{ left: point.x, top: point.y, width: point.width, height: point.height }}
        />
      )),
    },
    "div",
  )

  return (
    <figure
      className={["chart", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      data-view={view}
    >
      <figcaption className="chart-header">
        <div className="chart-heading">
          <span id={titleId} className="chart-title">
            {title}
          </span>
          {description && <span className="chart-description">{description}</span>}
        </div>
        <div className="chart-actions">
          {actions}
          {/* Agents use the chart's showTable action; the switch would only add noise. With
              the table showing, the chart's actions are out of reach, so the switch is how
              an agent gets back. */}
          <SegmentedControl
            data-agent-hidden={view === "chart" ? "" : undefined}
            aria-label={`Show ${title} as`}
            value={view}
            onValueChange={(next) => next && setView(next as "chart" | "table")}
          >
            <SegmentedControlItem value="chart">Chart</SegmentedControlItem>
            <SegmentedControlItem value="table">Table</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </figcaption>
      {series.length > 1 && view === "chart" && (
        <ChartLegend title={title} series={series} isolated={isolated} onIsolate={setIsolated} />
      )}
      <div ref={plotRef} className="chart-plot" style={{ blockSize: height }} hidden={view !== "chart"}>
        <svg
          className="chart-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          focusable="false"
        >
          {drawn.svg}
        </svg>
        {layer}
        {drawn.overlay}
        {tip && (
          <div
            className="chart-tooltip"
            aria-hidden="true"
            data-flip={flip ? "" : undefined}
            style={{ left: anchor.anchor.x, top: anchor.anchor.y }}
          >
            {tip}
          </div>
        )}
      </div>
      {view === "table" && <ChartTableView title={title} table={table} />}
    </figure>
  )
}

/** A tooltip row: a line key in the series color, the value strong, the name after. */
function ChartTooltipRow({
  color,
  value,
  label,
  shape = "line",
}: {
  color: string
  value: string
  label: string
  shape?: "line" | "rect" | "dot"
}) {
  return toReact([tooltipRow(color, value, label, shape)])
}

export { ChartFrame, ChartTooltipRow, formatValue, reactPlot, seriesColor, slotOf, toReact }
export type {
  ChartFrameProps,
  ChartFrameSeries,
  ChartPlot,
  ChartPlotContext,
  ChartPoint,
  ChartSeries,
  ChartTable,
  ChartValue,
}
