import { Dynamic, type JSX } from "@solidjs/web"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import type { StateOf } from "@ui-sdk/core"
import { createEffect, createMemo, createSignal, createUniqueId, For, omit, onSettled, Show } from "solid-js"
import { chartPoints, type ChartCommands, type ChartSelectChange } from "../../registry/uiset/ui/chart/points"
import { formatValue, type ChartValue } from "../../registry/uiset/ui/chart/scale"
import {
  seriesColor,
  slotOf,
  type ChartFrameSeries,
  type ChartGeometry,
  type ChartPlotContext,
  type ChartPoint,
  type ChartSeries,
  type ChartTable,
} from "../../registry/uiset/ui/chart/plot"
import { domName, tooltipRow, type VChild } from "../../registry/uiset/ui/chart/vnode"
import { ScrollBox } from "./scroll-area"
import { SegmentedControl, SegmentedControlItem } from "./segmented-control"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/chart/tokens.css"
import "../../registry/uiset/ui/chart/chart.css"

// The frame every UISet chart shares. A chart computes geometry; the frame gives it a
// title, a legend that isolates series, a Chart/Table switch with the table twin, the
// accessible layer of data positions over the drawing, the tooltip, and agent actions.
// The geometry is shared with React and Web Components (chart/plots); this draws it in Solid.

type ChartPlot = {
  svg: JSX.Element
  points: ChartPoint[]
  tooltip?: (key: string) => JSX.Element
  /** Drawn over the options, under the tooltip: crosshairs, end labels. */
  overlay?: JSX.Element
}

type ChartFrameProps = {
  title: string
  description?: JSX.Element
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
  actions?: JSX.Element
  class?: string
}

/** A chart's drawing, as nodes, turned into Solid elements: SVG inside the drawing, HTML in tooltips. */
function toSolid(children: readonly VChild[] | undefined): JSX.Element {
  return children?.map((child) => {
    if (child === null || child === undefined || child === false) return null
    if (typeof child !== "object") return child
    const attrs: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(child.attrs)) {
      if (value === undefined || value === null || value === false) continue
      attrs[domName(name)] = value === true ? "" : value
    }
    return (
      <Dynamic component={child.tag} {...attrs}>
        {toSolid(child.children)}
      </Dynamic>
    )
  })
}

/** A chart's geometry, drawn by the Solid frame. */
function solidPlot(geometry: ChartGeometry): ChartPlot {
  return {
    svg: toSolid(geometry.svg),
    points: geometry.points,
    tooltip: geometry.tooltip ? (key) => toSolid(geometry.tooltip!(key) ?? undefined) : undefined,
    overlay: geometry.overlay ? toSolid(geometry.overlay) : undefined,
  }
}

type PointState = StateOf<typeof chartPoints, "point">

function ChartOption(props: { value: string } & PartProps<"div", PointState>) {
  return usePart(chartPoints, "point", () => ({ value: props.value }), omit(props, "value"), "div")
}

function ChartLegend(props: { title: string; series: ChartFrameSeries[]; isolated: string | null; onIsolate: (key: string | null) => void }) {
  // Agents isolate a series with the chart's own `isolate`, which these buttons repeat.
  return (
    <div class="chart-legend" role="group" aria-label={`${props.title} series`} data-agent-hidden="">
      <For each={props.series}>
        {(s) => (
          <button
            type="button"
            class="chart-legend-item"
            aria-pressed={props.isolated === s.key ? "true" : "false"}
            data-dimmed={props.isolated && props.isolated !== s.key ? "" : undefined}
            onClick={() => props.onIsolate(props.isolated === s.key ? null : s.key)}
            style={{ "--series": seriesColor(props.series, s.key) }}
          >
            <span class="chart-swatch" data-shape={s.shape} aria-hidden="true" />
            {s.label}
          </button>
        )}
      </For>
    </div>
  )
}

function ChartTableView(props: { title: string; table: ChartTable }) {
  return (
    <ScrollBox
      axis="both"
      data-frame="none"
      class="chart-table-frame"
      // A group, not a region: a page of charts shouldn't be a page of landmarks. Not "<title>
      // table" either: that would contain the chart's own name, which agents act on.
      viewport={{ class: "chart-table-scroller", role: "group", "aria-label": "Data table" }}
    >
      <table class="chart-table">
        <caption class="uiset-visually-hidden">{props.title}</caption>
        <thead>
          <tr>
            <For each={props.table.head}>
              {(cell, i) => (
                <th scope="col" data-numeric={props.table.numeric?.[i()] ? "" : undefined}>
                  {cell}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.table.rows} keyed={(row) => row.key}>
            {(row) => (
              <tr>
                {/* The first cell names the row; the rest are its values. */}
                <th scope="row">{row().cells[0]}</th>
                <For each={row().cells.slice(1)}>{(cell, i) => <td data-numeric={props.table.numeric?.[i() + 1] ? "" : undefined}>{cell}</td>}</For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </ScrollBox>
  )
}

function ChartFrame(props: ChartFrameProps) {
  const titleId = createUniqueId()
  const [view, setView] = createSignal<"chart" | "table">("chart")
  const [isolatedInner, setIsolated] = createSignal<string | null>(null)
  // A series that's gone isn't isolated: new `series` show them all.
  const isolated = () => {
    const key = isolatedInner()
    return key !== null && props.series.some((s) => s.key === key) ? key : null
  }
  const [active, setActive] = createSignal<string | null>(null)
  const [selectedInner, setSelectedInner] = createSignal<string | null>(null)
  const selected = () => (props.selected !== undefined ? props.selected : selectedInner())
  const height = () => props.height ?? 240
  const [width, setWidth] = createSignal(640)
  let plotEl: HTMLDivElement | undefined
  onSettled(() => {
    const el = plotEl
    if (!el) return
    // A hidden plot (the table is showing) measures 0; keep the last width.
    const measure = () => {
      if (el.clientWidth > 0) setWidth(Math.max(120, Math.round(el.clientWidth)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  })
  const shown = (key: string) => !isolated() || isolated() === key
  const select = (key: string | null, details: ChartSelectChange) => {
    if (props.selected === undefined) setSelectedInner(key)
    props.onSelect?.(key, details)
  }
  const drawn = createMemo(() => props.plot({ width: width(), height: height(), shown, active: active(), selected: selected() }))
  // Agents name a position by what people read ("March"), and only then by its key: a
  // sorted bar chart's keys aren't its readings.
  const byLabel = (name: string) => {
    const wanted = name.toLowerCase()
    const points = drawn().points
    return (
      points.find((p) => p.label.toLowerCase() === wanted) ??
      points.find((p) => p.label.toLowerCase().startsWith(`${wanted}:`)) ??
      points.find((p) => p.key === name)
    )
  }
  // A pin the data no longer has is let go, and the page hears so.
  createEffect(
    () => selected() !== null && !drawn().points.some((p) => p.key === selected()),
    (stale) => {
      if (stale) select(null, { source: "data", reason: "removed" })
    },
  )

  const commands: ChartCommands = {
    select: (name) => {
      if (name === null) {
        select(null, { source: "agent", reason: "command" })
        return true
      }
      const point = byLabel(name)
      if (!point) throw new Error(`No "${name}" in ${props.title}.`)
      select(point.key, { source: "agent", reason: "command" })
      return true
    },
    isolate: (name) => {
      const found = props.series.find((s) => s.key === name || s.label.toLowerCase() === name.toLowerCase())
      if (!found) throw new Error(`No series "${name}" in ${props.title}. Its series: ${props.series.map((s) => s.label).join(", ")}.`)
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

  const handle = usePrimitive(chartPoints, () => ({
    orientation: props.orientation ?? "horizontal",
    columns: props.columns,
    nearest: props.nearest ?? false,
    selected: selected(),
    onSelect: select,
    onActiveChange: (key: string | null) => setActive(key),
    items: props.rows,
    view: {
      showing: view(),
      series: isolated() ? props.series.find((s) => s.key === isolated())?.label : "all",
      ...(selected() ? { pinned: drawn().points.find((p) => p.key === selected())?.label } : {}),
    },
    commands,
  }))

  const anchor = () => drawn().points.find((p) => p.key === active()) ?? drawn().points.find((p) => p.key === selected())

  const layer = usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.title
      },
      class: "chart-points",
      // Scatter points can sit close together; the pointer only has to be nearest.
      onPointerMove: (event: PointerEvent) => {
        if (!props.nearest) return
        const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
        const px = event.clientX - box.left
        const py = event.clientY - box.top
        let best: ChartPoint | undefined
        let distance = 48 * 48
        for (const point of drawn().points) {
          const dx = point.x + point.width / 2 - px
          const dy = point.y + point.height / 2 - py
          const d = dx * dx + dy * dy
          if (d < distance) {
            distance = d
            best = point
          }
        }
        handle.api.setActive(best?.key ?? null)
      },
      // A click pins the point the tooltip shows.
      onClick: (event: MouseEvent) => {
        if (props.nearest && event.detail > 0) handle.api.toggleActive()
      },
      // Keyed by the point's key: an option keeps its element, and focus, as the drawing changes.
      get children() {
        return (
          <For each={drawn().points} keyed={(point) => point.key}>
            {(point) => (
              <ChartOption
                value={point().key}
                aria-label={point().label}
                class="chart-point"
                style={{ left: `${point().x}px`, top: `${point().y}px`, width: `${point().width}px`, height: `${point().height}px` }}
              />
            )}
          </For>
        )
      },
    },
    "div",
  )

  return (
    <figure class={["chart", props.class]} aria-labelledby={titleId} data-view={view()}>
      <figcaption class="chart-header">
        <div class="chart-heading">
          <span id={titleId} class="chart-title">
            {props.title}
          </span>
          <Show when={props.description}>{(description) => <span class="chart-description">{description()}</span>}</Show>
        </div>
        <div class="chart-actions">
          {props.actions}
          {/* Agents use the chart's showTable action; the switch would only add noise. With
              the table showing, the chart's actions are out of reach, so the switch is how
              an agent gets back. */}
          <SegmentedControl
            data-agent-hidden={view() === "chart" ? "" : undefined}
            aria-label={`Show ${props.title} as`}
            value={view()}
            onValueChange={(next) => next && setView(next as "chart" | "table")}
          >
            <SegmentedControlItem value="chart">Chart</SegmentedControlItem>
            <SegmentedControlItem value="table">Table</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </figcaption>
      <Show when={props.series.length > 1 && view() === "chart"}>
        <ChartLegend title={props.title} series={props.series} isolated={isolated()} onIsolate={(key) => setIsolated(key)} />
      </Show>
      <div ref={(el) => (plotEl = el)} class="chart-plot" style={{ "block-size": `${height()}px` }} hidden={view() !== "chart"}>
        <svg class="chart-svg" width={width()} height={height()} viewBox={`0 0 ${width()} ${height()}`} aria-hidden="true">
          {drawn().svg}
        </svg>
        {layer}
        {drawn().overlay}
        <Show when={anchor() && drawn().tooltip?.(anchor()!.key)}>
          {(tip) => (
            <div
              class="chart-tooltip"
              aria-hidden="true"
              data-flip={anchor()!.anchor.x > width() * 0.6 ? "" : undefined}
              style={{ left: `${anchor()!.anchor.x}px`, top: `${anchor()!.anchor.y}px` }}
            >
              {tip()}
            </div>
          )}
        </Show>
      </div>
      <Show when={view() === "table"}>
        <ChartTableView title={props.title} table={props.table} />
      </Show>
    </figure>
  )
}

/** A tooltip row: a line key in the series color, the value strong, the name after. */
function ChartTooltipRow(props: { color: string; value: string; label: string; shape?: "line" | "rect" | "dot" }) {
  return <>{toSolid([tooltipRow(props.color, props.value, props.label, props.shape ?? "line")])}</>
}

export { ChartFrame, ChartTooltipRow, formatValue, seriesColor, slotOf, solidPlot, toSolid }
export type { ChartFrameProps, ChartFrameSeries, ChartPlot, ChartPlotContext, ChartPoint, ChartSeries, ChartTable, ChartValue }
