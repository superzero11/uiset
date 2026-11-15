"use client"

import { ariaKeyshortcuts, createUndoStack, type Viewport } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import { Fragment, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Button } from "./button"
import { Field, FieldLabel, Input } from "./field"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./menu"
import { Toolbar, ToolbarButton, ToolbarSeparator } from "./toolbar"
import { Icon } from "./shell/icons"
import {
  canvasPrimitive,
  createCanvasController,
  type CanvasController,
  type CanvasEdge,
  type CanvasNodeKind,
} from "./canvas/canvas"
import { boundsOf, describeWires, nodeRect, parsePort, portKey, type CanvasNodeShape, type CanvasPort, type Point } from "./canvas/geometry"
import "./shell/shell.css"
import "./chart/tokens.css"
import "./canvas/canvas.css"
import { returnFocus } from "./uiset/focus"

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
  renderNode?: (node: CanvasNode) => ReactNode
  /** Snapping grid and Alt+arrow step, in canvas units. */
  grid?: number
  /** The zoom buttons in the corner. */
  controls?: boolean
  minimap?: boolean
  onUndo?: () => void
  onRedo?: () => void
  /** Lets a toolbar, an inspector or your code drive the canvas: `createCanvasController()`. */
  controller?: CanvasController
  className?: string
}

const series = (color?: number) => `var(--chart-${Math.min(8, Math.max(1, Math.round(color ?? 1)))})`

function useControllable<T>(value: T | undefined, initial: T) {
  const [own, setOwn] = useState(initial)
  return [value ?? own, (next: T) => value === undefined && setOwn(next)] as const
}

function NodesPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "nodes", {}, props, "div")
}
function NodePart({ value, ...props }: { value: string } & PartProps<"div">) {
  return usePart(canvasPrimitive, "node", { value }, props, "div")
}
function PortPart({ value, ...props }: { value: string } & PartProps<"span">) {
  return usePart(canvasPrimitive, "port", { value }, props, "span")
}
function WirePart({ value, ...props }: { value: string } & PartProps<"path">) {
  return usePart(canvasPrimitive, "wire", { value }, props, "path")
}
function UnwirePart({ value, ...props }: { value: string } & PartProps<"g">) {
  return usePart(canvasPrimitive, "unwire", { value }, props, "g")
}
function DraftPart(props: PartProps<"path">) {
  return usePart(canvasPrimitive, "draft", {}, props, "path")
}
function GridPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "grid", {}, props, "div")
}
function WorldPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "world", {}, props, "div")
}
function ZoomPart(props: PartProps<"button">) {
  return usePart(canvasPrimitive, "zoom", {}, props, "button")
}
function LassoPart(props: PartProps<"div">) {
  return usePart(canvasPrimitive, "lasso", {}, props, "div")
}

function PortRow({ node, index }: { node: CanvasNode; index: number }) {
  const input: CanvasPort | undefined = node.inputs?.[index]
  const output: CanvasPort | undefined = node.outputs?.[index]
  return (
    <span className="canvas-node-row">
      <span className="canvas-node-in">
        {input && <PortPart value={portKey(node.id, "in", input.id)} className="canvas-port" />}
        <span className="canvas-port-label">{input?.label}</span>
      </span>
      <span className="canvas-node-out">
        <span className="canvas-port-label">{output?.label}</span>
        {output && <PortPart value={portKey(node.id, "out", output.id)} className="canvas-port" />}
      </span>
    </span>
  )
}

/**
 * A node editor. Drag empty space to pan, scroll or pinch to zoom, Shift-drag to select a
 * box of nodes. Tab reaches the nodes once; arrows go to the nearest node that way, Alt
 * with arrows moves it, Space selects, C starts a wire, Delete removes, Enter opens.
 */
function Canvas({
  label,
  nodes,
  defaultNodes = [],
  onNodesChange,
  edges,
  defaultEdges = [],
  onEdgesChange,
  selected,
  defaultSelected,
  onSelectedChange,
  defaultViewport,
  fitView = false,
  kinds,
  onAddNode,
  onNodeOpen,
  canConnect,
  locked,
  renderNode,
  grid = 8,
  controls = true,
  minimap = true,
  onUndo,
  onRedo,
  controller,
  className,
}: CanvasProps) {
  const baseId = useId()
  const helpId = `${baseId}-help`
  const [allNodes, setOwnNodes] = useControllable(nodes, defaultNodes)
  const [allEdges, setOwnEdges] = useControllable(edges, defaultEdges)
  const setNodes = (next: CanvasNode[], details: CanvasChange) => {
    setOwnNodes(next)
    onNodesChange?.(next, details)
  }
  const setEdges = (next: CanvasEdge[], details: { reason: string }) => {
    setOwnEdges(next)
    onEdgesChange?.(next, details)
  }
  const positions = Object.fromEntries(allNodes.map((n) => [n.id, { x: n.x, y: n.y }]))
  const byId = new Map(allNodes.map((n) => [n.id, n]))

  const handle = usePrimitive(canvasPrimitive, {
    nodes: allNodes,
    positions,
    onPositionsChange: (next, details) =>
      setNodes(
        allNodes.map((n) => (next[n.id] && (next[n.id]!.x !== n.x || next[n.id]!.y !== n.y) ? { ...n, ...next[n.id]! } : n)),
        { reason: details.reason, type: "move" },
      ),
    edges: allEdges,
    onEdgesChange: (next, details) => setEdges(next, { reason: details.reason }),
    selected,
    defaultSelected,
    onSelectedChange: onSelectedChange ? (next) => onSelectedChange(next) : undefined,
    defaultViewport,
    grid,
    kinds,
    canConnect,
    locked: locked ? (id) => !!byId.get(id) && locked(byId.get(id)!) : undefined,
    onOpen: onNodeOpen ? (id) => byId.get(id) && onNodeOpen(byId.get(id)!) : undefined,
    // A canvas whose nodes nobody can change doesn't remove them.
    onRemove: nodes === undefined || onNodesChange ? (ids) => {
      const gone = new Set(ids)
      setNodes(
        allNodes.filter((n) => !gone.has(n.id)),
        { reason: "imperative", type: "remove" },
      )
      setEdges(
        allEdges.filter((e) => !gone.has(parsePort(e.from).node) && !gone.has(parsePort(e.to).node)),
        { reason: "imperative" },
      )
    } : undefined,
    onAdd: onAddNode
      ? (kind, at, title) => {
          const node = onAddNode(kind, at, title)
          if (!node) return undefined
          setNodes([...allNodes, node], { reason: "imperative", type: "add" })
          return node.id
        }
      : undefined,
    onUndo,
    onRedo,
    controller,
  })

  // Frame the nodes once the frame has a size to fit them in.
  const fitted = useRef(false)
  useEffect(() => {
    if (!fitView || fitted.current) return
    const el = handle.api.viewport.visible()
    if (el.right - el.left <= 0) return
    fitted.current = true
    handle.api.fitView()
  })

  return usePart(
    handle,
    "root",
    {},
    {
      "aria-label": label,
      "aria-describedby": helpId,
      className: ["canvas", className].filter(Boolean).join(" "),
      children: (
        <>
          <p id={helpId} hidden>
            Arrow keys go to the nearest node that way. Alt with arrows moves it, Space selects it,
            C starts a wire (arrows choose an input, Enter connects, Escape stops), Delete removes,
            Enter opens. Plus and minus zoom; 0 resets.
          </p>
          <GridPart className="canvas-grid" />
          <WorldPart className="canvas-world">
            <svg className="canvas-wires" aria-hidden="true" width="1" height="1">
              {allEdges.map((edge) => (
                <WirePart key={edge.id} value={edge.id} className="canvas-wire" />
              ))}
              <DraftPart className="canvas-wire" data-draft="" />
              {allEdges.map((edge) => (
                <UnwirePart key={edge.id} value={edge.id} className="canvas-unwire">
                  <title>Disconnect</title>
                  <circle r="9" />
                  <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" />
                </UnwirePart>
              ))}
            </svg>
            <NodesPart className="canvas-nodes" aria-label={`${label} nodes`}>
              {allNodes.map((node, index) => {
                const rows = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0)
                // Ids from data may hold spaces; these don't.
                const partId = `${baseId}-n${index}`
                const wires = describeWires(node, allNodes, allEdges)
                const kind = kinds?.find((k) => k.id === node.kind)?.label
                const body = renderNode?.(node)
                return (
                  <NodePart
                    key={node.id}
                    value={node.id}
                    className="canvas-node"
                    // Named by what it shows, in the order it shows it: title, then kind.
                    aria-labelledby={kind ? `${partId}-title ${partId}-kind` : `${partId}-title`}
                    aria-describedby={[body ? `${partId}-body` : "", wires ? `${partId}-wires` : ""].filter(Boolean).join(" ") || undefined}
                    data-locked={locked?.(node) ? "" : undefined}
                  >
                    <span
                      className="canvas-node-card"
                      style={{ inlineSize: `${node.width ?? 208}px`, "--series": series(node.color) } as CSSProperties}
                    >
                      <span className="canvas-node-header">
                        <span id={`${partId}-title`} className="canvas-node-title">
                          {node.title}
                        </span>
                        {kind && (
                          <span id={`${partId}-kind`} className="canvas-node-kind">
                            {kind}
                          </span>
                        )}
                      </span>
                      {Array.from({ length: rows }, (_, i) => (
                        <PortRow key={i} node={node} index={i} />
                      ))}
                      <span className="canvas-node-foot" />
                      {body ? (
                        <span id={`${partId}-body`} className="canvas-node-body">
                          {body}
                        </span>
                      ) : null}
                    </span>
                    {wires && (
                      <span id={`${partId}-wires`} hidden>
                        {wires}
                      </span>
                    )}
                  </NodePart>
                )
              })}
            </NodesPart>
          </WorldPart>
          <LassoPart className="canvas-lasso" />
          {controls && (
            <div className="canvas-controls" role="group" aria-label="Zoom" data-canvas-control="">
              <Button variant="ghost" aria-label="Zoom out" onClick={() => handle.api.zoomOut()}>
                <Icon name="minus" />
              </Button>
              <ZoomPart className="canvas-zoom" type="button" onClick={() => handle.api.resetZoom()} />
              <Button variant="ghost" aria-label="Zoom in" onClick={() => handle.api.zoomIn()}>
                <Icon name="plus" />
              </Button>
              <Button variant="ghost" aria-label="Fit to view" onClick={() => handle.api.fitView()}>
                <Icon name="fit" />
              </Button>
            </div>
          )}
          {minimap && <Minimap nodes={allNodes} onCenter={(point) => handle.api.centerOn(point)} />}
        </>
      ),
    } as never,
    "div",
  )
}

function ViewboxPart(props: PartProps<"rect">) {
  return usePart(canvasPrimitive, "viewbox", {}, props, "rect")
}
function MinimapPart(props: PartProps<"svg">) {
  return usePart(canvasPrimitive, "minimap", {}, props, "svg")
}

/** A map of every node with the part in view; press or drag on it to look elsewhere. */
function Minimap({
  nodes,
  onCenter,
}: {
  nodes: CanvasNode[]
  onCenter: (point: Point) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  // The map's frame follows the view, so a drag keeps the frame it started with: otherwise
  // each move would re-map the next and the view would run away.
  const frame = useRef<DOMMatrix | null>(null)
  const toCanvas = (event: React.PointerEvent) => {
    const matrix = frame.current
    if (!matrix) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix)
    onCenter({ x: point.x, y: point.y })
  }
  return (
    <div className="canvas-minimap" aria-hidden="true" data-canvas-control="">
      <MinimapPart
        ref={svg}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={(event: React.PointerEvent<SVGSVGElement>) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          frame.current = svg.current?.getScreenCTM()?.inverse() ?? null
          toCanvas(event)
        }}
        onPointerMove={(event: React.PointerEvent<SVGSVGElement>) => {
          if (event.buttons) toCanvas(event)
        }}
        onPointerUp={() => (frame.current = null)}
        onPointerCancel={() => (frame.current = null)}
      >
        {nodes.map((node) => {
          const r = nodeRect(node, node)
          return (
            <rect
              key={node.id}
              className="canvas-minimap-node"
              x={r.left}
              y={r.top}
              width={r.right - r.left}
              height={r.bottom - r.top}
              rx="6"
              style={{ "--series": series(node.color) } as CSSProperties}
            />
          )
        })}
        <ViewboxPart className="canvas-minimap-view" />
      </MinimapPart>
    </div>
  )
}

/**
 * Add, remove, undo and fit, for a canvas, on UI SDK's Toolbar: one tab stop, arrows
 * between tools, and disabled tools still reachable, so focus never drops when one turns off.
 */
function CanvasToolbar({
  label = "Canvas tools",
  canvas,
  kinds,
  selectedCount = 0,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  children,
}: {
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
  children?: ReactNode
}) {
  // The menu hands focus back to its button as it closes; the new node takes it after.
  const add = (kind: string) => {
    let id: string | true | undefined
    try {
      id = canvas.addNode(kind)
    } catch {
      return
    }
    if (typeof id === "string") requestAnimationFrame(() => requestAnimationFrame(() => canvas.focusNode(id as string)))
  }
  return (
    <Toolbar className="canvas-toolbar" aria-label={label}>
      {kinds?.length ? (
        <Menu onAction={(value: unknown) => add(String(value))}>
          <ToolbarButton render={<MenuTrigger data-variant="outline" />}>
            <Icon name="plus" />
            Add node
          </ToolbarButton>
          <MenuContent>
            {kinds.map((kind) => (
              <MenuItem key={kind.id} value={kind.id}>
                {kind.label}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      ) : null}
      <ToolbarButton
        data-variant="ghost"
        disabled={!selectedCount}
        data-agent-confirm="Removes the selected nodes and their wires"
        onClick={() => canvas.removeSelected()}
      >
        <Icon name="trash" />
        {selectedCount > 1 ? `Remove ${selectedCount} nodes` : "Remove node"}
      </ToolbarButton>
      {(onUndo || onRedo) && <ToolbarSeparator />}
      {onUndo && (
        <ToolbarButton data-variant="ghost" disabled={!canUndo} onClick={onUndo} aria-keyshortcuts={ariaKeyshortcuts("mod+z")}>
          Undo
        </ToolbarButton>
      )}
      {onRedo && (
        <ToolbarButton data-variant="ghost" disabled={!canRedo} onClick={onRedo} aria-keyshortcuts={ariaKeyshortcuts("mod+shift+z")}>
          Redo
        </ToolbarButton>
      )}
      <ToolbarSeparator />
      <ToolbarButton data-variant="ghost" onClick={() => canvas.fitView()}>
        Fit view
      </ToolbarButton>
      {children}
    </Toolbar>
  )
}

/** The selected node's details: its title, its wires (each can be removed) and your fields. */
function CanvasInspector({
  node,
  nodes,
  edges,
  canvas,
  onRename,
  children,
  empty = "Select a node to see its details.",
}: {
  node: CanvasNode | null
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  canvas: CanvasController
  onRename?: (node: CanvasNode, title: string) => void
  /** Your fields for the node, like its prompt or model. */
  children?: (node: CanvasNode) => ReactNode
  empty?: string
}) {
  const titleId = useId()
  if (!node)
    return (
      <aside className="canvas-inspector" aria-labelledby={titleId}>
        <h3 id={titleId} className="canvas-inspector-title">
          Details
        </h3>
        <p className="canvas-inspector-empty">{empty}</p>
      </aside>
    )
  const name = (key: string) => {
    const { node: id, side, port } = parsePort(key)
    const other = nodes.find((n) => n.id === id)
    const list = side === "in" ? other?.inputs : other?.outputs
    return `${other?.title ?? id} · ${list?.find((p) => p.id === port)?.label ?? port}`
  }
  const wires = edges.filter((e) => parsePort(e.from).node === node.id || parsePort(e.to).node === node.id)
  // A removed wire's button goes; focus moves to the next one, or back to the node.
  const disconnect = (index: number) => {
    const wire = wires[index]!
    const next = wires[index + 1] ?? wires[index - 1]
    canvas.disconnect(wire.id)
    returnFocus(() =>
      next
        ? (document.querySelector<HTMLElement>(`[data-canvas-wire="${CSS.escape(next.id)}"]`) ?? undefined)
        : canvas.nodeElement(node.id),
    )
  }
  return (
    // Keyed by node, so every field here, yours included, starts over for each node.
    <Fragment key={node.id}>
    <aside className="canvas-inspector" aria-labelledby={titleId}>
      <h3 id={titleId} className="canvas-inspector-title">
        {node.title}
      </h3>
      {onRename && (
        <form
          className="canvas-inspector-form"
          aria-label={`Rename ${node.title}`}
          onSubmit={(event) => {
            event.preventDefault()
            const text = String(new FormData(event.currentTarget).get("node-title") ?? "").trim()
            if (text) onRename(node, text)
          }}
        >
          <Field name="node-title">
            <FieldLabel>Title</FieldLabel>
            <Input required defaultValue={node.title} autoComplete="off" />
          </Field>
          <Button type="submit" variant="outline">
            Rename
          </Button>
        </form>
      )}
      {children?.(node)}
      <h4 className="canvas-inspector-heading">Wires</h4>
      {wires.length ? (
        <ul className="canvas-inspector-wires">
          {wires.map((wire, index) => (
            <li key={wire.id}>
              <span>
                {name(wire.from)} → {name(wire.to)}
              </span>
              <Button
                variant="ghost"
                data-canvas-wire={wire.id}
                onClick={() => disconnect(index)}
                aria-label={`Disconnect ${name(wire.from)} from ${name(wire.to)}`}
              >
                Disconnect
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="canvas-inspector-empty">No wires yet. Focus the node and press C to start one.</p>
      )}
    </aside>
    </Fragment>
  )
}

/**
 * Nodes and edges with undo and redo. Pass `nodes`, `edges` and the change handlers to
 * `Canvas`, and `undo`, `redo`, `canUndo`, `canRedo` to it and its toolbar.
 */
function useCanvasHistory(initial: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  type Snapshot = { nodes: CanvasNode[]; edges: CanvasEdge[] }
  const [present, setPresent] = useState<Snapshot>(initial)
  const [stack] = useState(() => createUndoStack<Snapshot>(initial))
  const current = useRef(present)
  const same = (a: Snapshot, b: Snapshot) =>
    a.nodes.length === b.nodes.length &&
    a.nodes.every((n, i) => n === b.nodes[i]) &&
    a.edges.map((e) => e.id).join("|") === b.edges.map((e) => e.id).join("|")
  // A change that changes nothing (a rename to the same title, a pruned selection) isn't a step.
  const commit = (next: Snapshot) => {
    if (same(next, current.current)) return
    current.current = next
    stack.record(next)
    setPresent(next)
  }
  const restore = (next: Snapshot | undefined) => {
    if (!next) return
    current.current = next
    setPresent(next)
  }
  const ids = (edges: CanvasEdge[]) => edges.map((e) => e.id).join("|")
  return {
    nodes: present.nodes,
    edges: present.edges,
    onNodesChange: (nodes: CanvasNode[]) => {
      // Removing nodes takes their wires in the same step, so one undo brings both back.
      const kept = new Set(nodes.map((n) => n.id))
      const edges = current.current.edges.filter((e) => kept.has(parsePort(e.from).node) && kept.has(parsePort(e.to).node))
      commit({ nodes, edges })
    },
    onEdgesChange: (edges: CanvasEdge[]) => {
      if (ids(edges) === ids(current.current.edges)) return
      commit({ ...current.current, edges })
    },
    /** For changes outside the canvas, like a rename in the inspector. */
    setNodes: (update: (nodes: CanvasNode[]) => CanvasNode[]) => {
      const nodes = update(current.current.nodes)
      // Equal nodes count as the same, so an edit that changes nothing records nothing.
      const kept = nodes.map((n, i) => {
        const was = current.current.nodes[i]
        return was && JSON.stringify(was) === JSON.stringify(n) ? was : n
      })
      commit({ ...current.current, nodes: kept })
    },
    undo: () => restore(stack.undo()),
    redo: () => restore(stack.redo()),
    canUndo: stack.canUndo(),
    canRedo: stack.canRedo(),
  }
}

/** The box around every node, in canvas units. */
const canvasBounds = (nodes: CanvasNode[]) => boundsOf(nodes.map((n) => nodeRect(n, n)))

export { Canvas, CanvasInspector, CanvasToolbar, canvasBounds, createCanvasController, useCanvasHistory }
export type { CanvasChange, CanvasController, CanvasEdge, CanvasNode, CanvasNodeKind, CanvasPort, CanvasProps }
