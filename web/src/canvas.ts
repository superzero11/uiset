// The Canvas for Web Components: <uiset-canvas> draws nodes, ports, wires, a minimap and
// zoom controls from `nodes` and `edges`, on the same primitive as the React Canvas
// (canvas/canvas.ts): pan and zoom, drag nodes or move them with Alt and arrows, spatial
// focus, Shift-drag box selection, wires by pointer or with C and arrows, undo with
// `history`, and agent actions. <uiset-canvas-toolbar> and <uiset-canvas-inspector> are
// the React CanvasToolbar and CanvasInspector, joined to a canvas by its id.
import { ariaKeyshortcuts, createUndoStack, type Viewport } from "@ui-sdk/core"
import { createParts, wrappedButton, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/menu"
import "@ui-sdk/web/toolbar"
import { canvasPrimitive, type CanvasEdge, type CanvasNodeKind } from "@/registry/uiset/ui/canvas/canvas"
import { describeWires, nodeRect, parsePort, portKey, type CanvasNodeShape, type CanvasPort, type Point } from "@/registry/uiset/ui/canvas/geometry"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/chart/tokens.css"
import "@/registry/uiset/ui/canvas/canvas.css"
import { attr, defineElement, ElementBase, h, holdRender, isOn, place, uid, upgradeProperties } from "./dom"
import { returnFocus } from "@/registry/uiset/ui/uiset/focus"

type CanvasNode = CanvasNodeShape & {
  x: number
  y: number
  /** One of `kinds`, shown above the title. */
  kind?: string
  /** A chart slot, 1 to 8, for the header's accent. */
  color?: number
  /** Anything your app keeps on a node, like a prompt or a model name. */
  data?: Record<string, unknown>
}

type CanvasChange = { reason: string; type: "move" | "add" | "remove" | "edit" }

type CanvasApi = {
  fitView: () => boolean
  zoomIn: () => boolean
  zoomOut: () => boolean
  resetZoom: () => boolean
  selectedNodes: () => string[]
  removeSelected: () => boolean
  addNode: (kind: string, title?: string, x?: number, y?: number) => string
  focusNode: (id: string) => void
  disconnect: (edge: string, to?: string) => boolean
  nodeElement: (id: string) => HTMLElement | undefined
  moveNode: (node: string, x: number, y: number) => boolean
  /** Wires two nodes by id or title; name the ports when a node has several. */
  connect: (from: string, to: string, fromPort?: string, toPort?: string) => boolean
  select: (...nodes: string[]) => boolean
  /** Opens a node, as Enter does. Throws when the canvas isn't `openable`. */
  openNode: (node: string) => boolean
  centerOn: (point: Point) => boolean
  view: () => { left: number; right: number; top: number; bottom: number }
}

/** What `<uiset-canvas>` fires. `preventDefault()` on a change event refuses it. */
type UISetCanvasEvents = {
  /** A move, add, remove or edit: `value` is every node, `type` says which. */
  nodeschange: CustomEvent<{ value: CanvasNode[] } & CanvasChange>
  edgeschange: CustomEvent<{ value: CanvasEdge[]; reason: string }>
  /** With `history`, whenever undo or redo becomes possible or not. */
  historychange: CustomEvent<{ canUndo: boolean; canRedo: boolean }>
  selectedchange: UiChangeEvent<string[]>
  viewportchange: UiChangeEvent<Viewport>
  /** Enter or a double-click on a node, with `openable`. */
  open: CustomEvent<{ value: string }>
}

type CanvasElement = UiElement<UISetCanvasEvents> & {
  nodes?: CanvasNode[]
  edges?: CanvasEdge[]
  kinds?: CanvasNodeKind[]
  /** Makes the node Add or an agent asks for; return null to refuse. */
  createNode?: (kind: string, at: Point, title?: string) => CanvasNode | null
  canConnect?: (from: string, to: string) => boolean
  locked?: (node: CanvasNode) => boolean
  /** What a node shows under its ports. */
  renderNode?: (node: CanvasNode) => Node | string | null | undefined
  selected?: string[]
  api?: CanvasApi
  undo?: () => boolean
  redo?: () => boolean
  canUndo?: boolean
  canRedo?: boolean
  updateNode?: (id: string, patch: Partial<CanvasNode>) => boolean
}

type CanvasInstance = {
  get: () => Record<string, unknown>
  subscribe: (run: () => void) => () => void
  api: CanvasApi & {
    wire: (state: object, id: string) => string
    wireMiddle: (state: object, id: string) => Point | undefined
    draftWire: (state: object) => string
    overview: () => string
    disconnect: (edge: string) => boolean
  }
}

const series = (color?: number) => `var(--chart-${Math.min(8, Math.max(1, Math.round(color ?? 1)))})`
/** On unless the attribute says "false", like React's `controls` and `minimap` defaults. */
const notOff = (el: Element, name: string) => el.getAttribute(name) !== "false"
const svgNS = "http://www.w3.org/2000/svg"
const svg = (tag: string, attrs: Record<string, string> = {}, ...children: Node[]) => {
  const el = document.createElementNS(svgNS, tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  el.append(...children)
  return el
}

// A function's identity, so a new renderNode draws nodes again.
const fnIds = new WeakMap<object, number>()
let nextFn = 1
const fnId = (fn?: object) => (fn ? (fnIds.get(fn) ?? (fnIds.set(fn, nextFn++), nextFn - 1)) : 0)

// Positions come from the nodes, made once per nodes array so a redraw doesn't count as a move.
const positionsCache = new WeakMap<object, Record<string, Point>>()
const positionsOf = (nodes: CanvasNode[]) => {
  let positions = positionsCache.get(nodes)
  if (!positions) positionsCache.set(nodes, (positions = Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y }]))))
  return positions
}

type Snapshot = { nodes: CanvasNode[]; edges: CanvasEdge[] }

type NodeView = { part: HTMLElement; sig: string; ids: { title: string; kind: string; body: string; wires: string } }

// Each canvas keeps its nodes and wires across renders (a property set renders again), so a
// drag, a keyboard wire and focus stay where they are.
const views = new WeakMap<CanvasElement, CanvasView>()
const viewOf = (el: CanvasElement) => {
  let view = views.get(el)
  if (!view) views.set(el, (view = new CanvasView(el)))
  return view
}

class CanvasView {
  private help = h(
    "p",
    { id: uid("canvas-help"), hidden: true },
    "Arrow keys go to the nearest node that way. Alt with arrows moves it, Space selects it, C starts a wire (arrows choose an input, Enter connects, Escape stops), Delete removes, Enter opens. Plus and minus zoom; 0 resets.",
  )
  private grid = h("uiset-canvas-grid", { class: "canvas-grid" })
  private wires = svg("svg", { class: "canvas-wires", "aria-hidden": "true", width: "1", height: "1" }) as SVGSVGElement
  private draft = svg("path", { class: "canvas-wire", "data-draft": "" })
  private nodesBox = h("uiset-canvas-nodes", { class: "canvas-nodes" })
  private world = h("uiset-canvas-world", { class: "canvas-world" }, this.wires, this.nodesBox)
  private lasso = h("uiset-canvas-lasso", { class: "canvas-lasso" })
  private controls: HTMLElement
  private minimap: HTMLElement
  private mapSvg = svg("svg", { preserveAspectRatio: "xMidYMid meet" }) as SVGSVGElement
  private mapView = svg("rect", { class: "canvas-minimap-view" })
  private nodeViews = new Map<string, NodeView>()
  private edgeViews = new Map<string, { path: SVGPathElement; unwire: SVGGElement }>()
  private instance?: CanvasInstance
  private queued = false
  private fitted = false
  private resize?: ResizeObserver
  // Undo and redo, with `history`: snapshots of nodes and edges.
  private stack?: ReturnType<typeof createUndoStack<Snapshot>>
  private present?: Snapshot
  private applying = false

  constructor(private el: CanvasElement) {
    el.classList.add("canvas")
    const button = (label: string, icon: Parameters<typeof iconElement>[0], run: () => void) => {
      const b = h("button", { type: "button", "data-variant": "ghost", "aria-label": label, onclick: run }, iconElement(icon))
      return h("ui-button", null, b)
    }
    this.controls = h(
      "div",
      { class: "canvas-controls", role: "group", "aria-label": "Zoom", "data-canvas-control": "" },
      button("Zoom out", "minus", () => this.instance?.api.zoomOut()),
      h("uiset-canvas-zoom", { onclick: () => this.instance?.api.resetZoom() }, h("button", { type: "button", class: "canvas-zoom" })),
      button("Zoom in", "plus", () => this.instance?.api.zoomIn()),
      button("Fit to view", "fit", () => this.instance?.api.fitView()),
    )
    this.mapSvg.append(this.mapView)
    this.minimap = h("div", { class: "canvas-minimap", "aria-hidden": "true", "data-canvas-control": "" }, this.mapSvg)
    this.bindMinimap()
    this.wires.append(this.draft)
    el.replaceChildren(this.help, this.grid, this.world, this.lasso, this.controls, this.minimap)
    // These attributes change what's drawn, not the canvas's state.
    new MutationObserver(() => this.schedule()).observe(el, { attributes: true, attributeFilter: ["controls", "minimap", "label", "aria-label", "aria-describedby", "fit-view", "history"] })
  }

  attach(instance: CanvasInstance) {
    this.instance = instance
    this.schedule()
    // Wires, the draft and the minimap follow every move and pan as it happens.
    return instance.subscribe(() => this.live())
  }

  schedule() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      this.draw()
    })
  }

  private get label() {
    return this.el.getAttribute("label") ?? this.el.getAttribute("aria-label") ?? ""
  }

  draw() {
    const el = this.el
    const instance = this.instance
    if (!instance) return
    const nodes = el.nodes ?? []
    const edges = el.edges ?? []
    const kinds = el.kinds
    attr(el, "aria-label", this.label || null)
    const described = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== this.help.id)
    attr(el, "aria-describedby", [...described, this.help.id].join(" "))
    attr(this.nodesBox, "aria-label", `${this.label} nodes`)
    this.controls.style.display = notOff(el, "controls") ? "" : "none"
    this.minimap.style.display = notOff(el, "minimap") ? "" : "none"
    this.syncHistory()

    // Nodes, kept by id: a node whose details changed is filled again in place.
    const shown = new Set(nodes.map((n) => n.id))
    for (const [id, view] of this.nodeViews) if (!shown.has(id)) (view.part.remove(), this.nodeViews.delete(id))
    place(
      this.nodesBox,
      nodes.map((node) => this.nodeView(node, nodes, edges, kinds)),
      (child) => child.localName === "uiset-canvas-node",
    )

    // Wires and their Disconnect handles, kept by id.
    const wired = new Set(edges.map((e) => e.id))
    for (const [id, view] of this.edgeViews) if (!wired.has(id)) (view.path.remove(), view.unwire.remove(), this.edgeViews.delete(id))
    for (const edge of edges) {
      if (this.edgeViews.has(edge.id)) continue
      const path = svg("path", { class: "canvas-wire", "data-slot": "canvas-wire", "data-wire": edge.id }) as SVGPathElement
      const unwire = svg(
        "g",
        { class: "canvas-unwire", "data-slot": "canvas-unwire", "data-canvas-unwire": "", "data-wire": edge.id },
        svg("title", {}, document.createTextNode("Disconnect")),
        svg("circle", { r: "9" }),
        svg("path", { d: "M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" }),
      ) as SVGGElement
      unwire.addEventListener("pointerdown", (event) => event.stopPropagation())
      unwire.addEventListener("click", () => this.instance?.api.disconnect(edge.id))
      this.edgeViews.set(edge.id, { path, unwire })
    }
    // Wires under the draft, handles over it.
    this.wires.replaceChildren(...edges.map((e) => this.edgeViews.get(e.id)!.path), this.draft, ...edges.map((e) => this.edgeViews.get(e.id)!.unwire))

    // The minimap's nodes.
    this.mapSvg.replaceChildren(
      ...nodes.map((node) => {
        const r = nodeRect(node, node)
        const rect = svg("rect", { class: "canvas-minimap-node", x: String(r.left), y: String(r.top), width: String(r.right - r.left), height: String(r.bottom - r.top), rx: "6" })
        rect.style.setProperty("--series", series(node.color))
        return rect
      }),
      this.mapView,
    )
    this.live()
    this.fit()
  }

  private nodeView(node: CanvasNode, nodes: CanvasNode[], edges: CanvasEdge[], kinds?: CanvasNodeKind[]) {
    const el = this.el
    const kind = kinds?.find((k) => k.id === node.kind)?.label
    const wires = describeWires(node, nodes, edges)
    const locked = el.locked?.(node) ?? false
    const sig = JSON.stringify([node.title, node.inputs, node.outputs, node.width, node.color, kind, wires, locked, node.data, fnId(el.renderNode)])
    let view = this.nodeViews.get(node.id)
    if (!view) {
      const base = uid("canvas-node")
      view = { part: h("uiset-canvas-node", { value: node.id, class: "canvas-node" }), sig: "", ids: { title: `${base}-title`, kind: `${base}-kind`, body: `${base}-body`, wires: `${base}-wires` } }
      this.nodeViews.set(node.id, view)
    }
    if (view.sig === sig) return view.part
    view.sig = sig
    const { ids, part } = view
    const body = el.renderNode?.(node)
    const rows = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0)
    const port = (side: "in" | "out", spec?: CanvasPort) => (spec ? h("uiset-canvas-port", { value: portKey(node.id, side, spec.id), class: "canvas-port" }) : null)
    const card = h(
      "span",
      { class: "canvas-node-card" },
      h("span", { class: "canvas-node-header" }, h("span", { id: ids.title, class: "canvas-node-title" }, node.title), kind ? h("span", { id: ids.kind, class: "canvas-node-kind" }, kind) : null),
      ...Array.from({ length: rows }, (_, i) =>
        h(
          "span",
          { class: "canvas-node-row" },
          h("span", { class: "canvas-node-in" }, port("in", node.inputs?.[i]), h("span", { class: "canvas-port-label" }, node.inputs?.[i]?.label ?? "")),
          h("span", { class: "canvas-node-out" }, h("span", { class: "canvas-port-label" }, node.outputs?.[i]?.label ?? ""), port("out", node.outputs?.[i])),
        ),
      ),
      h("span", { class: "canvas-node-foot" }),
      body ? h("span", { id: ids.body, class: "canvas-node-body" }, body) : null,
    )
    card.style.inlineSize = `${node.width ?? 208}px`
    card.style.setProperty("--series", series(node.color))
    // Named by what it shows, in the order it shows it: title, then kind.
    attr(part, "aria-labelledby", kind ? `${ids.title} ${ids.kind}` : ids.title)
    attr(part, "aria-describedby", [body ? ids.body : "", wires ? ids.wires : ""].filter(Boolean).join(" ") || null)
    attr(part, "data-locked", locked)
    part.replaceChildren(card, ...(wires ? [h("span", { id: ids.wires, hidden: true }, wires)] : []))
    return part
  }

  /** What follows moves and pans as they happen: wires, the draft, the minimap's frame. */
  private live() {
    const instance = this.instance
    if (!instance) return
    const state = instance.get()
    for (const [id, view] of this.edgeViews) {
      attr(view.path, "d", instance.api.wire(state, id) || null)
      const at = instance.api.wireMiddle(state, id)
      attr(view.unwire, "transform", at ? `translate(${at.x} ${at.y})` : "translate(-9999 -9999)")
    }
    attr(this.draft, "d", instance.api.draftWire(state) || null)
    attr(this.mapSvg, "viewBox", instance.api.overview() || null)
    const view = instance.api.view()
    attr(this.mapView, "x", view.left)
    attr(this.mapView, "y", view.top)
    attr(this.mapView, "width", Math.max(0, view.right - view.left))
    attr(this.mapView, "height", Math.max(0, view.bottom - view.top))
  }

  // Press or drag on the minimap to look elsewhere. A drag keeps the frame it started with:
  // the map follows the view, so re-mapping each move would make the view run away.
  private bindMinimap() {
    let frame: DOMMatrix | null = null
    const toCanvas = (event: PointerEvent) => {
      if (!frame) return
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(frame)
      this.instance?.api.centerOn({ x: point.x, y: point.y })
    }
    this.mapSvg.addEventListener("pointerdown", (event) => {
      this.mapSvg.setPointerCapture(event.pointerId)
      frame = this.mapSvg.getScreenCTM()?.inverse() ?? null
      toCanvas(event)
    })
    this.mapSvg.addEventListener("pointermove", (event) => event.buttons && toCanvas(event))
    const end = () => (frame = null)
    this.mapSvg.addEventListener("pointerup", end)
    this.mapSvg.addEventListener("pointercancel", end)
  }

  // With `fit-view`, every node is framed once the canvas has a size to fit them in.
  private fit() {
    if (this.fitted || !isOn(this.el, "fit-view")) return
    const tryFit = () => {
      const view = this.instance?.api.view()
      if (!view || view.right - view.left <= 0 || !(this.el.nodes ?? []).length) return false
      this.fitted = true
      this.resize?.disconnect()
      this.instance!.api.fitView()
      return true
    }
    if (tryFit()) return
    this.resize ??= new ResizeObserver(() => tryFit())
    this.resize.observe(this.el)
  }

  /* -------------------------------------------------------------- changes */

  /** Applies a change to the nodes, unless the page refuses it (preventDefault on `nodeschange`). */
  setNodes(next: CanvasNode[], details: CanvasChange, record = true) {
    const event = new CustomEvent("nodeschange", { detail: { value: next, ...details }, cancelable: true })
    if (!this.el.dispatchEvent(event)) return false
    this.applying = true
    this.el.nodes = next
    this.applying = false
    if (record) this.record()
    return true
  }

  setEdges(next: CanvasEdge[], reason: string, record = true) {
    const event = new CustomEvent("edgeschange", { detail: { value: next, reason }, cancelable: true })
    if (!this.el.dispatchEvent(event)) return false
    this.applying = true
    this.el.edges = next
    this.applying = false
    if (record) this.record()
    return true
  }

  applyPositions(next: Record<string, Point>, details: { reason: string }) {
    const nodes = this.el.nodes ?? []
    this.setNodes(
      nodes.map((n) => (next[n.id] && (next[n.id]!.x !== n.x || next[n.id]!.y !== n.y) ? { ...n, ...next[n.id]! } : n)),
      { reason: details.reason, type: "move" },
    )
  }

  // Removing nodes takes their wires in the same step, so one undo brings both back.
  remove(ids: string[]) {
    const gone = new Set(ids)
    if (!this.setNodes((this.el.nodes ?? []).filter((n) => !gone.has(n.id)), { reason: "imperative", type: "remove" }, false)) return
    this.setEdges((this.el.edges ?? []).filter((e) => !gone.has(parsePort(e.from).node) && !gone.has(parsePort(e.to).node)), "imperative", false)
    this.record()
  }

  add(kind: string, at: Point, title?: string) {
    const node = this.el.createNode?.(kind, at, title)
    if (!node) return undefined
    return this.setNodes([...(this.el.nodes ?? []), node], { reason: "imperative", type: "add" }) ? node.id : undefined
  }

  update(id: string, patch: Partial<CanvasNode>) {
    const nodes = this.el.nodes ?? []
    const found = nodes.find((n) => n.id === id)
    if (!found) return false
    const next = { ...found, ...patch, id }
    // An edit that changes nothing records nothing.
    if (JSON.stringify(next) === JSON.stringify(found)) return true
    return this.setNodes(nodes.map((n) => (n.id === id ? next : n)), { reason: "imperative", type: "edit" })
  }

  /* -------------------------------------------------------------- history */

  private syncHistory() {
    if (!isOn(this.el, "history")) return
    const now = { nodes: this.el.nodes ?? [], edges: this.el.edges ?? [] }
    // A page that sets new nodes or edges itself (a file it opened) starts a new history.
    if (!this.stack || (!this.applying && this.present && (this.present.nodes !== now.nodes || this.present.edges !== now.edges))) {
      this.stack = createUndoStack<Snapshot>(now)
      this.present = now
      this.historyChanged()
    }
  }

  // A change of the canvas's own: a step on the stack (the stack holds what came before it).
  private record() {
    if (!isOn(this.el, "history") || !this.stack || !this.present) return
    const now = { nodes: this.el.nodes ?? [], edges: this.el.edges ?? [] }
    const was = this.present!
    const same = was.nodes.length === now.nodes.length && was.nodes.every((n, i) => n === now.nodes[i]) && was.edges.map((e) => e.id).join("|") === now.edges.map((e) => e.id).join("|")
    if (same) return
    this.present = now
    this.stack!.record(now)
    this.historyChanged()
  }

  private restore(snapshot: Snapshot | undefined, reason: "undo" | "redo") {
    if (!snapshot) return false
    const root = this.el
    // A focused node that goes hands focus on through the primitive's own recovery.
    this.applying = true
    root.nodes = snapshot.nodes
    root.edges = snapshot.edges
    this.applying = false
    this.present = snapshot
    root.dispatchEvent(new CustomEvent("nodeschange", { detail: { value: snapshot.nodes, reason, type: "edit" } }))
    root.dispatchEvent(new CustomEvent("edgeschange", { detail: { value: snapshot.edges, reason } }))
    this.historyChanged()
    return true
  }

  undo() {
    return this.restore(this.stack?.undo(), "undo")
  }
  redo() {
    return this.restore(this.stack?.redo(), "redo")
  }
  get canUndo() {
    return this.stack?.canUndo() ?? false
  }
  get canRedo() {
    return this.stack?.canRedo() ?? false
  }

  private historyChanged() {
    this.el.dispatchEvent(new CustomEvent("historychange", { detail: { canUndo: this.canUndo, canRedo: this.canRedo } }))
  }
}

/* ---------------------------------------------------------------- Toolbar */

/** A canvas by the id in `for`, once it's on the page. */
function canvasFor(el: HTMLElement, then: (canvas: CanvasElement) => void) {
  let tries = 0
  const look = () => {
    const canvas = document.getElementById(el.getAttribute("for") ?? "") as CanvasElement | null
    if (canvas?.api) return then(canvas)
    if (tries++ < 60) requestAnimationFrame(look)
  }
  look()
}

/**
 * <uiset-canvas-toolbar for="workflow"> is Add, Remove, Undo, Redo and Fit view for a
 * canvas, on UI SDK's toolbar: one tab stop, arrows between tools, and disabled tools still
 * reachable, so focus never drops when one turns off. Add lists the canvas's `kinds`;
 * Undo and Redo show when the canvas has `history`.
 */
class UISetCanvasToolbar extends ElementBase {
  static observedAttributes = ["label"]
  #canvas?: CanvasElement
  #toolbar?: HTMLElement
  #parts?: { menu: HTMLElement; menuContent: HTMLElement; remove: HTMLElement; removeButton: HTMLElement; undo: HTMLElement; redo: HTMLElement; separator: HTMLElement }
  #stop?: () => void

  connectedCallback() {
    if (!this.#toolbar) this.build()
    canvasFor(this, (canvas) => this.join(canvas))
  }
  disconnectedCallback() {
    this.#stop?.()
    this.#stop = undefined
  }
  attributeChangedCallback() {
    // Keep the canvas's name out of it: agents find components by names that contain what
    // they ask for, so "Workflow tools" would also answer "Workflow".
    this.#toolbar?.setAttribute("aria-label", this.getAttribute("label") ?? "Canvas tools")
  }

  private build() {
    const tool = (label: string, attrs: Record<string, unknown>, run: () => void, ...content: (Node | string)[]) =>
      h("ui-toolbar-button", null, h("button", { type: "button", "data-variant": "ghost", ...attrs, onclick: run }, ...content, label))
    const menuContent = h("ui-menu-content")
    const menu = h(
      "ui-menu",
      null,
      h("ui-toolbar-button", null, h("ui-menu-trigger", null, h("button", { type: "button", "data-variant": "outline" }, iconElement("plus"), "Add node"))),
      menuContent,
    )
    menu.addEventListener("action", (event) => this.add(String((event as CustomEvent<{ value: unknown }>).detail.value)))
    const remove = tool("Remove node", { "data-agent-confirm": "Removes the selected nodes and their wires" }, () => this.#canvas?.api?.removeSelected(), iconElement("trash"))
    const undo = tool("Undo", { "aria-keyshortcuts": ariaKeyshortcuts("mod+z") }, () => this.#canvas?.undo?.())
    const redo = tool("Redo", { "aria-keyshortcuts": ariaKeyshortcuts("mod+shift+z") }, () => this.#canvas?.redo?.())
    const separator = h("ui-toolbar-separator")
    this.#toolbar = h(
      "ui-toolbar",
      { class: "canvas-toolbar", "aria-label": this.getAttribute("label") ?? "Canvas tools" },
      menu,
      remove,
      separator,
      undo,
      redo,
      h("ui-toolbar-separator"),
      tool("Fit view", {}, () => this.#canvas?.api?.fitView()),
    )
    this.#parts = { menu, menuContent, remove, removeButton: remove.querySelector("button")!, undo, redo, separator }
    this.replaceChildren(this.#toolbar)
  }

  private join(canvas: CanvasElement) {
    this.#stop?.()
    this.#canvas = canvas
    const update = () => this.update()
    const names = ["selectedchange", "nodeschange", "historychange"]
    for (const name of names) canvas.addEventListener(name, update)
    // Undo and Redo come and go with the canvas's `history`.
    const observer = new MutationObserver(update)
    observer.observe(canvas, { attributes: true, attributeFilter: ["history"] })
    this.#stop = () => (names.forEach((name) => canvas.removeEventListener(name, update)), observer.disconnect())
    this.update()
  }

  // The menu hands focus back to its button as it closes; the new node takes it after.
  private add(kind: string) {
    const canvas = this.#canvas
    let id: string | undefined
    try {
      id = canvas?.api?.addNode(kind)
    } catch {
      return
    }
    if (id) requestAnimationFrame(() => requestAnimationFrame(() => canvas?.api?.focusNode(id!)))
  }

  private update() {
    const canvas = this.#canvas
    const parts = this.#parts
    if (!canvas || !parts) return
    const kinds = canvas.kinds ?? []
    parts.menu.style.display = kinds.length ? "" : "none"
    const items = kinds.map((kind) => h("ui-menu-item", { value: kind.id }, kind.label))
    if (parts.menuContent.textContent !== items.map((i) => i.textContent).join("")) parts.menuContent.replaceChildren(...items)
    // Read after the canvas has applied the change that fired the event.
    queueMicrotask(() => {
      const count = canvas.api?.selectedNodes().length ?? 0
      attr(parts.remove, "disabled", count === 0)
      parts.removeButton.lastChild!.textContent = count > 1 ? `Remove ${count} nodes` : "Remove node"
      const history = isOn(canvas, "history")
      for (const el of [parts.separator, parts.undo, parts.redo]) el.style.display = history ? "" : "none"
      attr(parts.undo, "disabled", !canvas.canUndo)
      attr(parts.redo, "disabled", !canvas.canRedo)
    })
  }
}

/* -------------------------------------------------------------- Inspector */

/**
 * <uiset-canvas-inspector for="workflow" renamable> shows the selected node: its title, a
 * Rename form, your fields (`renderFields(node)`), and its wires, each with Disconnect.
 * Fields start over for each node.
 */
class UISetCanvasInspector extends ElementBase {
  static observedAttributes = ["empty", "renamable"]
  #canvas?: CanvasElement
  #renderFields?: (node: CanvasNode) => Node | null | undefined
  #shown: string | null = null
  #stop?: () => void
  #parts?: { aside: HTMLElement; title: HTMLElement; body: HTMLElement; wires: HTMLElement }

  get renderFields() {
    return this.#renderFields
  }
  set renderFields(fn: ((node: CanvasNode) => Node | null | undefined) | undefined) {
    this.#renderFields = fn
    this.#shown = null
    this.update()
  }

  connectedCallback() {
    upgradeProperties(this, ["renderFields"])
    if (!this.#parts) {
      const titleId = uid("canvas-inspector")
      const title = h("h3", { id: titleId, class: "canvas-inspector-title" })
      const body = h("div", { class: "canvas-inspector-fields" })
      const wires = h("div", { class: "canvas-inspector-wire-list" })
      const aside = h("aside", { class: "canvas-inspector", "aria-labelledby": titleId }, title, body, wires)
      this.#parts = { aside, title, body, wires }
      this.replaceChildren(aside)
    }
    canvasFor(this, (canvas) => this.join(canvas))
  }
  disconnectedCallback() {
    this.#stop?.()
    this.#stop = undefined
  }
  attributeChangedCallback() {
    this.#shown = null
    this.update()
  }

  private join(canvas: CanvasElement) {
    this.#stop?.()
    this.#canvas = canvas
    const update = () => queueMicrotask(() => this.update())
    const names = ["selectedchange", "nodeschange", "edgeschange"]
    for (const name of names) canvas.addEventListener(name, update)
    this.#stop = () => names.forEach((name) => canvas.removeEventListener(name, update))
    this.update()
  }

  private node() {
    const canvas = this.#canvas
    const ids = canvas?.api?.selectedNodes() ?? []
    return ids.length === 1 ? ((canvas?.nodes ?? []).find((n) => n.id === ids[0]) ?? null) : null
  }

  private update() {
    const parts = this.#parts
    const canvas = this.#canvas
    if (!parts || !canvas) return
    const node = this.node()
    if (!node) {
      this.#shown = null
      parts.title.textContent = "Details"
      parts.body.replaceChildren(h("p", { class: "canvas-inspector-empty" }, this.getAttribute("empty") ?? "Select a node to see its details."))
      parts.wires.replaceChildren()
      return
    }
    parts.title.textContent = node.title
    // A new node gets its own fields; the same node keeps what's typed in them.
    if (this.#shown !== node.id) {
      this.#shown = node.id
      parts.body.replaceChildren(...(isOn(this, "renamable") ? [this.renameForm(node)] : []), ...[this.#renderFields?.(node)].filter((n): n is Node => !!n))
    }
    this.drawWires(node)
  }

  private renameForm(node: CanvasNode) {
    const inputId = uid("canvas-rename")
    const input = h("input", { id: inputId, name: "node-title", required: true, autocomplete: "off" }) as HTMLInputElement
    input.value = node.title
    const form = h(
      "form",
      {
        class: "canvas-inspector-form",
        "aria-label": `Rename ${node.title}`,
        onsubmit: (event: Event) => {
          event.preventDefault()
          const text = input.value.trim()
          if (text) this.#canvas?.updateNode?.(node.id, { title: text })
        },
      },
      h("ui-field", { name: "node-title" }, h("ui-field-label", { for: inputId }, "Title"), h("ui-input", null, input)),
      h("ui-button", null, h("button", { type: "submit", "data-variant": "outline" }, "Rename")),
    )
    return form
  }

  private drawWires(node: CanvasNode) {
    const canvas = this.#canvas!
    const parts = this.#parts!
    const nodes = canvas.nodes ?? []
    const name = (key: string) => {
      const { node: id, side, port } = parsePort(key)
      const other = nodes.find((n) => n.id === id)
      const list = side === "in" ? other?.inputs : other?.outputs
      return `${other?.title ?? id} · ${list?.find((p) => p.id === port)?.label ?? port}`
    }
    const wires = (canvas.edges ?? []).filter((e) => parsePort(e.from).node === node.id || parsePort(e.to).node === node.id)
    // A removed wire's button goes; focus moves to the next one, or back to the node.
    const disconnect = (index: number) => {
      const wire = wires[index]!
      const next = wires[index + 1] ?? wires[index - 1]
      canvas.api?.disconnect(wire.id)
      returnFocus(() => (next ? (parts.wires.querySelector<HTMLElement>(`[data-canvas-wire="${CSS.escape(next.id)}"]`) ?? undefined) : canvas.api?.nodeElement(node.id)))
    }
    parts.wires.replaceChildren(
      h("h4", { class: "canvas-inspector-heading" }, "Wires"),
      wires.length
        ? h(
            "ul",
            { class: "canvas-inspector-wires" },
            ...wires.map((wire, index) =>
              h(
                "li",
                null,
                h("span", null, `${name(wire.from)} → ${name(wire.to)}`),
                h("ui-button", null, h("button", { type: "button", "data-variant": "ghost", "data-canvas-wire": wire.id, "aria-label": `Disconnect ${name(wire.from)} from ${name(wire.to)}`, onclick: () => disconnect(index) }, "Disconnect")),
              ),
            ),
          )
        : h("p", { class: "canvas-inspector-empty" }, "No wires yet. Focus the node and press C to start one."),
    )
  }
}

/* ------------------------------------------------------------------ define */

function defineCanvas() {
  createParts(canvasPrimitive, {
    root: {
      tag: "uiset-canvas",
      properties: ["createNode", "renderNode"],
      kinds: { openable: "boolean" },
      api: ["fitView", "zoomIn", "zoomOut", "resetZoom", "selectedNodes", "removeSelected", "addNode", "focusNode", "disconnect", "nodeElement", "moveNode", "connect", "select", "openNode", "centerOn", "view"],
      options: (el) => {
        const c = el as CanvasElement
        const view = viewOf(c)
        const nodes = c.nodes ?? []
        const byId = new Map(nodes.map((n) => [n.id, n]))
        return {
          nodes,
          positions: positionsOf(nodes),
          onPositionsChange: (next: Record<string, Point>, details: { reason: string }) => view.applyPositions(next, details),
          edges: c.edges ?? [],
          onEdgesChange: (next: CanvasEdge[], details: { reason: string }) => view.setEdges(next, details.reason),
          onRemove: (ids: string[]) => view.remove(ids),
          onAdd: c.createNode ? (kind: string, at: Point, title?: string) => view.add(kind, at, title) : undefined,
          locked: c.locked ? (id: string) => !!byId.get(id) && c.locked!(byId.get(id)!) : undefined,
          // Without `openable`, Enter and double-clicks don't open nodes, and agents are told.
          ...(isOn(el, "openable") ? {} : { onOpen: undefined }),
          // With `history`, Control+Z and Control+Shift+Z undo and redo on the canvas itself.
          ...(isOn(el, "history") ? { onUndo: () => view.undo(), onRedo: () => view.redo() } : {}),
        }
      },
      render: holdRender((el, instance) => viewOf(el as CanvasElement).attach(instance as unknown as CanvasInstance)),
    },
    grid: "uiset-canvas-grid",
    world: "uiset-canvas-world",
    zoom: { tag: "uiset-canvas-zoom", target: wrappedButton, display: "contents" },
    nodes: "uiset-canvas-nodes",
    node: "uiset-canvas-node",
    port: "uiset-canvas-port",
    lasso: "uiset-canvas-lasso",
  })
  // Undo, redo and edits from code, like the inspector's Rename.
  const Canvas = customElements.get("uiset-canvas")!
  Object.defineProperties(Canvas.prototype, {
    undo: { value(this: CanvasElement) { return viewOf(this).undo() } },
    redo: { value(this: CanvasElement) { return viewOf(this).redo() } },
    canUndo: { get(this: CanvasElement) { return viewOf(this).canUndo } },
    canRedo: { get(this: CanvasElement) { return viewOf(this).canRedo } },
    updateNode: { value(this: CanvasElement, id: string, patch: Partial<CanvasNode>) { return viewOf(this).update(id, patch) } },
  })
  defineElement("uiset-canvas-toolbar", UISetCanvasToolbar)
  defineElement("uiset-canvas-inspector", UISetCanvasInspector)
}

export { defineCanvas }
export type { CanvasApi, CanvasChange, CanvasEdge, CanvasElement, CanvasNode, CanvasNodeKind, UISetCanvasEvents }
export { UISetCanvasToolbar, UISetCanvasInspector }
