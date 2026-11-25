import type { JSX } from "@solidjs/web"
import { ariaKeyshortcuts, createUndoStack, keepFocus, type Viewport } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import { createMemo, createSignal, createUniqueId, flush, For, omit, onSettled, Show, untrack } from "solid-js"
import { Button } from "./button"
import { Field, FieldLabel, Input } from "./field"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./menu"
import { Icon } from "./shell/icons"
import { Toolbar, ToolbarButton, ToolbarSeparator } from "./toolbar"
import { canvasPrimitive, createCanvasController, type CanvasController, type CanvasEdge, type CanvasNodeKind } from "../../registry/uiset/ui/canvas/canvas"
import { boundsOf, describeWires, nodeRect, parsePort, portKey, type CanvasNodeShape, type CanvasPort, type Point } from "../../registry/uiset/ui/canvas/geometry"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/chart/tokens.css"
import "../../registry/uiset/ui/canvas/canvas.css"

// The canvas in Solid, as React's: panning, zooming, moving, selecting, wiring, keys and agents
// are the shared primitive (canvas/canvas.ts) and its geometry. This file holds the nodes, the
// wires, the minimap, the toolbar, the inspector and the history.

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

type CanvasProps = {
  /** The canvas's name, for people and agents. */
  label: string
  nodes?: CanvasNode[]
  defaultNodes?: CanvasNode[]
  onNodesChange?: (nodes: CanvasNode[], details: CanvasChange) => void
  edges?: CanvasEdge[]
  defaultEdges?: CanvasEdge[]
  onEdgesChange?: (edges: CanvasEdge[], details: { reason: string }) => void
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (selected: string[]) => void
  defaultViewport?: Viewport
  /** Frames every node when the canvas first shows, instead of `defaultViewport`. */
  fitView?: boolean
  /** The kinds of node there are, for the Add menu and agents. */
  kinds?: CanvasNodeKind[]
  /** Makes the node "Add" or an agent asks for; return null to refuse. */
  onAddNode?: (kind: string, at: Point, title?: string) => CanvasNode | null
  /** Enter or a double-click on a node. */
  onNodeOpen?: (node: CanvasNode) => void
  /** Whether a wire may join these ports ("node:out:port" to "node:in:port"). */
  canConnect?: (from: string, to: string) => boolean
  locked?: (node: CanvasNode) => boolean
  /** What a node shows under its ports. */
  renderNode?: (node: CanvasNode) => JSX.Element
  /** Snapping grid and Alt+arrow step, in canvas units. */
  grid?: number
  /** The zoom buttons in the corner. */
  controls?: boolean
  minimap?: boolean
  onUndo?: () => void
  onRedo?: () => void
  /** Lets a toolbar, an inspector or your code drive the canvas: `createCanvasController()`. */
  controller?: CanvasController
  class?: string
}

const series = (color?: number) => `var(--chart-${Math.min(8, Math.max(1, Math.round(color ?? 1)))})`

function NodesPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "nodes", undefined, props, "div")
}
function NodePart(props: { value: string } & PartProps<"div">) {
  return usePart(canvasPrimitive, "node", () => ({ value: props.value }), omit(props, "value") as PartProps<"div">, "div")
}
function PortPart(props: { value: string } & PartProps<"span">) {
  return usePart(canvasPrimitive, "port", () => ({ value: props.value }), omit(props, "value") as PartProps<"span">, "span")
}
function WirePart(props: { value: string } & PartProps<"path">) {
  return usePart(canvasPrimitive, "wire", () => ({ value: props.value }), omit(props, "value") as PartProps<"path">, "path")
}
function UnwirePart(props: { value: string } & PartProps<"g">) {
  return usePart(canvasPrimitive, "unwire", () => ({ value: props.value }), omit(props, "value") as PartProps<"g">, "g")
}
function DraftPart(props: PartProps<"path">) {
  return usePart(canvasPrimitive, "draft", undefined, props, "path")
}
function GridPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "grid", undefined, props, "div")
}
function WorldPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "world", undefined, props, "div")
}
function ZoomPart(props: PartProps<"button">) {
  return usePart(canvasPrimitive, "zoom", undefined, props, "button")
}
function LassoPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "lasso", undefined, props, "div")
}

function PortRow(props: { node: CanvasNode; index: number }) {
  const input = (): CanvasPort | undefined => props.node.inputs?.[props.index]
  const output = (): CanvasPort | undefined => props.node.outputs?.[props.index]
  return (
    <span class="canvas-node-row">
      <span class="canvas-node-in">
        <Show when={input()}>{(port) => <PortPart value={portKey(props.node.id, "in", port().id)} class="canvas-port" />}</Show>
        <span class="canvas-port-label">{input()?.label}</span>
      </span>
      <span class="canvas-node-out">
        <span class="canvas-port-label">{output()?.label}</span>
        <Show when={output()}>{(port) => <PortPart value={portKey(props.node.id, "out", port().id)} class="canvas-port" />}</Show>
      </span>
    </span>
  )
}

/**
 * A node editor. Drag empty space to pan, scroll or pinch to zoom, Shift-drag to select a
 * box of nodes. Tab reaches the nodes once; arrows go to the nearest node that way, Alt
 * with arrows moves it, Space selects, C starts a wire, Delete removes, Enter opens.
 */
function Canvas(props: CanvasProps) {
  const helpId = createUniqueId()
  const [ownNodes, setOwnNodes] = createSignal<CanvasNode[]>(untrack(() => props.defaultNodes ?? []), { ownedWrite: true })
  const [ownEdges, setOwnEdges] = createSignal<CanvasEdge[]>(untrack(() => props.defaultEdges ?? []), { ownedWrite: true })
  const allNodes = () => props.nodes ?? ownNodes()
  const allEdges = () => props.edges ?? ownEdges()
  const setNodes = (next: CanvasNode[], details: CanvasChange) => {
    if (props.nodes === undefined) setOwnNodes(next)
    props.onNodesChange?.(next, details)
  }
  const setEdges = (next: CanvasEdge[], details: { reason: string }) => {
    if (props.edges === undefined) setOwnEdges(next)
    props.onEdgesChange?.(next, details)
  }
  // One object per change of the nodes: the primitive's state follows it.
  const positions = createMemo(() => Object.fromEntries(allNodes().map((n) => [n.id, { x: n.x, y: n.y }])))
  const byId = createMemo(() => new Map(allNodes().map((n) => [n.id, n])))

  const handle = usePrimitive(canvasPrimitive, () => ({
    nodes: allNodes(),
    positions: positions(),
    onPositionsChange: (next: Record<string, Point>, details: { reason: string }) => {
      const nodes = untrack(allNodes)
      setNodes(
        nodes.map((n) => (next[n.id] && (next[n.id]!.x !== n.x || next[n.id]!.y !== n.y) ? { ...n, ...next[n.id]! } : n)),
        { reason: details.reason, type: "move" },
      )
    },
    edges: allEdges(),
    onEdgesChange: (next: CanvasEdge[], details: { reason: string }) => setEdges(next, { reason: details.reason }),
    selected: props.selected,
    defaultSelected: props.defaultSelected,
    onSelectedChange: props.onSelectedChange ? (next: string[]) => props.onSelectedChange?.(next) : undefined,
    defaultViewport: props.defaultViewport,
    grid: props.grid ?? 8,
    kinds: props.kinds,
    canConnect: props.canConnect,
    locked: props.locked
      ? (id: string) => {
          const node = byId().get(id)
          return !!node && !!props.locked?.(node)
        }
      : undefined,
    onOpen: props.onNodeOpen
      ? (id: string) => {
          const node = byId().get(id)
          if (node) props.onNodeOpen?.(node)
        }
      : undefined,
    // A canvas whose nodes nobody can change doesn't remove them.
    onRemove:
      props.nodes === undefined || props.onNodesChange
        ? (ids: string[]) => {
            const gone = new Set(ids)
            setNodes(
              untrack(allNodes).filter((n) => !gone.has(n.id)),
              { reason: "imperative", type: "remove" },
            )
            setEdges(
              untrack(allEdges).filter((e) => !gone.has(parsePort(e.from).node) && !gone.has(parsePort(e.to).node)),
              { reason: "imperative" },
            )
          }
        : undefined,
    onAdd: props.onAddNode
      ? (kind: string, at: Point, title?: string) => {
          const node = props.onAddNode?.(kind, at, title)
          if (!node) return undefined
          setNodes([...untrack(allNodes), node], { reason: "imperative", type: "add" })
          // Drawn before this returns: whoever asked for the node, an agent's next step say,
          // can use it by name at once.
          flush()
          return node.id
        }
      : undefined,
    onUndo: props.onUndo,
    onRedo: props.onRedo,
    controller: props.controller,
  }))

  // Frame the nodes once the frame has a size to fit them in.
  let root: HTMLElement | undefined
  onSettled(() => {
    if (!props.fitView || !root) return
    const fit = () => {
      const view = handle.api.viewport.visible()
      if (view.right - view.left <= 0) return false
      handle.api.fitOnOpen()
      return true
    }
    if (fit() || typeof ResizeObserver !== "function") return
    const observer = new ResizeObserver(() => {
      if (fit()) observer.disconnect()
    })
    observer.observe(root)
    return () => observer.disconnect()
  })

  return usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.label
      },
      "aria-describedby": helpId,
      get class() {
        return ["canvas", props.class].filter(Boolean).join(" ")
      },
      ref: (el: HTMLElement) => {
        root = el
      },
      // A getter, so the children are built once, inside the part: given as a function,
      // they're built again, whole, whenever something at their top changes.
      get children() {
        return (
          <>
            <p id={helpId} hidden>
              Arrow keys go to the nearest node that way. Alt with arrows moves it, Space selects it, C starts a wire (arrows choose an input, Enter connects, Escape
              stops), Delete removes, Enter opens. Plus and minus zoom; 0 resets.
            </p>
            <GridPart class="canvas-grid" />
            <WorldPart class="canvas-world">
              <svg class="canvas-wires" aria-hidden="true" width="1" height="1">
                <For each={allEdges()} keyed={(edge) => edge.id}>
                  {(edge) => <WirePart value={edge().id} class="canvas-wire" />}
                </For>
                <DraftPart class="canvas-wire" data-draft="" />
                <For each={allEdges()} keyed={(edge) => edge.id}>
                  {(edge) => (
                    // Drawn whole as SVG, so its title is SVG's tooltip, not an HTML title.
                    <UnwirePart
                      value={edge().id}
                      class="canvas-unwire"
                      render={(part: JSX.SvgSVGAttributes<SVGGElement>) => (
                        <g {...part}>
                          <title>Disconnect</title>
                          <circle r="9" />
                          <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" />
                        </g>
                      )}
                    />
                  )}
                </For>
              </svg>
              <NodesPart class="canvas-nodes" aria-label={`${props.label} nodes`}>
                <For each={allNodes()} keyed={(node) => node.id}>
                  {(node) => {
                    // Ids from data may hold spaces; these don't.
                    const partId = createUniqueId()
                    const rows = createMemo(() => Array.from({ length: Math.max(node().inputs?.length ?? 0, node().outputs?.length ?? 0) }, (_, i) => i))
                    const wires = createMemo(() => describeWires(node(), allNodes(), allEdges()))
                    const kind = () => props.kinds?.find((k) => k.id === node().kind)?.label
                    const body = createMemo(() => props.renderNode?.(node()))
                    return (
                      <NodePart
                        value={node().id}
                        class="canvas-node"
                        // Named by what it shows, in the order it shows it: title, then kind.
                        aria-labelledby={kind() ? `${partId}-title ${partId}-kind` : `${partId}-title`}
                        aria-describedby={[body() ? `${partId}-body` : "", wires() ? `${partId}-wires` : ""].filter(Boolean).join(" ") || undefined}
                        data-locked={props.locked?.(node()) ? "" : undefined}
                      >
                        <span class="canvas-node-card" style={{ "inline-size": `${node().width ?? 208}px`, "--series": series(node().color) }}>
                          <span class="canvas-node-header">
                            <span id={`${partId}-title`} class="canvas-node-title">
                              {node().title}
                            </span>
                            <Show when={kind()}>
                              <span id={`${partId}-kind`} class="canvas-node-kind">
                                {kind()}
                              </span>
                            </Show>
                          </span>
                          <For each={rows()}>{(index) => <PortRow node={node()} index={index} />}</For>
                          <span class="canvas-node-foot" />
                          <Show when={body()}>
                            <span id={`${partId}-body`} class="canvas-node-body">
                              {body()}
                            </span>
                          </Show>
                        </span>
                        <Show when={wires()}>
                          <span id={`${partId}-wires`} hidden>
                            {wires()}
                          </span>
                        </Show>
                      </NodePart>
                    )
                  }}
                </For>
              </NodesPart>
            </WorldPart>
            <LassoPart class="canvas-lasso" />
            <Show when={props.controls ?? true}>
              <div class="canvas-controls" role="group" aria-label="Zoom" data-canvas-control="">
                <Button variant="ghost" aria-label="Zoom out" onClick={() => handle.api.zoomOut()}>
                  <Icon name="minus" />
                </Button>
                <ZoomPart class="canvas-zoom" type="button" onClick={() => handle.api.resetZoom()} />
                <Button variant="ghost" aria-label="Zoom in" onClick={() => handle.api.zoomIn()}>
                  <Icon name="plus" />
                </Button>
                <Button variant="ghost" aria-label="Zoom to fit" onClick={() => handle.api.fitView()}>
                  <Icon name="fit" />
                </Button>
              </div>
            </Show>
            <Show when={props.minimap ?? true}>
              <Minimap nodes={allNodes()} onCenter={(point) => handle.api.centerOn(point)} />
            </Show>
          </>
        )
      },
    } as never,
    "div",
  )
}

function ViewboxPart(props: PartProps<"rect">) {
  return usePart(canvasPrimitive, "viewbox", undefined, props, "rect")
}
function MinimapPart(props: PartProps<"svg">) {
  return usePart(canvasPrimitive, "minimap", undefined, props, "svg")
}

/** A map of every node with the part in view; press or drag on it to look elsewhere. */
function Minimap(props: { nodes: CanvasNode[]; onCenter: (point: Point) => void }) {
  let svg: SVGSVGElement | undefined
  // The map's frame follows the view, so a drag keeps the frame it started with: otherwise
  // each move would re-map the next and the view would run away.
  let frame: DOMMatrix | null = null
  const toCanvas = (event: PointerEvent) => {
    if (!frame) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(frame)
    props.onCenter({ x: point.x, y: point.y })
  }
  return (
    <div class="canvas-minimap" aria-hidden="true" data-canvas-control="">
      <MinimapPart
        ref={(el: SVGSVGElement) => {
          svg = el
        }}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={(event: PointerEvent & { currentTarget: SVGSVGElement }) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          frame = svg?.getScreenCTM()?.inverse() ?? null
          toCanvas(event)
        }}
        onPointerMove={(event: PointerEvent) => {
          if (event.buttons) toCanvas(event)
        }}
        onPointerUp={() => {
          frame = null
        }}
        onPointerCancel={() => {
          frame = null
        }}
      >
        <For each={props.nodes} keyed={(node) => node.id}>
          {(node) => {
            const r = () => nodeRect(node(), node())
            return (
              <rect
                class="canvas-minimap-node"
                x={r().left}
                y={r().top}
                width={r().right - r().left}
                height={r().bottom - r().top}
                rx="6"
                style={{ "--series": series(node().color) }}
              />
            )
          }}
        </For>
        <ViewboxPart class="canvas-minimap-view" />
      </MinimapPart>
    </div>
  )
}

/**
 * Add, remove, undo and fit, for a canvas, on UI SDK's Toolbar: one tab stop, arrows
 * between tools, and disabled tools still reachable, so focus never drops when one turns off.
 */
function CanvasToolbar(props: {
  /**
   * The toolbar's own name. Keep the canvas's name out of it: agents find components by
   * names that contain what they ask for, so "Workflow tools" would also answer "Workflow".
   */
  label?: string
  canvas: CanvasController
  /** Shows an Add menu with these kinds. */
  kinds?: CanvasNodeKind[]
  selectedCount?: number
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  children?: JSX.Element
}) {
  const selected = () => props.selectedCount ?? 0
  // The new node takes focus as it renders; the menu, no longer holding focus, leaves it there.
  const add = (kind: string) => {
    let id: string | true | undefined
    try {
      id = props.canvas.addNode(kind)
    } catch {
      return
    }
    if (typeof id === "string") props.canvas.focusNode(id)
  }
  return (
    <Toolbar class="canvas-toolbar" aria-label={props.label ?? "Canvas tools"}>
      <Show when={props.kinds?.length}>
        <Menu
          onAction={(value: unknown) => {
            add(String(value))
          }}
        >
          <ToolbarButton render={(part) => <MenuTrigger {...part} data-variant="outline" />}>
            <Icon name="plus" />
            Add node
          </ToolbarButton>
          <MenuContent>
            <For each={props.kinds ?? []} keyed={(kind) => kind.id}>
              {(kind) => <MenuItem value={kind().id}>{kind().label}</MenuItem>}
            </For>
          </MenuContent>
        </Menu>
      </Show>
      <ToolbarButton
        data-variant="ghost"
        disabled={!selected()}
        data-agent-confirm="Removes the selected nodes and their wires"
        onClick={() => {
          props.canvas.removeSelected()
        }}
      >
        <Icon name="trash" />
        {selected() > 1 ? `Remove ${selected()} nodes` : "Remove node"}
      </ToolbarButton>
      <Show when={props.onUndo || props.onRedo}>
        <ToolbarSeparator />
      </Show>
      <Show when={props.onUndo}>
        {(onUndo) => (
          <ToolbarButton data-variant="ghost" disabled={!props.canUndo} onClick={() => onUndo()()} aria-keyshortcuts={ariaKeyshortcuts("mod+z")}>
            Undo
          </ToolbarButton>
        )}
      </Show>
      <Show when={props.onRedo}>
        {(onRedo) => (
          <ToolbarButton data-variant="ghost" disabled={!props.canRedo} onClick={() => onRedo()()} aria-keyshortcuts={ariaKeyshortcuts("mod+shift+z")}>
            Redo
          </ToolbarButton>
        )}
      </Show>
      <ToolbarSeparator />
      <ToolbarButton
        data-variant="ghost"
        onClick={() => {
          props.canvas.fitView()
        }}
      >
        Fit view
      </ToolbarButton>
      {props.children}
    </Toolbar>
  )
}

/** The selected node's details: its title, its wires (each can be removed) and your fields. */
function CanvasInspector(props: {
  node: CanvasNode | null
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  canvas: CanvasController
  onRename?: (node: CanvasNode, title: string) => void
  /** Your fields for the node, like its prompt or model: drawn afresh for each node shown. */
  children?: (node: CanvasNode) => JSX.Element
  empty?: string
}) {
  const titleId = createUniqueId()
  const name = (key: string) => {
    const { node: id, side, port } = parsePort(key)
    const other = props.nodes.find((n) => n.id === id)
    const list = side === "in" ? other?.inputs : other?.outputs
    return `${other?.title ?? id} · ${list?.find((p) => p.id === port)?.label ?? port}`
  }
  const nodeId = createMemo(() => props.node?.id)
  return (
    <Show
      when={nodeId()}
      keyed
      fallback={
        <aside class="canvas-inspector" aria-labelledby={titleId}>
          <h3 id={titleId} class="canvas-inspector-title">
            Details
          </h3>
          <p class="canvas-inspector-empty">{props.empty ?? "Select a node to see its details."}</p>
        </aside>
      }
    >
      {(id: string) => {
        // Keyed by node, so every field here, yours included, starts over for each node.
        const node = () => props.node ?? untrack(() => props.nodes.find((n) => n.id === id))!
        const wires = createMemo(() => props.edges.filter((e) => parsePort(e.from).node === id || parsePort(e.to).node === id))
        // A removed wire's button goes; focus moves to the next one, or back to the node.
        const disconnect = (index: number) => {
          const list = wires()
          const wire = list[index]!
          const next = list[index + 1] ?? list[index - 1]
          props.canvas.disconnect(wire.id)
          keepFocus(() => (next ? (document.querySelector<HTMLElement>(`[data-canvas-wire="${CSS.escape(next.id)}"]`) ?? undefined) : props.canvas.nodeElement(id)))
        }
        return (
          <aside class="canvas-inspector" aria-labelledby={titleId}>
            <h3 id={titleId} class="canvas-inspector-title">
              {node().title}
            </h3>
            <Show when={props.onRename}>
              {(onRename) => (
                <form
                  class="canvas-inspector-form"
                  aria-label={`Rename ${node().title}`}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const text = String(new FormData(event.currentTarget).get("node-title") ?? "").trim()
                    if (text) onRename()(node(), text)
                  }}
                >
                  <Field name="node-title">
                    <FieldLabel>Title</FieldLabel>
                    <Input required defaultValue={untrack(() => node().title)} autocomplete="off" />
                  </Field>
                  <Button type="submit" variant="outline">
                    Rename
                  </Button>
                </form>
              )}
            </Show>
            {untrack(() => props.children?.(node()))}
            <h4 class="canvas-inspector-heading">Wires</h4>
            <Show when={wires().length} fallback={<p class="canvas-inspector-empty">No wires yet. Focus the node and press C to start one.</p>}>
              <ul class="canvas-inspector-wires">
                <For each={wires()} keyed={(wire) => wire.id}>
                  {(wire, index) => (
                    <li>
                      <span>
                        {name(wire().from)} → {name(wire().to)}
                      </span>
                      <Button variant="ghost" data-canvas-wire={wire().id} onClick={() => disconnect(index())} aria-label={`Disconnect ${name(wire().from)} from ${name(wire().to)}`}>
                        Disconnect
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </aside>
        )
      }}
    </Show>
  )
}

type CanvasSnapshot = { nodes: CanvasNode[]; edges: CanvasEdge[] }

/**
 * Nodes and edges with undo and redo, Solid's `useCanvasHistory`. Pass `nodes`, `edges` and the
 * change handlers to `Canvas`, and `undo`, `redo`, `canUndo`, `canRedo` to it and its toolbar.
 * Its fields are getters: read them where they're used, in JSX or an effect.
 */
function createCanvasHistory(initial: CanvasSnapshot) {
  const [present, setPresent] = createSignal<CanvasSnapshot>(initial, { ownedWrite: true })
  const stack = createUndoStack<CanvasSnapshot>(initial)
  let current = initial
  const same = (a: CanvasSnapshot, b: CanvasSnapshot) =>
    a.nodes.length === b.nodes.length && a.nodes.every((n, i) => n === b.nodes[i]) && a.edges.map((e) => e.id).join("|") === b.edges.map((e) => e.id).join("|")
  // A change that changes nothing (a rename to the same title, a pruned selection) isn't a step.
  const commit = (next: CanvasSnapshot) => {
    if (same(next, current)) return
    current = next
    stack.record(next)
    setPresent(next)
  }
  const restore = (next: CanvasSnapshot | undefined) => {
    if (!next) return
    current = next
    setPresent(next)
  }
  const ids = (edges: CanvasEdge[]) => edges.map((e) => e.id).join("|")
  return {
    get nodes() {
      return present().nodes
    },
    get edges() {
      return present().edges
    },
    onNodesChange: (nodes: CanvasNode[]) => {
      // Removing nodes takes their wires in the same step, so one undo brings both back.
      const kept = new Set(nodes.map((n) => n.id))
      const edges = current.edges.filter((e) => kept.has(parsePort(e.from).node) && kept.has(parsePort(e.to).node))
      commit({ nodes, edges })
    },
    onEdgesChange: (edges: CanvasEdge[]) => {
      if (ids(edges) === ids(current.edges)) return
      commit({ ...current, edges })
    },
    /** For changes outside the canvas, like a rename in the inspector. */
    setNodes: (update: (nodes: CanvasNode[]) => CanvasNode[]) => {
      const nodes = update(current.nodes)
      // Equal nodes count as the same, so an edit that changes nothing records nothing.
      const kept = nodes.map((n, i) => {
        const was = current.nodes[i]
        return was && JSON.stringify(was) === JSON.stringify(n) ? was : n
      })
      commit({ ...current, nodes: kept })
    },
    undo: () => restore(stack.undo()),
    redo: () => restore(stack.redo()),
    get canUndo() {
      present()
      return stack.canUndo()
    },
    get canRedo() {
      present()
      return stack.canRedo()
    },
  }
}

/** The box around every node, in canvas units. */
const canvasBounds = (nodes: CanvasNode[]) => boundsOf(nodes.map((n) => nodeRect(n, n)))

export { Canvas, CanvasInspector, CanvasToolbar, canvasBounds, createCanvasController, createCanvasHistory }
export type { CanvasChange, CanvasController, CanvasEdge, CanvasNode, CanvasNodeKind, CanvasPort, CanvasProps }
