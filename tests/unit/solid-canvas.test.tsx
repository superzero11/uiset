// The canvas in Solid, with React's assertions (tests/unit/canvas.test.tsx). Panning, moving,
// selecting, wiring, keys and agents are UISet's own primitive and geometry (canvas/), tested
// there; these check the Solid views over them, the toolbar, the inspector and the history.
import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createAgent } from "@ui-sdk/solid/agent"
import { createRoot, createSignal, flush } from "solid-js"
import { expect, test, vi } from "vitest"
import { Canvas, CanvasInspector, CanvasToolbar, canvasBounds, createCanvasController, createCanvasHistory, type CanvasEdge, type CanvasNode } from "@/solid/src/canvas"
import { settle } from "./solid-bridge"

const shape = { inputs: [{ id: "in", label: "In" }], outputs: [{ id: "out", label: "Out" }] }
const nodes: CanvasNode[] = [
  { id: "a", title: "Source", x: 0, y: 0, ...shape },
  { id: "b", title: "Middle", x: 300, y: 0, ...shape },
  { id: "c", title: "Sink", x: 600, y: 0, inputs: [{ id: "in", label: "In" }, { id: "extra", label: "Extra" }] },
]
const edge = (from: string, to: string): CanvasEdge => ({ id: `${from}->${to}`, from, to })

function Demo(props: { edges?: CanvasEdge[]; onEdges?: (e: CanvasEdge[]) => void; onAdd?: boolean | "refuse"; locked?: (n: CanvasNode) => boolean }) {
  const [all, setAll] = createSignal(nodes)
  const [edges, setEdges] = createSignal(props.edges ?? [])
  return (
    <Canvas
      label="Flow"
      nodes={all()}
      onNodesChange={setAll}
      edges={edges()}
      onEdgesChange={(next) => {
        setEdges(next)
        props.onEdges?.(next)
      }}
      locked={props.locked}
      kinds={[{ id: "step", label: "Step" }]}
      onAddNode={
        props.onAdd === "refuse" ? () => null : props.onAdd ? (kind, at, title) => ({ id: "n", kind, title: title ?? "New step", ...at, ...shape }) : undefined
      }
      minimap={false}
    />
  )
}

const agentRun = async (action: string, ...args: unknown[]) => {
  const agent = createAgent()
  await settle()
  const result = await agent.act({ steps: [{ ref: "Flow", action, args }] })
  await settle()
  return result
}

test("the canvas is a group of named nodes, each a listbox option with its kind and ports", async () => {
  render(() => <Canvas label="Flow" defaultNodes={[{ ...nodes[0]!, kind: "step", color: 3 }]} kinds={[{ id: "step", label: "Step" }]} renderNode={() => "Reads the feed"} minimap={false} />)
  await settle()
  expect(screen.getByRole("group", { name: "Flow" }).getAttribute("aria-roledescription")).toBe("canvas")
  expect(screen.getByRole("listbox", { name: "Flow nodes" })).toBeTruthy()
  const source = screen.getByRole("option", { name: "Source Step" })
  expect(source.getAttribute("aria-roledescription")).toBe("node")
  expect(document.getElementById(source.getAttribute("aria-describedby")!)?.textContent).toBe("Reads the feed")
  expect([...source.querySelectorAll("[data-canvas-port]")].map((p) => p.getAttribute("data-canvas-port"))).toEqual(["in", "out"])
  expect(source.querySelector<HTMLElement>(".canvas-node-card")!.style.getPropertyValue("--series")).toBe("var(--chart-3)")
  expect(screen.getByRole("group", { name: "Zoom" })).toBeTruthy()
})

test("wires go output to input between two nodes, once; a new wire into an input replaces the old", async () => {
  const onEdges = vi.fn()
  render(() => <Demo edges={[edge("a:out:out", "c:in:in")]} onEdges={onEdges} />)
  await settle()
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
  // Each wire is drawn, with its own Disconnect mark, SVG through and through.
  expect(document.querySelectorAll('path[data-slot="canvas-wire"]:not([data-draft])')).toHaveLength(2)
  const marks = document.querySelectorAll('[data-slot="canvas-unwire"]')
  expect(marks).toHaveLength(2)
  expect(marks[0]!.namespaceURI).toBe("http://www.w3.org/2000/svg")
  expect(marks[0]!.querySelector("title")?.namespaceURI).toBe("http://www.w3.org/2000/svg")
})

test("a node names its wires in its description", async () => {
  render(() => <Demo edges={[edge("a:out:out", "b:in:in"), edge("b:out:out", "c:in:extra")]} />)
  await settle()
  const middle = screen.getByRole("option", { name: "Middle" })
  const description = document.getElementById(middle.getAttribute("aria-describedby")!)!.textContent
  expect(description).toBe("Inputs: In from Source Out. Outputs: Out to Sink Extra.")
})

test("C starts a wire from the focused node, and Escape drops it", async () => {
  const onEdges = vi.fn()
  render(() => <Demo onEdges={onEdges} />)
  await settle()
  const source = screen.getByRole("option", { name: "Source" })
  source.focus()
  fireEvent.keyDown(source, { key: "c", code: "KeyC" })
  await settle()
  expect(document.querySelector('[data-connect="source"]')).not.toBeNull()
  fireEvent.keyDown(source, { key: "Escape" })
  await settle()
  expect(document.querySelector('[data-connect="source"]')).toBeNull()
  expect(onEdges).not.toHaveBeenCalled()
})

test("agents can't move a locked node, name an unknown node, or add without onAddNode", async () => {
  render(() => <Demo locked={(n) => n.id === "b"} />)
  await settle()
  expect(screen.getByRole("option", { name: "Middle" }).hasAttribute("data-locked")).toBe(true)
  let result = await agentRun("moveNode", "Middle", 10, 10)
  expect(result.error?.message).toMatch(/locked/)
  result = await agentRun("moveNode", "Nobody", 10, 10)
  expect(result.error?.message).toMatch(/No node "Nobody". Nodes: Source, Middle, Sink/)
  result = await agentRun("addNode", "Step")
  expect(result.error?.message).toMatch(/doesn't add nodes/)
  result = await agentRun("openNode", "Source")
  expect(result.error?.message).toMatch(/doesn't open nodes/)
})

test("agents add a node of a known kind, at a point, and move one", async () => {
  render(() => <Demo onAdd />)
  await settle()
  let result = await agentRun("addNode", "Widget")
  expect(result.error?.message).toMatch(/No kind "Widget". Kinds: Step/)
  result = await agentRun("addNode", "Step", "Fetch", 40, 300)
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("option", { name: "Fetch Step" }).style.left).toBe("40px")
  result = await agentRun("moveNode", "Fetch", 80, 320)
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("option", { name: "Fetch Step" }).style.left).toBe("80px")
})

test("an added node is on the canvas before the call that added it returns", async () => {
  const controller = createCanvasController()
  function Flow() {
    const [all, setAll] = createSignal(nodes)
    return (
      <Canvas
        label="Flow"
        nodes={all()}
        onNodesChange={setAll}
        kinds={[{ id: "step", label: "Step" }]}
        onAddNode={(kind, at, title) => ({ id: "n", kind, title: title ?? "New step", ...at, ...shape })}
        controller={controller}
        minimap={false}
      />
    )
  }
  render(() => <Flow />)
  await settle()
  controller.addNode("step", "Fetch")
  expect(screen.queryByRole("option", { name: "Fetch Step" })).not.toBeNull()
})

test("an uncontrolled canvas keeps its own nodes and wires", async () => {
  const onNodesChange = vi.fn()
  render(() => <Canvas label="Flow" defaultNodes={nodes} defaultEdges={[edge("a:out:out", "b:in:in")]} onNodesChange={onNodesChange} minimap={false} />)
  await settle()
  const result = await agentRun("moveNode", "Sink", 640, 40)
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("option", { name: "Sink" }).style.top).toBe("40px")
  expect(onNodesChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ id: "c", x: 640, y: 40 })]), { reason: "imperative", type: "move" })
  // Delete removes a node with its wires.
  const source = screen.getByRole("option", { name: "Source" })
  source.focus()
  fireEvent.keyDown(source, { key: "Delete" })
  await settle()
  expect(screen.queryByRole("option", { name: "Source" })).toBeNull()
  expect(document.querySelectorAll('path[data-slot="canvas-wire"]:not([data-draft])')).toHaveLength(0)
})

test("the canvas frame is the tab stop only while it has no nodes", async () => {
  const { unmount } = render(() => <Canvas label="Empty" minimap={false} />)
  await settle()
  expect(screen.getByRole("group", { name: "Empty" }).getAttribute("tabindex")).toBe("0")
  unmount()
  render(() => <Demo />)
  await settle()
  expect(screen.getByRole("group", { name: "Flow" }).getAttribute("tabindex")).toBe("-1")
  const stops = screen.getAllByRole("option").filter((el) => el.tabIndex === 0)
  expect(stops).toHaveLength(1)
})

test("agents hear when the app refuses a node, and need both x and y", async () => {
  render(() => <Demo onAdd="refuse" />)
  await settle()
  let result = await agentRun("addNode", "Step")
  expect(result.error?.message).toMatch(/didn't add that node/)
  result = await agentRun("addNode", "Step", "Fetch", 40)
  expect(result.error?.message).toMatch(/both x and y/)
})

test("the minimap draws every node", async () => {
  render(() => <Canvas label="Flow" defaultNodes={nodes} />)
  await settle()
  const map = document.querySelector('svg[data-slot="canvas-minimap"]')!
  expect(map.querySelectorAll("rect.canvas-minimap-node")).toHaveLength(3)
  expect(map.querySelector('rect[data-slot="canvas-viewbox"]')).not.toBeNull()
  expect(canvasBounds(nodes)).toEqual({ left: 0, top: 0, right: 808, bottom: 100 })
})

// Solid applies a write at the next flush: the app reads these in JSX, so the tests flush.
test("history: removing a node takes its wires, and one undo brings both back", () => {
  createRoot((dispose) => {
    const history = createCanvasHistory({ nodes, edges: [edge("a:out:out", "b:in:in"), edge("b:out:out", "c:in:in")] })
    const step = (act: () => void) => {
      act()
      flush()
    }
    expect(history.canUndo).toBe(false)
    step(() => history.onNodesChange(nodes.filter((n) => n.id !== "b")))
    // The canvas reports the pruned wires as well; history keeps it one step.
    step(() => history.onEdgesChange([]))
    expect(history.nodes.map((n) => n.id)).toEqual(["a", "c"])
    expect(history.edges).toEqual([])
    expect(history.canUndo).toBe(true)
    step(() => history.undo())
    expect(history.nodes.map((n) => n.id)).toEqual(["a", "b", "c"])
    expect(history.edges).toHaveLength(2)
    expect(history.canRedo).toBe(true)
    step(() => history.redo())
    expect(history.nodes.map((n) => n.id)).toEqual(["a", "c"])
    dispose()
  })
})

test("history: a change that changes nothing isn't a step", () => {
  createRoot((dispose) => {
    const history = createCanvasHistory({ nodes, edges: [] })
    history.setNodes((all) => all.map((n) => ({ ...n })))
    history.onEdgesChange([])
    flush()
    expect(history.canUndo).toBe(false)
    history.setNodes((all) => all.map((n) => (n.id === "a" ? { ...n, title: "Origin" } : n)))
    flush()
    expect(history.canUndo).toBe(true)
    expect(history.nodes[0]!.title).toBe("Origin")
    dispose()
  })
})

test("the toolbar adds a node of a kind and focuses it, removes the selection, and undoes", async () => {
  const canvas = createCanvasController()
  function Flow() {
    const history = createCanvasHistory({ nodes, edges: [] })
    const [selected, setSelected] = createSignal<string[]>([])
    return (
      <>
        <CanvasToolbar
          canvas={canvas}
          kinds={[{ id: "step", label: "Step" }]}
          selectedCount={selected().length}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
        />
        <Canvas
          label="Flow"
          controller={canvas}
          nodes={history.nodes}
          edges={history.edges}
          onNodesChange={history.onNodesChange}
          onEdgesChange={history.onEdgesChange}
          selected={selected()}
          onSelectedChange={setSelected}
          kinds={[{ id: "step", label: "Step" }]}
          onAddNode={(kind, at, title) => ({ id: "n", kind, title: title ?? "New step", ...at, ...shape })}
          minimap={false}
        />
      </>
    )
  }
  render(() => <Flow />)
  await settle()
  const tools = screen.getByRole("toolbar", { name: "Canvas tools" })
  const remove = within(tools).getByRole("button", { name: "Remove node" })
  const undo = within(tools).getByRole("button", { name: "Undo" })
  expect(remove.getAttribute("aria-disabled")).toBe("true")
  expect(undo.getAttribute("aria-disabled")).toBe("true")
  expect(undo.getAttribute("aria-keyshortcuts")).toMatch(/Z/)
  fireEvent.click(within(tools).getByRole("button", { name: "Add node" }))
  fireEvent.click(await screen.findByRole("menuitem", { name: "Step" }))
  await settle()
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("option", { name: "New step Step" })))
  expect(undo.hasAttribute("aria-disabled")).toBe(false)
  fireEvent.keyDown(document.activeElement!, { key: " " })
  await settle()
  expect(remove.hasAttribute("aria-disabled")).toBe(false)
  fireEvent.click(remove)
  await settle()
  expect(screen.queryByRole("option", { name: "New step Step" })).toBeNull()
  fireEvent.click(undo)
  await settle()
  expect(screen.getByRole("option", { name: "New step Step" })).toBeTruthy()
})

test("the inspector names the node, renames it, lists its wires and hands focus on as they go", async () => {
  const canvas = createCanvasController()
  const onRename = vi.fn()
  function Flow() {
    const [edges, setEdges] = createSignal([edge("a:out:out", "b:in:in"), edge("b:out:out", "c:in:in")])
    const [shown, setShown] = createSignal<string | null>("b")
    const node = () => nodes.find((n) => n.id === shown()) ?? null
    return (
      <>
        <Canvas label="Flow" controller={canvas} defaultNodes={nodes} edges={edges()} onEdgesChange={setEdges} minimap={false} />
        <CanvasInspector node={node()} nodes={nodes} edges={edges()} canvas={canvas} onRename={onRename}>
          {(n) => <p class="fields">Fields of {n.title}</p>}
        </CanvasInspector>
        <button onClick={() => setShown(shown() === "b" ? "c" : null)}>Next</button>
      </>
    )
  }
  render(() => <Flow />)
  await settle()
  const inspector = () => document.querySelector<HTMLElement>(".canvas-inspector")!
  expect(within(inspector()).getByRole("heading", { level: 3 }).textContent).toBe("Middle")
  expect(inspector().querySelector(".fields")?.textContent).toBe("Fields of Middle")
  const title = within(inspector()).getByRole("textbox", { name: "Title" }) as HTMLInputElement
  title.value = "Hub"
  fireEvent.submit(within(inspector()).getByRole("form", { name: "Rename Middle" }))
  expect(onRename).toHaveBeenCalledWith(nodes[1], "Hub")
  const disconnects = within(inspector()).getAllByRole("button", { name: /^Disconnect/ })
  expect(disconnects.map((b) => b.getAttribute("aria-label"))).toEqual(["Disconnect Source · Out from Middle · In", "Disconnect Middle · Out from Sink · In"])
  fireEvent.click(disconnects[0]!)
  await settle()
  await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe("Disconnect Middle · Out from Sink · In"))
  fireEvent.click(document.activeElement!)
  await settle()
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("option", { name: "Middle" })))
  expect(inspector().textContent).toContain("No wires yet.")
  // Another node: every field starts over, yours too.
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  await settle()
  expect((within(inspector()).getByRole("textbox", { name: "Title" }) as HTMLInputElement).value).toBe("Sink")
  expect(inspector().querySelector(".fields")?.textContent).toBe("Fields of Sink")
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  await settle()
  expect(inspector().textContent).toBe("DetailsSelect a node to see its details.")
})

test("Enter opens the focused node, and agents open nodes by name", async () => {
  const onNodeOpen = vi.fn()
  render(() => <Canvas label="Flow" defaultNodes={nodes} onNodeOpen={onNodeOpen} minimap={false} />)
  await settle()
  const middle = screen.getByRole("option", { name: "Middle" })
  middle.focus()
  fireEvent.keyDown(middle, { key: "Enter" })
  expect(onNodeOpen).toHaveBeenLastCalledWith(nodes[1])
  const result = await agentRun("openNode", "Sink")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onNodeOpen).toHaveBeenLastCalledWith(nodes[2])
})

test("the toolbar counts the selection in its Remove button", async () => {
  render(() => <CanvasToolbar canvas={createCanvasController()} selectedCount={2} />)
  await settle()
  expect(screen.getByRole("button", { name: "Remove 2 nodes" }).getAttribute("data-agent-confirm")).toBe("Removes the selected nodes and their wires")
  expect(screen.queryByRole("button", { name: "Add node" })).toBeNull()
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
})

// A part's children given as a function are built again, whole, when something at their top
// changes (lint solid/part-children-once): the minimap coming or going rebuilt every node.
test("turning the minimap on or off keeps the nodes as they are", async () => {
  const [minimap, setMinimap] = createSignal(false)
  render(() => <Canvas label="Flow" defaultNodes={nodes} minimap={minimap()} />)
  await settle()
  const first = screen.getByRole("option", { name: /^Source/ })
  setMinimap(true)
  flush()
  await settle()
  expect(document.querySelector(".canvas-minimap")).toBeTruthy()
  expect(screen.getByRole("option", { name: /^Source/ })).toBe(first)
})
