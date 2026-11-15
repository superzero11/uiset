import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { Canvas, useCanvasHistory, type CanvasEdge, type CanvasNode } from "@/registry/uiset/ui/canvas"
import { boundsOf, nodeHeight, nodeRect, parsePort, portKey, portPoint, wireMiddle, wirePath } from "@/registry/uiset/ui/canvas/geometry"

const shape = { inputs: [{ id: "in", label: "In" }], outputs: [{ id: "out", label: "Out" }] }
const nodes: CanvasNode[] = [
  { id: "a", title: "Source", x: 0, y: 0, ...shape },
  { id: "b", title: "Middle", x: 300, y: 0, ...shape },
  { id: "c", title: "Sink", x: 600, y: 0, inputs: [{ id: "in", label: "In" }, { id: "extra", label: "Extra" }] },
]
const edge = (from: string, to: string): CanvasEdge => ({ id: `${from}->${to}`, from, to })
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

test("ports sit on the node's edges, a row apart, under the header", () => {
  const model = { id: "m", title: "Model", inputs: [{ id: "p", label: "P" }, { id: "c", label: "C" }], outputs: [{ id: "t", label: "T" }] }
  expect(portPoint(model, { x: 10, y: 20 }, "in", "p")).toEqual({ x: 10, y: 20 + 36 + 14 })
  expect(portPoint(model, { x: 10, y: 20 }, "in", "c")).toEqual({ x: 10, y: 20 + 36 + 28 + 14 })
  expect(portPoint(model, { x: 10, y: 20 }, "out", "t")).toEqual({ x: 10 + 208, y: 20 + 36 + 14 })
  expect(portPoint(model, { x: 0, y: 0 }, "out", "nope")).toBeUndefined()
  expect(nodeHeight(model)).toBe(36 + 2 * 28 + 8)
  expect(nodeRect(model, { x: 5, y: 5 })).toEqual({ left: 5, top: 5, right: 213, bottom: 5 + 100 })
  expect(parsePort(portKey("m", "out", "t"))).toEqual({ node: "m", side: "out", port: "t" })
})

test("a wire leaves rightward and arrives from the left; its middle is on the curve", () => {
  expect(wirePath({ x: 0, y: 0 }, { x: 200, y: 100 })).toBe("M 0 0 C 100 0, 100 100, 200 100")
  expect(wireMiddle({ x: 0, y: 0 }, { x: 200, y: 100 })).toEqual({ x: 100, y: 50 })
  expect(boundsOf([])).toBeNull()
  expect(boundsOf([{ left: 0, top: 5, right: 10, bottom: 10 }, { left: -5, top: 0, right: 3, bottom: 20 }])).toEqual({
    left: -5,
    top: 0,
    right: 10,
    bottom: 20,
  })
})

function Demo(props: {
  edges?: CanvasEdge[]
  onEdges?: (e: CanvasEdge[]) => void
  onAdd?: boolean | "refuse"
  locked?: (n: CanvasNode) => boolean
}) {
  const [all, setAll] = useState(nodes)
  const [edges, setEdges] = useState(props.edges ?? [])
  return (
    <Canvas
      label="Flow"
      nodes={all}
      onNodesChange={setAll}
      edges={edges}
      onEdgesChange={(next) => {
        setEdges(next)
        props.onEdges?.(next)
      }}
      locked={props.locked}
      kinds={[{ id: "step", label: "Step" }]}
      onAddNode={
        props.onAdd === "refuse"
          ? () => null
          : props.onAdd
            ? (kind, at, title) => ({ id: "n", kind, title: title ?? "New step", ...at, ...shape })
            : undefined
      }
      minimap={false}
    />
  )
}

const agentRun = async (action: string, ...args: unknown[]) => {
  const agent = createAgent()
  await tick()
  return act(() => agent.act({ steps: [{ ref: "Flow", action, args }] }))
}

test("wires go output to input between two nodes, once; a new wire into an input replaces the old", async () => {
  const onEdges = vi.fn()
  render(<Demo edges={[edge("a:out:out", "c:in:in")]} onEdges={onEdges} />)
  await tick()
  let result = await agentRun("connect", "Source", "Source")
  expect(result.error?.message).toMatch(/can't connect/)
  result = await agentRun("connect", "Source", "Sink")
  expect(result.error?.message).toMatch(/already wired/)
  result = await agentRun("connect", "Source", "Sink", "Out", "Nowhere")
  expect(result.error?.message).toMatch(/has no input "Nowhere". It has: In, Extra/)
  result = await agentRun("connect", "Middle", "Sink")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onEdges).toHaveBeenLastCalledWith([edge("b:out:out", "c:in:in")])
  result = await agentRun("connect", "Source", "Sink", "Out", "Extra")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onEdges.mock.lastCall![0]).toHaveLength(2)
})

test("a node names its wires in its description", async () => {
  render(<Demo edges={[edge("a:out:out", "b:in:in"), edge("b:out:out", "c:in:extra")]} />)
  await tick()
  const middle = screen.getByRole("option", { name: "Middle" })
  const description = document.getElementById(middle.getAttribute("aria-describedby")!)!.textContent
  expect(description).toBe("Inputs: In from Source Out. Outputs: Out to Sink Extra.")
})

test("C starts a wire from the focused node, and Escape drops it", async () => {
  const onEdges = vi.fn()
  render(<Demo onEdges={onEdges} />)
  await tick()
  const source = screen.getByRole("option", { name: "Source" })
  source.focus()
  fireEvent.keyDown(source, { key: "c", code: "KeyC" })
  await tick()
  expect(document.querySelector('[data-connect="source"]')).not.toBeNull()
  fireEvent.keyDown(source, { key: "Escape" })
  await tick()
  expect(document.querySelector('[data-connect="source"]')).toBeNull()
  expect(onEdges).not.toHaveBeenCalled()
})

test("agents can't move a locked node, name an unknown node, or add without onAddNode", async () => {
  render(<Demo locked={(n) => n.id === "b"} />)
  await tick()
  let result = await agentRun("moveNode", "Middle", 10, 10)
  expect(result.error?.message).toMatch(/locked/)
  result = await agentRun("moveNode", "Nobody", 10, 10)
  expect(result.error?.message).toMatch(/No node "Nobody". Nodes: Source, Middle, Sink/)
  result = await agentRun("addNode", "Step")
  expect(result.error?.message).toMatch(/doesn't add nodes/)
  result = await agentRun("openNode", "Source")
  expect(result.error?.message).toMatch(/doesn't open nodes/)
})

test("agents add a node of a known kind, at a point", async () => {
  render(<Demo onAdd />)
  await tick()
  let result = await agentRun("addNode", "Widget")
  expect(result.error?.message).toMatch(/No kind "Widget". Kinds: Step/)
  result = await agentRun("addNode", "Step", "Fetch", 40, 300)
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("option", { name: "Fetch Step" }).style.left).toBe("40px")
})

test("history: removing a node takes its wires, and one undo brings both back", () => {
  const { result } = renderHook(() =>
    useCanvasHistory({ nodes, edges: [edge("a:out:out", "b:in:in"), edge("b:out:out", "c:in:in")] }),
  )
  expect(result.current.canUndo).toBe(false)
  act(() => result.current.onNodesChange(nodes.filter((n) => n.id !== "b")))
  // The canvas reports the pruned wires as well; history keeps it one step.
  act(() => result.current.onEdgesChange([]))
  expect(result.current.nodes.map((n) => n.id)).toEqual(["a", "c"])
  expect(result.current.edges).toEqual([])
  expect(result.current.canUndo).toBe(true)
  act(() => result.current.undo())
  expect(result.current.nodes.map((n) => n.id)).toEqual(["a", "b", "c"])
  expect(result.current.edges).toHaveLength(2)
  act(() => result.current.redo())
  expect(result.current.nodes.map((n) => n.id)).toEqual(["a", "c"])
})

test("the canvas frame is the tab stop only while it has no nodes", async () => {
  const { unmount } = render(<Canvas label="Empty" minimap={false} />)
  await tick()
  expect(screen.getByRole("group", { name: "Empty" }).getAttribute("tabindex")).toBe("0")
  unmount()
  render(<Demo />)
  await tick()
  expect(screen.getByRole("group", { name: "Flow" }).getAttribute("tabindex")).toBe("-1")
  const stops = screen.getAllByRole("option").filter((el) => el.tabIndex === 0)
  expect(stops).toHaveLength(1)
})

test("agents hear when the app refuses a node, and need both x and y", async () => {
  render(<Demo onAdd="refuse" />)
  await tick()
  let result = await agentRun("addNode", "Step")
  expect(result.error?.message).toMatch(/didn't add that node/)
  result = await agentRun("addNode", "Step", "Fetch", 40)
  expect(result.error?.message).toMatch(/both x and y/)
})

test("history: a change that changes nothing isn't a step", () => {
  const { result } = renderHook(() => useCanvasHistory({ nodes, edges: [] }))
  act(() => result.current.setNodes((all) => all.map((n) => ({ ...n }))))
  act(() => result.current.onEdgesChange([]))
  expect(result.current.canUndo).toBe(false)
  act(() => result.current.setNodes((all) => all.map((n) => (n.id === "a" ? { ...n, title: "Origin" } : n))))
  expect(result.current.canUndo).toBe(true)
})
