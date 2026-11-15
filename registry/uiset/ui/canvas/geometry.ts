// Where things sit on a canvas, in canvas units (CSS pixels at 100%). Nodes have a header,
// then one row per port: input i on the left edge and output i on the right of row i, so
// wires attach without measuring the page. canvas.css draws the same sizes.

type CanvasPort = { id: string; label: string }

type CanvasNodeShape = {
  id: string
  title: string
  inputs?: CanvasPort[]
  outputs?: CanvasPort[]
  /** Canvas units. Defaults to `NODE_WIDTH`. */
  width?: number
}

type Point = { x: number; y: number }
type Rect = { left: number; top: number; right: number; bottom: number }

const NODE_WIDTH = 208
const HEADER = 36
const ROW = 28
const FOOT = 8

/** A port's key: node, side and port, like "model:out:text". */
const portKey = (node: string, side: "in" | "out", port: string) => `${node}:${side}:${port}`

/** Splits a port key. Node and port ids may not hold ":" themselves. */
function parsePort(key: string) {
  const [node = "", side = "", port = ""] = key.split(":")
  return { node, side: side as "in" | "out", port }
}

function nodeHeight(node: CanvasNodeShape) {
  const rows = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0)
  return HEADER + rows * ROW + FOOT
}

function nodeRect(node: CanvasNodeShape, at: Point): Rect {
  return { left: at.x, top: at.y, right: at.x + (node.width ?? NODE_WIDTH), bottom: at.y + nodeHeight(node) }
}

/** Where a port's dot sits, or undefined if the node has no such port. */
function portPoint(node: CanvasNodeShape, at: Point, side: "in" | "out", port: string): Point | undefined {
  const list = side === "in" ? node.inputs : node.outputs
  const index = list?.findIndex((p) => p.id === port) ?? -1
  if (index < 0) return undefined
  return {
    x: side === "in" ? at.x : at.x + (node.width ?? NODE_WIDTH),
    y: at.y + HEADER + ROW * (index + 0.5),
  }
}

/** A wire from an output to an input: a curve that leaves rightward and arrives from the left. */
function wirePath(from: Point, to: Point) {
  const reach = Math.max(40, Math.abs(to.x - from.x) / 2)
  const r = (n: number) => Math.round(n * 10) / 10
  return `M ${r(from.x)} ${r(from.y)} C ${r(from.x + reach)} ${r(from.y)}, ${r(to.x - reach)} ${r(to.y)}, ${r(to.x)} ${r(to.y)}`
}

/** The point halfway along a wire, for its remove button. */
function wireMiddle(from: Point, to: Point): Point {
  const reach = Math.max(40, Math.abs(to.x - from.x) / 2)
  // A cubic Bézier at t = 0.5.
  return {
    x: (from.x + 3 * (from.x + reach) + 3 * (to.x - reach) + to.x) / 8,
    y: (from.y + 3 * from.y + 3 * to.y + to.y) / 8,
  }
}

/** The box holding every rect, or null for none. */
function boundsOf(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  return rects.reduce((all, r) => ({
    left: Math.min(all.left, r.left),
    top: Math.min(all.top, r.top),
    right: Math.max(all.right, r.right),
    bottom: Math.max(all.bottom, r.bottom),
  }))
}

/** What a node is wired to, in words: its description for screen readers (React and web). */
function describeWires(node: CanvasNodeShape, nodes: readonly CanvasNodeShape[], edges: readonly { from: string; to: string }[]) {
  const name = (key: string) => {
    const { node: id, side, port } = parsePort(key)
    const other = nodes.find((n) => n.id === id)
    const list = side === "in" ? other?.inputs : other?.outputs
    return { node: other?.title ?? id, port: list?.find((p) => p.id === port)?.label ?? port }
  }
  const into = edges
    .filter((e) => parsePort(e.to).node === node.id)
    .map((e) => `${name(e.to).port} from ${name(e.from).node} ${name(e.from).port}`)
  const out = edges
    .filter((e) => parsePort(e.from).node === node.id)
    .map((e) => `${name(e.from).port} to ${name(e.to).node} ${name(e.to).port}`)
  return [into.length && `Inputs: ${into.join("; ")}.`, out.length && `Outputs: ${out.join("; ")}.`]
    .filter(Boolean)
    .join(" ")
}

export { boundsOf, describeWires, FOOT, HEADER, NODE_WIDTH, nodeHeight, nodeRect, parsePort, portKey, portPoint, ROW, wireMiddle, wirePath }
export type { CanvasNodeShape, CanvasPort, Point, Rect }
