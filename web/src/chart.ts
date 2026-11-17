// Charts for Web Components. Each element computes the same geometry as its React twin
// (registry/uiset/ui/chart/plots/*) and draws it in the same frame: a title, a legend that
// isolates series, a Chart/Table switch with the table twin, a listbox of data positions
// over the drawing (UI SDK's roving focus, through the chart points primitive), tooltips and
// agent actions.
import { createParts } from "@ui-sdk/web"
import "@ui-sdk/web/segmented-control"
import { chartPoints, type ChartCommands, type ChartSelectChange, type ChartSelectDetails } from "@/registry/uiset/ui/chart/points"
import type { ChartFrameData, ChartGeometry, ChartPlotContext, ChartPoint } from "@/registry/uiset/ui/chart/plot"
import { seriesColor } from "@/registry/uiset/ui/chart/plot"
import { barFrame, barHeight, barPlot, type BarOptions } from "@/registry/uiset/ui/chart/plots/bar"
import { heatmapFrame, heatmapHeight, heatmapPlot, type HeatmapOptions } from "@/registry/uiset/ui/chart/plots/heatmap"
import { lineFrame, linePlot, type LineOptions } from "@/registry/uiset/ui/chart/plots/line"
import { scatterFrame, scatterPlot, type ScatterOptions } from "@/registry/uiset/ui/chart/plots/scatter"
import { segmentedBarFrame, segmentedBarHeight, segmentedBarPlot, type SegmentedBarOptions } from "@/registry/uiset/ui/chart/plots/segmented-bar"
import { domName, type VChild } from "@/registry/uiset/ui/chart/vnode"
import "@/registry/uiset/ui/chart/tokens.css"
import "@/registry/uiset/ui/chart/chart.css"
import { attr, defineElement, Evented, h, place, uid, upgradeProperties } from "./dom"

const svgNS = "http://www.w3.org/2000/svg"

// Chart CSS sets `display` on its legend, tooltip and table, which outranks `hidden`; React
// leaves them out instead. Here they're hidden with an inline style too.
function display(el: HTMLElement, on: boolean) {
  el.hidden = !on
  el.style.display = on ? "" : "none"
}

/** A chart's nodes as DOM: SVG elements inside the drawing, HTML in tooltips. */
function toDom(children: readonly VChild[] | undefined, svg: boolean): Node[] {
  const nodes: Node[] = []
  for (const child of children ?? []) {
    if (child === null || child === undefined || child === false) continue
    if (typeof child !== "object") {
      nodes.push(document.createTextNode(String(child)))
      continue
    }
    const el = svg ? document.createElementNS(svgNS, child.tag) : document.createElement(child.tag)
    for (const [name, value] of Object.entries(child.attrs)) {
      if (value === undefined || value === null || value === false) continue
      if (name === "style" && typeof value === "object") {
        for (const [prop, val] of Object.entries(value)) (el as HTMLElement).style.setProperty(prop, String(val))
      } else el.setAttribute(domName(name), value === true ? "" : String(value))
    }
    el.append(...toDom(child.children, svg))
    nodes.push(el)
  }
  return nodes
}

type ChartKind<Options> = {
  frame: (options: Options) => ChartFrameData
  plot: (options: Options, context: ChartPlotContext) => ChartGeometry
  height: (options: Options, given?: number) => number
  /** The options that come from properties (data, accessors, formats). */
  properties: (keyof Options & string)[]
  /** The options that come from attributes (strings), each with a property that reflects it. */
  attributes: (keyof Options & string)[]
  /** Options a chart can't draw without. */
  required: (keyof Options & string)[]
  /** Properties named apart from their option: `label` is every chart's title, so scatter's
      point-label accessor is `pointLabel`. */
  renamed?: Record<string, keyof Options & string>
}

type PointsElement = HTMLElement & {
  selected?: string | null
  items?: () => unknown[]
  view?: object
  commands?: ChartCommands
  orientation?: string
  columns?: number
  nearest?: boolean
  api?: { setActive: (key: string | null) => void; toggleActive: () => void }
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
/** Attributes every chart reads, each reflected by a property. */
const frameAttributes = ["label", "description", "height"]

/**
 * The shared base: <uiset-line-chart label="Revenue"> with `data`, `x` and `series` as
 * properties, and the rest as attributes or properties. `selected` is live; `select` fires
 * when a person or agent pins a position, and calling preventDefault() refuses the pin.
 */
/** What every chart fires: `select` when a position is pinned, or let go (`value: null`). */
type UISetChartEvents = { select: CustomEvent<{ value: string | null } & ChartSelectChange> }

class UISetChart<Options extends object> extends Evented<UISetChartEvents>() {
  static kind: ChartKind<never>
  private options: Record<string, unknown> = {}
  private queued = false
  private view: "chart" | "table" = "chart"
  private isolated: string | null = null
  private active: string | null = null
  private pinned: string | null = null
  private width = 640
  // The frame (legend, table, rows) only changes with the options: hover reuses it.
  private frame?: ChartFrameData
  private legendButtons = new Map<string, HTMLButtonElement>()
  private built?: {
    figure: HTMLElement
    title: HTMLElement
    description: HTMLElement
    switcher: HTMLElement & { value?: unknown }
    legend: HTMLElement
    plot: HTMLElement
    svg: SVGSVGElement
    points: PointsElement
    tooltip: HTMLElement
    table: HTMLElement
  }
  private resize?: ResizeObserver
  private geometry?: ChartGeometry

  private get kind() {
    return (this.constructor as typeof UISetChart).kind as unknown as ChartKind<Options>
  }

  static get observedAttributes() {
    return [...frameAttributes, ...this.kind.attributes.map(kebab)]
  }

  constructor() {
    super()
    this.upgrade()
  }

  /** The pinned position's key, or null. Setting it fires no event. */
  get selected() {
    return this.pinned
  }
  set selected(key: string | null) {
    this.pinned = key
    this.schedule()
  }

  attributeChangedCallback() {
    this.frame = undefined
    this.schedule()
  }

  connectedCallback() {
    this.upgrade()
    this.build()
    // A moved element was disconnected, which stopped its observer: it watches again here.
    if (this.built) this.resize?.observe(this.built.plot)
    this.schedule()
  }

  disconnectedCallback() {
    this.resize?.disconnect()
  }

  // Properties set before the element was defined hide its accessors: they go through them.
  private upgrade() {
    const kind = this.kind
    const renamed = Object.keys(kind.renamed ?? {})
    upgradeProperties(this, [...kind.properties.filter((name) => !Object.values(kind.renamed ?? {}).includes(name)), ...renamed, ...frameAttributes, ...kind.attributes, "selected"])
  }

  /** Redraws on the next microtask, once however many properties were just set. */
  protected schedule() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      if (this.isConnected) this.draw()
    })
  }

  setOption(name: string, value: unknown) {
    this.options[name] = value
    this.frame = undefined
    this.schedule()
  }

  getOption(name: string) {
    return this.options[name]
  }

  private current(): Options {
    const out: Record<string, unknown> = { ...this.options }
    for (const name of this.kind.attributes) {
      const value = this.getAttribute(kebab(name))
      if (value !== null) out[name] = value === "" ? true : value === "false" ? false : value
    }
    return out as Options
  }

  private build() {
    if (this.built?.figure.isConnected) return
    const titleId = uid("chart-title")
    const title = h("span", { id: titleId, class: "chart-title" })
    const description = h("span", { class: "chart-description" })
    const switcher = h(
      "ui-segmented-control",
      { "data-agent-hidden": "", "default-value": "chart" },
      h("ui-segmented-control-indicator"),
      h("ui-segmented-control-item", { value: "chart" }, "Chart"),
      h("ui-segmented-control-item", { value: "table" }, "Table"),
    ) as HTMLElement & { value?: unknown }
    switcher.addEventListener("valuechange", (event) => {
      const next = (event as CustomEvent<{ value: string | null }>).detail.value
      if (next) this.show(next as "chart" | "table")
    })
    const legend = h("div", { class: "chart-legend", role: "group" })
    const svg = document.createElementNS(svgNS, "svg")
    svg.setAttribute("class", "chart-svg")
    svg.setAttribute("aria-hidden", "true")
    svg.setAttribute("focusable", "false")
    const points = h("uiset-chart-points", { class: "chart-points" }) as PointsElement
    points.addEventListener("activechange", (event) => {
      this.active = (event as CustomEvent<{ value: string | null }>).detail.value
      this.drawHover()
    })
    points.addEventListener("select", (event) => {
      const { value, source, reason } = (event as CustomEvent<{ value: string | null } & ChartSelectDetails>).detail
      this.pin(value, { source, reason })
    })
    const tooltip = h("div", { class: "chart-tooltip", "aria-hidden": "true" })
    const plot = h("div", { class: "chart-plot" }, svg, points, tooltip)
    const table = h("div", { class: "chart-table-scroller", role: "region", tabindex: "0" })
    const figure = h(
      "figure",
      { class: "chart", "aria-labelledby": titleId, "data-view": "chart" },
      h("figcaption", { class: "chart-header" }, h("div", { class: "chart-heading" }, title, description), h("div", { class: "chart-actions" }, switcher)),
      legend,
      plot,
      table,
    )
    this.replaceChildren(figure)
    this.legendButtons.clear()
    this.built = { figure, title, description, switcher, legend, plot, svg, points, tooltip, table }
    // A hidden plot (the table is showing) measures 0; the last width stays.
    this.resize ??= new ResizeObserver(() => {
      const box = this.built?.plot
      if (!box || box.clientWidth <= 0) return
      const next = Math.max(120, Math.round(box.clientWidth))
      if (next !== this.width) {
        this.width = next
        this.draw()
      }
    })
  }

  /** Pins a position, unless the page refuses it. */
  private pin(key: string | null, details: ChartSelectChange) {
    const event = new CustomEvent("select", { detail: { value: key, ...details }, cancelable: true })
    if (!this.dispatchEvent(event)) return false
    this.pinned = key
    this.draw()
    return true
  }

  private show(view: "chart" | "table") {
    this.view = view
    if (this.built && this.built.switcher.value !== view) this.built.switcher.value = view
    this.draw()
  }

  private isolate(key: string | null) {
    this.isolated = key
    this.draw()
  }

  /** The title and names, written whether or not there's data yet. */
  private names() {
    const b = this.built!
    // `label`, not `title`: a title attribute would give the whole chart the browser's tooltip.
    const chartTitle = this.getAttribute("label") ?? ""
    b.title.textContent = chartTitle
    b.description.textContent = this.getAttribute("description") ?? ""
    display(b.description, !!this.getAttribute("description"))
    b.switcher.setAttribute("aria-label", `Show ${chartTitle} as`)
    b.legend.setAttribute("aria-label", `${chartTitle} series`)
    b.points.setAttribute("aria-label", chartTitle)
    b.table.setAttribute("aria-label", `${chartTitle} table`)
    return chartTitle
  }

  private context(options: Options) {
    const height = this.kind.height(options, Number(this.getAttribute("height")) || undefined)
    const shown = (key: string) => !this.isolated || this.isolated === key
    return { width: this.width, height, shown, active: this.active, selected: this.pinned }
  }

  private draw() {
    const b = this.built
    if (!b) return
    const chartTitle = this.names()
    const options = this.current()
    const waiting = this.kind.required.some((name) => options[name] === undefined)
    attr(b.figure, "aria-busy", waiting ? "true" : null)
    if (waiting) {
      for (const el of [b.legend, b.plot, b.tooltip, b.table]) display(el, false)
      return
    }
    const frame = (this.frame ??= this.kind.frame(options))
    // A series that's gone isn't isolated any more.
    if (this.isolated !== null && !frame.series.some((s) => s.key === this.isolated)) this.isolated = null
    const context = this.context(options)
    const geometry = this.kind.plot(options, context)
    this.geometry = geometry
    const has = (key: string | null) => key !== null && geometry.points.some((p) => p.key === key)
    // A pin the data no longer has is let go, and the page hears so.
    if (this.pinned !== null && !has(this.pinned)) {
      this.pinned = null
      this.dispatchEvent(new CustomEvent("select", { detail: { value: null, source: "data", reason: "removed" } }))
    }
    if (this.active !== null && !has(this.active)) {
      this.active = null
      queueMicrotask(() => b.points.api?.setActive(null))
    }

    b.figure.className = ["chart", frame.className].join(" ")
    b.figure.dataset.view = this.view
    // With the table showing, the chart's own actions are out of agents' reach: the switch
    // is how they get back.
    attr(b.switcher, "data-agent-hidden", this.view === "chart")

    this.drawLegend(frame)

    display(b.plot, this.view === "chart")
    b.plot.style.blockSize = `${context.height}px`
    this.drawPoints(b.points, geometry.points, frame, chartTitle)
    this.drawSvg(geometry, context.height)

    display(b.table, this.view === "table")
    if (this.view === "table") b.table.replaceChildren(this.table(frame, chartTitle))
  }

  // The legend isolates one series; pressing it again shows them all. Its buttons are kept
  // by series, so the one pressed keeps focus.
  private drawLegend(frame: ChartFrameData) {
    const b = this.built!
    display(b.legend, frame.series.length > 1 && this.view === "chart")
    const buttons = frame.series.map((s) => {
      let button = this.legendButtons.get(s.key)
      if (!button) {
        button = h("button", { type: "button", class: "chart-legend-item" }, h("span", { class: "chart-swatch", "aria-hidden": "true" }), "") as HTMLButtonElement
        button.addEventListener("click", () => this.isolate(this.isolated === s.key ? null : s.key))
        this.legendButtons.set(s.key, button)
      }
      button.setAttribute("aria-pressed", String(this.isolated === s.key))
      attr(button, "data-dimmed", this.isolated !== null && this.isolated !== s.key)
      button.firstElementChild!.setAttribute("data-shape", s.shape)
      if (button.lastChild!.textContent !== s.label) button.lastChild!.textContent = s.label
      button.style.setProperty("--series", seriesColor(frame.series, s.key))
      return button
    })
    const keys = new Set(frame.series.map((s) => s.key))
    for (const key of [...this.legendButtons.keys()]) if (!keys.has(key)) this.legendButtons.delete(key)
    place(b.legend, buttons, (child) => child.localName === "button")
  }

  // Hover and focus moves redraw the drawing and the tooltip, and nothing else.
  private drawHover() {
    const b = this.built
    if (!b || !this.frame) return
    const options = this.current()
    if (this.kind.required.some((name) => options[name] === undefined)) return
    const context = this.context(options)
    const geometry = this.kind.plot(options, context)
    this.geometry = geometry
    this.drawSvg(geometry, context.height)
  }

  private drawSvg(geometry: ChartGeometry, height: number) {
    const b = this.built!
    b.svg.setAttribute("width", String(this.width))
    b.svg.setAttribute("height", String(height))
    b.svg.setAttribute("viewBox", `0 0 ${this.width} ${height}`)
    b.svg.replaceChildren(...toDom(geometry.svg, true))
    const anchor = geometry.points.find((p) => p.key === this.active) ?? geometry.points.find((p) => p.key === this.pinned)
    const tip = anchor && geometry.tooltip?.(anchor.key)
    display(b.tooltip, !!tip)
    if (anchor && tip) {
      b.tooltip.replaceChildren(...toDom(tip, false))
      b.tooltip.style.left = `${anchor.anchor.x}px`
      b.tooltip.style.top = `${anchor.anchor.y}px`
      attr(b.tooltip, "data-flip", anchor.anchor.x > this.width * 0.6)
    }
  }

  private drawPoints(el: PointsElement, points: ChartPoint[], frame: ChartFrameData, chartTitle: string) {
    el.orientation = frame.orientation ?? "horizontal"
    if (frame.columns) el.columns = frame.columns
    el.nearest = !!frame.nearest
    el.selected = this.pinned
    el.items = frame.rows
    el.view = {
      showing: this.view,
      series: this.isolated ? frame.series.find((s) => s.key === this.isolated)?.label : "all",
      ...(this.pinned ? { pinned: points.find((p) => p.key === this.pinned)?.label } : {}),
    }
    el.commands = this.commands(frame, chartTitle)
    // Options are kept by key, so the focused one keeps focus as the chart redraws; if it's
    // gone, focus moves to the option now in its place.
    const isOption = (child: Element) => child.localName === "uiset-chart-point"
    const before = [...el.children].filter(isOption) as HTMLElement[]
    const known = new Map(before.map((option) => [option.getAttribute("value")!, option]))
    const focused = before.find((option) => option === document.activeElement)
    place(
      el,
      points.map((point) => {
        const option = known.get(point.key) ?? h("uiset-chart-point", { value: point.key, class: "chart-point" })
        if (option.getAttribute("aria-label") !== point.label) option.setAttribute("aria-label", point.label)
        Object.assign(option.style, { left: `${point.x}px`, top: `${point.y}px`, width: `${point.width}px`, height: `${point.height}px` })
        return option
      }),
      isOption,
    )
    if (focused && !focused.isConnected) {
      const after = [...el.children].filter(isOption) as HTMLElement[]
      after[Math.min(before.indexOf(focused), after.length - 1)]?.focus()
    }
    // Scatter points sit close together; the pointer only has to be nearest.
    el.onpointermove = frame.nearest
      ? (event) => {
          const box = el.getBoundingClientRect()
          const px = event.clientX - box.left
          const py = event.clientY - box.top
          let best: ChartPoint | undefined
          let distance = 48 * 48
          for (const point of this.geometry?.points ?? []) {
            const dx = point.x + point.width / 2 - px
            const dy = point.y + point.height / 2 - py
            const d = dx * dx + dy * dy
            if (d < distance) {
              distance = d
              best = point
            }
          }
          el.api?.setActive(best?.key ?? null)
        }
      : null
    el.onclick = frame.nearest ? (event) => event.detail > 0 && el.api?.toggleActive() : null
  }

  private commands(frame: ChartFrameData, chartTitle: string): ChartCommands {
    // Agents name a position by what people read ("March"), and only then by its key: a
    // sorted bar chart's keys aren't its readings.
    const byLabel = (name: string) => {
      const points = this.geometry?.points ?? []
      const wanted = name.toLowerCase()
      return points.find((p) => p.label.toLowerCase() === wanted) ?? points.find((p) => p.label.toLowerCase().startsWith(`${wanted}:`)) ?? points.find((p) => p.key === name)
    }
    const agent = { source: "agent", reason: "command" } as const
    return {
      select: (name) => {
        if (name === null) return this.pin(null, agent)
        const point = byLabel(name)
        if (!point) throw new Error(`No "${name}" in ${chartTitle}.`)
        if (!this.pin(point.key, agent)) throw new Error(`${chartTitle} didn't take that pin.`)
        return true
      },
      isolate: (name) => {
        const found = frame.series.find((s) => s.key === name || s.label.toLowerCase() === name.toLowerCase())
        if (!found) throw new Error(`No series "${name}" in ${chartTitle}. Its series: ${frame.series.map((s) => s.label).join(", ")}.`)
        this.isolate(found.key)
        return true
      },
      showAll: () => (this.isolate(null), true),
      showTable: (on) => (this.show(on ? "table" : "chart"), true),
    }
  }

  private table(frame: ChartFrameData, chartTitle: string) {
    const { head, rows, numeric } = frame.table
    return h(
      "table",
      { class: "chart-table" },
      h("caption", { class: "uiset-visually-hidden" }, chartTitle),
      h("thead", null, h("tr", null, ...head.map((cell, i) => h("th", { scope: "col", "data-numeric": !!numeric?.[i] }, cell)))),
      h(
        "tbody",
        null,
        ...rows.map((row) =>
          h("tr", null, ...row.cells.map((cell, i) => (i === 0 ? h("th", { scope: "row" }, cell) : h("td", { "data-numeric": !!numeric?.[i] }, cell)))),
        ),
      ),
    )
  }
}

/** Defines <tag> for one kind of chart, with a property per option and per attribute. */
function defineChart<Options extends object>(tag: string, kind: ChartKind<Options>) {
  const Chart = class extends UISetChart<Options> {}
  ;(Chart as unknown as { kind: ChartKind<Options> }).kind = kind
  const renamedOptions = new Set(Object.values(kind.renamed ?? {}))
  const properties: [string, string][] = [
    ...kind.properties.filter((name) => !renamedOptions.has(name)).map((name) => [name, name] as [string, string]),
    ...Object.entries(kind.renamed ?? {}).map(([property, option]) => [property, option] as [string, string]),
  ]
  for (const [property, option] of properties) {
    Object.defineProperty(Chart.prototype, property, {
      get(this: UISetChart<Options>) {
        return this.getOption(option)
      },
      set(this: UISetChart<Options>, value: unknown) {
        this.setOption(option, value)
      },
    })
  }
  // Each attribute has a property that reflects it, so frameworks that set properties work.
  for (const name of [...frameAttributes, ...kind.attributes]) {
    Object.defineProperty(Chart.prototype, name, {
      get(this: HTMLElement) {
        const value = this.getAttribute(kebab(name))
        return name === "height" && value !== null ? Number(value) : value
      },
      set(this: HTMLElement, value: unknown) {
        attr(this, kebab(name), value === null || value === undefined || value === false ? null : value === true ? true : String(value))
      },
    })
  }
  defineElement(tag, Chart)
  return Chart
}

function defineCharts() {
  // The frame drives hover for nearest-point charts through the points' api.
  createParts(chartPoints, {
    root: { tag: "uiset-chart-points", api: ["setActive", "toggleActive"] },
    point: "uiset-chart-point",
  })
  defineChart("uiset-line-chart", {
    frame: lineFrame,
    plot: linePlot,
    height: (_options, given) => given ?? 240,
    properties: ["data", "x", "series", "format", "zero"],
    attributes: ["layout", "locale"],
    required: ["data", "x", "series"],
  })
  defineChart("uiset-bar-chart", {
    frame: barFrame,
    plot: barPlot,
    height: barHeight,
    properties: ["data", "x", "series", "format", "labels"],
    attributes: ["orientation", "layout", "sort", "locale"],
    required: ["data", "x", "series"],
  })
  defineChart("uiset-scatter-chart", {
    frame: scatterFrame,
    plot: scatterPlot,
    height: (_options, given) => given ?? 280,
    properties: ["data", "label", "x", "y", "series", "formatX", "formatY"],
    attributes: ["xLabel", "yLabel", "locale"],
    required: ["data", "label", "x", "y", "xLabel", "yLabel"],
    renamed: { pointLabel: "label" },
  })
  defineChart("uiset-heatmap", {
    frame: heatmapFrame,
    plot: heatmapPlot,
    height: (options, given) => heatmapHeight(options.rows ?? [], given),
    properties: ["data", "rows", "columns", "row", "column", "value", "format"],
    attributes: ["measure", "locale"],
    required: ["data", "rows", "columns", "row", "column", "value", "measure"],
  })
  defineChart("uiset-segmented-bar", {
    frame: segmentedBarFrame,
    plot: segmentedBarPlot,
    height: (options) => segmentedBarHeight(options),
    properties: ["parts", "format"],
    attributes: ["variant", "locale"],
    required: ["parts"],
  })
}

/**
 * A chart element to TypeScript: its options as properties (null until set), and the title,
 * description and height every chart takes.
 */
type ChartElement<Options extends object> = UISetChart<Options> & { [Name in keyof Options]?: Options[Name] | null } & {
  label: string | null
  description: string | null
  height: number | null
}
// A datum is whatever the page's data holds: say what it is (`UISetLineChart<Month>`) to
// have `x` and each series' `value` checked against it.
type UISetLineChart<Datum = any> = ChartElement<LineOptions<Datum>>
type UISetBarChart<Datum = any> = ChartElement<BarOptions<Datum>>
/** `label` is the chart's title here, so the point-name accessor is `pointLabel`. */
type UISetScatterChart<Datum = any> = ChartElement<Omit<ScatterOptions<Datum>, "label"> & { pointLabel: ScatterOptions<Datum>["label"] }>
type UISetHeatmap<Datum = any> = ChartElement<HeatmapOptions<Datum>>
type UISetSegmentedBar = ChartElement<SegmentedBarOptions>

export { defineCharts, toDom, UISetChart }
export type { UISetBarChart, UISetChartEvents, UISetHeatmap, UISetLineChart, UISetScatterChart, UISetSegmentedBar }
