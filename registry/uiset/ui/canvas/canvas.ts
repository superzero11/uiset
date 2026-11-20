import {
  announce,
  createChange,
  createConnect,
  createController,
  createFocusRecovery,
  createLasso,
  createMove,
  createRovingFocus,
  createSelection,
  createViewport,
  css,
  definePrimitive,
  isFocusFromKeyboard,
  keepFocus,
  live,
  matchesShortcut,
  selects,
  spatialMove,
  type ChangeDetails,
  type ConnectDraft,
  type LassoDraft,
  type MoveDraft,
  type MovePoint,
  type Viewport,
} from "@ui-sdk/core"
import {
  boundsOf,
  nodeRect,
  parsePort,
  portKey,
  portPoint,
  wireMiddle,
  wirePath,
  type CanvasNodeShape,
  type Point,
} from "./geometry"

/** The zoom a graph too big to show whole opens at: node titles stay about 10px. */
const READABLE_ZOOM = 0.8
/** The least zoom a whole graph is shown at on opening. Above it, all of the graph beats
 *  larger text with a node past the edge. */
const WHOLE_ZOOM = 0.6

// A node editor's behavior, composed from UI SDK: createViewport pans and zooms,
// createMove drags nodes (Alt with arrows by keyboard), createSelection and createLasso
// choose them, spatialMove sends focus to the nearest node in an arrow's direction, and
// createConnect draws wires between ports, by pointer or with C then arrows.

type CanvasEdge = { id: string; from: string; to: string }
type CanvasPositions = Record<string, MovePoint>
type CanvasNodeKind = { id: string; label: string }

/** What code outside the canvas can do: a toolbar, an inspector, or your own buttons. */
type CanvasControllerApi = {
  fitView(): boolean
  /** Frames every node on first show if they fit at 60% or more, else opens at 80%. */
  fitOnOpen(): boolean
  zoomIn(): boolean
  zoomOut(): boolean
  resetZoom(): boolean
  /** The selected nodes' ids. */
  selectedNodes(): string[]
  /** Asks to remove the selected nodes (through `onRemove`), and moves focus to what's left. */
  removeSelected(): boolean
  /** Adds a node of a kind, in view, through `onAdd`; returns its id. */
  addNode(kind: string, title?: string): string | true
  /** Focuses a node, bringing it into view. */
  focusNode(id: string): void
  /** Removes one wire. */
  disconnect(edge: string): boolean
  /** A node's element, if it's on the canvas. */
  nodeElement(id: string): HTMLElement | undefined
}

/** Connects a toolbar, an inspector or your code to a canvas. Create it once and pass it to both. */
const createCanvasController = () => createController<CanvasControllerApi>()
type CanvasController = ReturnType<typeof createCanvasController>

type CanvasOptions = {
  /** Each node's title and ports. Positions live in `positions`. */
  nodes: CanvasNodeShape[]
  positions?: CanvasPositions
  defaultPositions?: CanvasPositions
  onPositionsChange?: (positions: CanvasPositions, details: ChangeDetails<string>) => void
  edges?: CanvasEdge[]
  defaultEdges?: CanvasEdge[]
  onEdgesChange?: (edges: CanvasEdge[], details: ChangeDetails<string>) => void
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (selected: string[], details: ChangeDetails<string>) => void
  viewport?: Viewport
  defaultViewport?: Viewport
  onViewportChange?: (viewport: Viewport, details: ChangeDetails<string>) => void
  /** The grid nodes snap to, in canvas units, and how far Alt with an arrow nudges. */
  grid?: number
  minZoom?: number
  maxZoom?: number
  /** Whether a wire may join these ports, on top of output-to-input between two nodes. */
  canConnect?: (from: string, to: string) => boolean
  /** Nodes that can't be moved. */
  locked?: (id: string) => boolean
  /** Enter or a double-click on a node. */
  onOpen?: (id: string) => void
  /** Removes nodes; without it, Delete does nothing. The wires on them go too. */
  onRemove?: (ids: string[]) => void
  /** Adds a node of a kind at a point; returns its id. Without it, agents can't add nodes. */
  onAdd?: (kind: string, at: Point, title?: string) => string | void
  /** The kinds of node there are, for agents. */
  kinds?: CanvasNodeKind[]
  onUndo?: () => void
  onRedo?: () => void
  controller?: CanvasController
}

const edgeId = (from: string, to: string) => `${from}->${to}`

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const canvasPrimitive = definePrimitive({
  name: "canvas",
  options: {
    nodes: "value",
    positions: "value",
    defaultPositions: "value",
    onPositionsChange: "callback",
    edges: "value",
    defaultEdges: "value",
    onEdgesChange: "callback",
    selected: "value",
    defaultSelected: "value",
    onSelectedChange: "callback",
    viewport: "value",
    defaultViewport: "value",
    onViewportChange: "callback",
    grid: "number",
    minZoom: "number",
    maxZoom: "number",
    canConnect: "value",
    locked: "value",
    onOpen: "callback",
    onRemove: "callback",
    onAdd: "action",
    kinds: "value",
    onUndo: "callback",
    onRedo: "callback",
    controller: "value",
  },
  controlled: ["positions", "edges", "selected", "viewport"],
  live: ["viewport", "moving", "lasso", "connecting"],
  state: (options: CanvasOptions) => ({
    positions: options.positions ?? options.defaultPositions ?? ({} as CanvasPositions),
    edges: options.edges ?? options.defaultEdges ?? ([] as CanvasEdge[]),
    selected: options.selected ?? options.defaultSelected ?? ([] as string[]),
    viewport: options.viewport ?? options.defaultViewport ?? { x: 0, y: 0, zoom: 1 },
    moving: null as MoveDraft | null,
    lasso: null as LassoDraft | null,
    connecting: null as ConnectDraft | null,
    focused: null as string | null,
  }),
  sync: (options) => ({
    ...(options.positions === undefined ? {} : { positions: options.positions }),
    ...(options.edges === undefined ? {} : { edges: options.edges }),
    ...(options.selected === undefined ? {} : { selected: options.selected }),
    ...(options.viewport === undefined ? {} : { viewport: options.viewport }),
  }),
  api: (context) => {
    const opts = () => context.options()
    const change = createChange(context)
    const get = () => context.store.get()
    const nodeOf = (id: string) => opts().nodes.find((n) => n.id === id)
    const title = (id: string) => nodeOf(id)?.title ?? id
    const portLabel = (key: string) => {
      const { node, side, port } = parsePort(key)
      const spec = nodeOf(node)
      const list = side === "in" ? spec?.inputs : spec?.outputs
      return `${title(node)} ${list?.find((p) => p.id === port)?.label ?? port}`
    }

    const viewport = createViewport(context, {
      key: "viewport",
      surface: () => context.element("root") ?? null,
      set: (value, details) => change("viewport", value, details),
      minZoom: () => opts().minZoom ?? 0.25,
      maxZoom: () => opts().maxZoom ?? 2,
    })

    const selection = createSelection(context, {
      key: "selected",
      set: (value, details) => change("selected", value, details),
      order: () => opts().nodes.map((n) => n.id),
      multiple: () => true,
    })

    const move = createMove(context, {
      key: "positions",
      draft: "moving",
      set: (value, details) => change("positions", value, details),
      step: () => opts().grid ?? 8,
      scale: () => get().viewport.zoom,
      group: (key) => (get().selected.includes(key) ? get().selected : [key]),
      disabled: (key) => opts().locked?.(key) ?? false,
      label: title,
    })

    const lasso = createLasso(context, {
      slot: "node",
      draft: "lasso",
      selected: () => get().selected,
      set: (keys, details) => change("selected", keys, details),
      message: (count) => `${count} ${count === 1 ? "node" : "nodes"} selected`,
    })

    const roving = createRovingFocus(context, { slot: "node", key: "focused", move: spatialMove() })

    // A node that goes (an undo, an agent, new props) leaves the selection too, after the
    // render that removed it, so the toolbar never offers to remove a node that's gone.
    const exists = (id: string) => opts().nodes.some((n) => n.id === id)
    context.onOptions(() => {
      for (const [id, at] of Object.entries(get().positions)) lastSeen.set(id, at)
      queueMicrotask(() => {
        const selected = get().selected
        if (selected.some((id) => !exists(id)))
          change("selected", selected.filter(exists), { reason: "imperative" })
      })
    })

    // A focused node that goes, however it went (an undo, an agent), hands focus to the node
    // now nearest where it was, or to the canvas.
    const lastSeen = new Map<string, Point>()
    const recovery = createFocusRecovery<{ value: string }>({
      fallback: (lost) => {
        const was = lastSeen.get(lost.key)
        const items = roving.items()
        if (!was || !items.length) return items[0]?.el ?? context.element("root") ?? undefined
        const distance = (key: string) => {
          const at = get().positions[key]
          return at ? (at.x - was.x) ** 2 + (at.y - was.y) ** 2 : Infinity
        }
        return [...items].sort((a, b) => distance(a.key) - distance(b.key))[0]!.el
      },
    })

    const canJoin = (from: string, to: string) => {
      const a = parsePort(from)
      const b = parsePort(to)
      if (a.side !== "out" || b.side !== "in" || a.node === b.node) return false
      if (get().edges.some((e) => e.from === from && e.to === to)) return false
      return opts().canConnect?.(from, to) ?? true
    }
    // An input takes one wire: a new one replaces it.
    const join = (from: string, to: string, details: { reason: string; event?: Event }) =>
      change(
        "edges",
        [...get().edges.filter((e) => e.to !== to), { id: edgeId(from, to), from, to }],
        details,
      )

    const wiring = createConnect(context, {
      slot: "port",
      draft: "connecting",
      canConnect: canJoin,
      point: (x, y) => viewport.toCanvas(x, y),
      connect: (from, to, details) => join(from, to, details),
      label: portLabel,
    })

    /** A node's place as drawn: its position, plus a drag under way. */
    const placeOf = (state: ReturnType<typeof get>, id: string): Point | undefined => {
      const at = state.positions[id]
      if (!at) return undefined
      const draft = state.moving
      return draft?.keys.includes(id) ? { x: at.x + draft.dx, y: at.y + draft.dy } : at
    }
    const portAt = (state: ReturnType<typeof get>, key: string) => {
      const { node, side, port } = parsePort(key)
      const spec = nodeOf(node)
      const at = placeOf(state, node)
      return spec && at ? portPoint(spec, at, side, port) : undefined
    }
    const ends = (state: ReturnType<typeof get>, id: string) => {
      const edge = state.edges.find((e) => e.id === id)
      const from = edge && portAt(state, edge.from)
      const to = edge && portAt(state, edge.to)
      return from && to ? { from, to } : undefined
    }

    const rects = () =>
      opts()
        .nodes.map((n) => (get().positions[n.id] ? nodeRect(n, get().positions[n.id]!) : undefined))
        .filter((r) => r !== undefined)
    const fitView = () => {
      const all = boundsOf(rects())
      return all ? viewport.fit(all, { padding: 48, maxZoom: 1 }, { reason: "imperative" }) : false
    }
    /**
     * The first view: every node if that keeps text legible (60% or more), else a readable
     * zoom that starts where the graph does (the minimap and Zoom to fit show the rest).
     * Fitting a workflow into a phone once opened it at 25%, with 12px titles drawn at 3px;
     * then opening no smaller than 80% left Reply past the edge on a desktop.
     */
    const fitOnOpen = () => {
      const all = boundsOf(rects())
      const el = context.element("root")
      if (!all || !el) return false
      fitView()
      if (get().viewport.zoom >= WHOLE_ZOOM) return true
      const zoom = READABLE_ZOOM
      const tall = (all.bottom - all.top) * zoom + 96
      const y = tall <= el.clientHeight ? (el.clientHeight - (all.bottom - all.top) * zoom) / 2 - all.top * zoom : 48 - all.top * zoom
      return viewport.setViewport({ x: 48 - all.left * zoom, y, zoom }, { reason: "imperative" })
    }

    const nodeElement = (id: string) => context.element("node", id) ?? undefined
    // After nodes go, focus the one nearest where they were; else the canvas itself.
    const nearestTo = (ids: string[]) => {
      const gone = new Set(ids)
      const from = boundsOf(
        ids.map((id) => (nodeOf(id) && get().positions[id] ? nodeRect(nodeOf(id)!, get().positions[id]!) : undefined)).filter((r) => r !== undefined),
      )
      const centerX = from ? (from.left + from.right) / 2 : 0
      const centerY = from ? (from.top + from.bottom) / 2 : 0
      let best: string | undefined
      let distance = Infinity
      for (const node of opts().nodes) {
        const at = get().positions[node.id]
        if (gone.has(node.id) || !at) continue
        const d = (at.x - centerX) ** 2 + (at.y - centerY) ** 2
        if (d < distance) [best, distance] = [node.id, d]
      }
      return best
    }
    const remove = (wanted: string[]) => {
      const onRemove = opts().onRemove
      const ids = wanted.filter(exists)
      if (!onRemove || !ids.length) return false
      const next = nearestTo(ids)
      onRemove(ids)
      change("selected", get().selected.filter((id) => !ids.includes(id)), { reason: "imperative" })
      announce(`Removed ${ids.length === 1 ? title(ids[0]!) : `${ids.length} nodes`}.`)
      keepFocus(() => (next && nodeElement(next)) || (context.element("root") ?? undefined))
      return true
    }

    const findNode = (name: string) => {
      const byId = opts().nodes.find((n) => n.id === name)
      if (byId) return byId
      const matches = opts().nodes.filter((n) => n.title.toLowerCase() === String(name).toLowerCase())
      if (!matches.length) throw new Error(`No node "${name}". Nodes: ${opts().nodes.map((n) => n.title).join(", ")}.`)
      if (matches.length > 1)
        throw new Error(`"${name}" names ${matches.length} nodes (ids ${matches.map((n) => n.id).join(", ")}). Give the id.`)
      return matches[0]!
    }
    const findPort = (node: CanvasNodeShape, side: "in" | "out", name?: string) => {
      const list = (side === "in" ? node.inputs : node.outputs) ?? []
      if (!list.length) throw new Error(`${node.title} has no ${side === "in" ? "inputs" : "outputs"}.`)
      if (name === undefined) return list[0]!
      const port = list.find((p) => p.id === name || p.label.toLowerCase() === String(name).toLowerCase())
      if (!port)
        throw new Error(`${node.title} has no ${side === "in" ? "input" : "output"} "${name}". It has: ${list.map((p) => p.label).join(", ")}.`)
      return port
    }

    /** What a node is joined to, in words, for its description and for agents. */
    const wiresOf = (id: string) => {
      const into = get()
        .edges.filter((e) => parsePort(e.to).node === id)
        .map((e) => `${portLabel(e.to).slice(title(id).length + 1)} from ${portLabel(e.from)}`)
      const out = get()
        .edges.filter((e) => parsePort(e.from).node === id)
        .map((e) => `${portLabel(e.from).slice(title(id).length + 1)} to ${portLabel(e.to)}`)
      return [into.length ? `Inputs: ${into.join("; ")}.` : "", out.length ? `Outputs: ${out.join("; ")}.` : ""]
        .filter(Boolean)
        .join(" ")
    }

    // C starts a wire from the node's first output; C again tries its next one.
    const startWire = (id: string) => {
      const outs = nodeOf(id)?.outputs ?? []
      if (!outs.length) {
        announce(`${title(id)} has no outputs to connect.`)
        return
      }
      const current = get().connecting?.from
      const index = current ? outs.findIndex((p) => portKey(id, "out", p.id) === current) : -1
      if (current) wiring.cancel()
      wiring.start(portKey(id, "out", outs[(index + 1) % outs.length]!.id))
    }

    const zoomStep = 1.25

    return {
      viewport,
      selection,
      move,
      lasso,
      wiring,
      roving,
      recovery,
      placeOf,
      portAt,
      title,
      wiresOf,
      startWire,
      nodeElement,
      remove,
      /** A wire's path as drawn, following a drag under way. */
      wire: (state: ReturnType<typeof get>, id: string) => {
        const at = ends(state, id)
        return at ? wirePath(at.from, at.to) : ""
      },
      /** Where a wire's remove button sits. */
      wireMiddle: (state: ReturnType<typeof get>, id: string) => {
        const at = ends(state, id)
        return at ? wireMiddle(at.from, at.to) : undefined
      },
      /** The wire being drawn, from its port to the pointer or the chosen port. */
      draftWire: (state: ReturnType<typeof get>) => {
        const draft = state.connecting
        if (!draft) return ""
        const from = portAt(state, draft.from)
        const to = draft.to ? portAt(state, draft.to) : { x: draft.x, y: draft.y }
        return from && to ? wirePath(from, to) : ""
      },
      open: (id: string) => opts().onOpen?.(id),
      fitView,
      fitOnOpen,
      zoomIn: () => viewport.zoomBy(zoomStep, undefined, { reason: "imperative" }),
      zoomOut: () => viewport.zoomBy(1 / zoomStep, undefined, { reason: "imperative" }),
      resetZoom: () => viewport.zoomTo(1, undefined, { reason: "imperative" }),
      selectedNodes: () => get().selected.filter(exists),
      clearSelection: (reason: "escape-key" | "outside-press" | "imperative", event?: Event) =>
        change("selected", [], { reason, event }),
      removeSelected: () => remove(get().selected),
      focusNode: (id: string) => {
        roving.focus(id)
        const el = nodeElement(id)
        if (el) viewport.reveal(viewport.rectOf(el), { padding: 32 }, { reason: "imperative" })
      },
      /** Pans so a canvas point sits in the middle of the frame, keeping the zoom. */
      centerOn: (point: Point) => {
        const el = context.element("root")
        if (!el) return false
        const { zoom } = get().viewport
        return viewport.setViewport(
          { x: el.clientWidth / 2 - point.x * zoom, y: el.clientHeight / 2 - point.y * zoom, zoom },
          { reason: "imperative" },
        )
      },
      /** The minimap's frame: every node and the view, with room around them. */
      overview: () => {
        const view = viewport.visible()
        const all = boundsOf([...rects(), view])!
        const pad = Math.max(all.right - all.left, all.bottom - all.top) * 0.05
        return `${all.left - pad} ${all.top - pad} ${all.right - all.left + pad * 2} ${all.bottom - all.top + pad * 2}`
      },
      view: () => viewport.visible(),
      /** The port a keyboard wire started from, if one is under way. */
      keyboardWire: () => (get().connecting?.keyboard ? get().connecting!.from : undefined),
      undo: () => opts().onUndo?.(),
      redo: () => opts().onRedo?.(),

      // For agents and controllers, by the names people see.
      /** Adds a node of a kind (by its id or label), in view unless x and y are given. */
      addNode(kind: string, nodeTitle?: string, x?: number, y?: number): string {
        const add = opts().onAdd
        if (!add) throw new Error("This canvas doesn't add nodes.")
        const kinds = opts().kinds
        const found = kinds?.find((k) => k.id === kind || k.label.toLowerCase() === String(kind).toLowerCase())
        if (kinds && !found) throw new Error(`No kind "${kind}". Kinds: ${kinds.map((k) => k.label).join(", ")}.`)
        if ((x === undefined) !== (y === undefined)) throw new Error("Give both x and y, or neither to place it in view.")
        const view = viewport.visible()
        let at =
          x !== undefined && y !== undefined
            ? { x: Number(x), y: Number(y) }
            : { x: Math.round((view.left + view.right) / 2 - 104), y: Math.round((view.top + view.bottom) / 2 - 40) }
        if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) throw new Error("Give x and y as numbers.")
        // Several placed in view step down and across, so none hides another.
        if (x === undefined)
          while (Object.values(get().positions).some((p) => Math.abs(p.x - at.x) < 8 && Math.abs(p.y - at.y) < 8))
            at = { x: at.x + 24, y: at.y + 24 }
        const id = add(found?.id ?? kind, at, nodeTitle)
        if (typeof id !== "string") throw new Error("The canvas didn't add that node.")
        announce(`Added ${nodeTitle ?? found?.label ?? kind}.`)
        return id
      },
      /** Moves a node to a point, in canvas units. */
      moveNode(node: string, x: number, y: number) {
        const found = findNode(node)
        if (opts().locked?.(found.id)) throw new Error(`${found.title} is locked.`)
        if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) throw new Error("Give x and y as numbers.")
        return move.moveTo(found.id, { x: Number(x), y: Number(y) }, { reason: "imperative" })
      },
      /** Wires one node's output to another's input, by titles and, if they have several, port names. */
      connect(fromNode: string, toNode: string, fromPort?: string, toPort?: string) {
        const a = findNode(fromNode)
        const b = findNode(toNode)
        const from = portKey(a.id, "out", findPort(a, "out", fromPort).id)
        const to = portKey(b.id, "in", findPort(b, "in", toPort).id)
        if (!canJoin(from, to))
          throw new Error(`${portLabel(from)} can't connect to ${portLabel(to)}: it's the same node, already wired, or not allowed.`)
        return join(from, to, { reason: "imperative" })
      },
      /** Removes the wire between two nodes (or the one wire id). */
      disconnect(fromNodeOrEdge: string, toNode?: string) {
        const edges = get().edges
        const found =
          toNode === undefined
            ? edges.filter((e) => e.id === fromNodeOrEdge)
            : edges.filter(
                (e) => parsePort(e.from).node === findNode(fromNodeOrEdge).id && parsePort(e.to).node === findNode(toNode).id,
              )
        if (!found.length) throw new Error(`No wire from ${fromNodeOrEdge}${toNode ? ` to ${toNode}` : ""}.`)
        const gone = new Set(found.map((e) => e.id))
        change("edges", edges.filter((e) => !gone.has(e.id)), { reason: "imperative" })
        announce(`Disconnected ${found.map((e) => `${portLabel(e.from)} from ${portLabel(e.to)}`).join(", ")}.`)
        return true
      },
      /** Selects nodes by title or id, replacing the selection. */
      select(...nodes: string[]) {
        const ids = [...new Set(nodes.map((n) => findNode(n).id))]
        return change("selected", ids, { reason: "imperative" })
      },
      openNode(node: string) {
        const open = opts().onOpen
        if (!open) throw new Error("This canvas doesn't open nodes.")
        open(findNode(node).id)
        return true
      },
      /** Every node for agents: id, then title, place and wires. */
      items: () =>
        opts().nodes.map((n) => {
          const at = get().positions[n.id]
          const wires = wiresOf(n.id)
          return {
            value: n.id,
            label: `${n.title} (at ${Math.round(at?.x ?? 0)}, ${Math.round(at?.y ?? 0)}${wires ? `; ${wires}` : ""})`,
          }
        }),
    }
  },
  slots: (slot) => ({
    // The frame: it clips, takes the gestures, and holds zoom keys for the whole canvas.
    root: slot({
      role: "group",
      // Pans and zooms are live: nothing here reads them, so they render nothing.
      selects: selects({ selected: () => [], focused: () => [] }),
      attrs: (state) => ({
        "aria-roledescription": "canvas",
        // With no nodes to land on, the frame itself is the tab stop.
        tabindex: Object.keys(state.positions).length ? "-1" : "0",
        style: css({ position: "relative", overflow: "clip", "touch-action": "none", "user-select": "none" }),
      }),
      on: {
        wheel: (event, { api }) => api.viewport.wheel(event as WheelEvent),
        pointerdown: (event, { el, api }) => {
          const e = event as PointerEvent
          const target = e.target as Element
          // Only empty space: the frame, the grid, the world, or the wire layer.
          // A wire started by keyboard ends when the pointer takes over.
          if (api.wiring.active() && api.keyboardWire()) api.wiring.cancel()
          if (!el || target.closest("[data-canvas-node], [data-canvas-control], [data-canvas-unwire]")) return
          if (e.shiftKey) api.lasso.pointerdown(e, el)
          else {
            if (api.selectedNodes().length) api.clearSelection("outside-press", e)
            api.viewport.pointerdown(e)
          }
        },
        keydown: (event, { api }) => {
          const e = event as KeyboardEvent
          if (e.defaultPrevented) return
          if (matchesShortcut(e, "mod+shift+z") || matchesShortcut(e, "mod+y")) {
            e.preventDefault()
            api.redo()
            return
          }
          if (matchesShortcut(e, "mod+z")) {
            e.preventDefault()
            api.undo()
            return
          }
          api.viewport.keydown(e)
        },
      },
    }),
    // A dot grid that pans and scales with the world, drawn without rendering anything.
    grid: slot({
      attrs: () => ({ "aria-hidden": "true" }),
      live: live((state) => {
        const { x, y, zoom } = state.viewport
        const size = 24 * zoom
        return { style: `background-size:${size}px ${size}px;background-position:${x}px ${y}px` }
      }),
    }),
    // The zoom is also a variable, so rings and edges can keep their size on screen.
    world: slot({
      attrs: () => ({ style: css({ position: "absolute", left: "0", top: "0", "transform-origin": "0 0" }) }),
      live: live((state, { api }) => ({ style: `${api.viewport.style(state)};--canvas-zoom:${state.viewport.zoom}` })),
    }),
    // The zoom readout updates live, so zooming renders no React at all.
    zoom: slot({
      attrs: () => ({ "data-canvas-zoom": "" }),
      live: live((state) => {
        const percent = Math.round(state.viewport.zoom * 100)
        return { "data-zoom": `${percent}%`, "aria-label": `Zoom ${percent}%, reset to 100%` }
      }),
    }),
    nodes: slot({
      role: "listbox",
      keys: { none: "Nodes handle their own keys; the canvas is one tab stop." },
      attrs: () => ({ "aria-multiselectable": "true" }),
    }),
    node: slot<{ value: string }>({
      props: { value: "string" },
      role: "option",
      focus: "roving",
      keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " ", "Enter", "Escape", "Delete", "Backspace", "c"],
      // A press chooses the node on pointerdown, before a drag can start; keys are below.
      press: () => {},
      // Focus and selection reach only the nodes they touch; a move, every node.
      selects: selects({ focused: ({ key }) => [key, null], selected: ({ key }) => [key], edges: () => [] }),
      attrs: (state, part) => {
        const at = state.positions[part.key]
        return {
          tabindex: part.api.roving.tabIndex(state, part),
          "aria-roledescription": "node",
          "aria-selected": String(state.selected.includes(part.key)),
          "data-canvas-node": "",
          style: css({ position: "absolute", left: `${at?.x ?? 0}px`, top: `${at?.y ?? 0}px`, "touch-action": "none" }),
        }
      },
      live: live((state, { api, key }) => ({
        style: api.move.style(state, key),
        "data-dragging": api.move.dragging(state, key) ? "" : undefined,
        "data-lassoed": api.lasso.touches(state, key) ? "" : undefined,
        "data-wiring": state.connecting?.from.startsWith(`${key}:`) ? "" : undefined,
      })),
      on: {
        keydown: (event, { api, key, el }) => {
          const e = event as KeyboardEvent
          // A wire under way takes the keys: arrows choose an input, Enter joins, Escape stops.
          if (api.wiring.active()) {
            if (e.code === "KeyC" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault()
              api.startWire(key)
              return
            }
            // The behavior takes arrows, Enter and Escape, and cancels on Tab without
            // stopping it, so focus moves on.
            api.wiring.keydown(e)
            return
          }
          if (matchesShortcut(e, "mod+a")) {
            e.preventDefault()
            api.selection.toggleAll({ reason: "list-navigation", event: e })
            return
          }
          if (api.move.keydown(e, key)) {
            e.preventDefault()
            return
          }
          const plain = !e.altKey && !e.ctrlKey && !e.metaKey
          // By the key's place, so C works on any keyboard layout.
          if (plain && e.code === "KeyC" && !e.shiftKey) {
            e.preventDefault()
            api.startWire(key)
            return
          }
          if (plain && e.key === " ") {
            e.preventDefault()
            api.selection.toggle(key, { reason: "item-press", event: e })
            return
          }
          if (plain && e.key === "Enter") {
            e.preventDefault()
            api.open(key)
            return
          }
          if (plain && (e.key === "Delete" || e.key === "Backspace")) {
            e.preventDefault()
            const selected = api.selectedNodes()
            api.remove(selected.includes(key) ? selected : [key])
            return
          }
          if (plain && e.key === "Escape" && api.selectedNodes().length) {
            e.preventDefault()
            api.clearSelection("escape-key", e)
            return
          }
          if (el && !e.altKey) api.roving.keydown(e, el)
        },
        pointerdown: (event, { api, key, el }) => {
          const e = event as PointerEvent
          if ((e.target as Element).closest("[data-canvas-port]")) return
          // Choose on press, so a drag moves what's chosen; keep a selection the node is in.
          if (e.shiftKey || e.metaKey || e.ctrlKey) api.selection.toggle(key, { reason: "item-press", event: e })
          else if (!api.selection.isSelected(key)) api.selection.choose(key, { reason: "item-press", event: e })
          if (el) api.move.pointerdown(e, key, el)
        },
        dblclick: (_event, { api, key }) => api.open(key),
        // Keyboard focus brings a node into view; a press leaves the view where it is, so a
        // drag starts under the pointer.
        focus: (_event, { el, api }) => {
          if (el && isFocusFromKeyboard()) api.viewport.reveal(api.viewport.rectOf(el), { padding: 32 }, { reason: "focus-in" })
        },
        // A keyboard wire belongs to the node it started on.
        blur: (event, { api, key, el }) => {
          const next = (event as FocusEvent).relatedTarget as Node | null
          if (api.wiring.active() && api.keyboardWire()?.startsWith(`${key}:`) && !(next && el?.contains(next)))
            api.wiring.cancel()
        },
      },
      bind: (el, part) => {
        const cleanups = [part.api.roving.bind(el, part), part.api.recovery.bind(el, part)]
        return () => cleanups.forEach((cleanup) => cleanup())
      },
    }),
    // Ports are pointer targets; keyboard wiring goes through the node (C, arrows, Enter).
    port: slot<{ value: string }>({
      props: { value: "string" },
      selects: selects({ selected: () => [], focused: () => [] }),
      attrs: (_state, { key }) => ({ "aria-hidden": "true", "data-canvas-port": parsePort(key).side }),
      live: live((state, { api, key }) => ({ "data-connect": api.wiring.role(state, key) })),
      on: {
        pointerdown: (event, { el, api, key }) => {
          if (el && parsePort(key).side === "out") {
            event.stopPropagation()
            api.wiring.pointerdown(event as PointerEvent, key, el)
          }
        },
      },
    }),
    wire: slot<{ value: string }>({
      props: { value: "string" },
      selects: selects({ selected: () => [], focused: () => [] }),
      live: live((state, { api, key }) => ({ d: api.wire(state, key) })),
    }),
    unwire: slot<{ value: string }>({
      props: { value: "string" },
      selects: selects({ selected: () => [], focused: () => [] }),
      attrs: () => ({ "data-canvas-unwire": "" }),
      live: live((state, { api, key }) => {
        const at = api.wireMiddle(state, key)
        return { transform: at ? `translate(${at.x} ${at.y})` : "translate(-9999 -9999)" }
      }),
      on: {
        pointerdown: (event) => event.stopPropagation(),
        click: (_event, { api, key }) => api.disconnect(key),
      },
    }),
    draft: slot({
      live: live((state, { api }) => ({ d: api.draftWire(state) })),
    }),
    lasso: slot({
      attrs: () => ({ "aria-hidden": "true" }),
      live: live((state, { api }) => ({ style: api.lasso.style(state) })),
    }),
    // The minimap follows pans and zooms live: its frame and the box that is in view.
    minimap: slot({
      live: live((state, { api }) => {
        void state.viewport
        return { viewBox: api.overview() }
      }),
    }),
    viewbox: slot({
      live: live((state, { api }) => {
        void state.viewport
        const view = api.view()
        return {
          x: String(view.left),
          y: String(view.top),
          width: String(Math.max(0, view.right - view.left)),
          height: String(Math.max(0, view.bottom - view.top)),
        }
      }),
    }),
  }),
  agent: {
    actions: ["addNode", "moveNode", "connect", "disconnect", "select", "openNode", "fitView"],
    items: (api) => api.items(),
  },
})

export { canvasPrimitive, createCanvasController, edgeId }
export type { CanvasController, CanvasControllerApi, CanvasEdge, CanvasNodeKind, CanvasOptions, CanvasPositions }
