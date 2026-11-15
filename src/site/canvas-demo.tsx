import { useState } from "react"
import {
  Canvas,
  CanvasInspector,
  CanvasToolbar,
  createCanvasController,
  useCanvasHistory,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeKind,
} from "@/registry/uiset/ui/canvas"
import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { Textarea } from "@/registry/uiset/ui/textarea"

// An agent workflow: a question goes to a prompt and a docs search, both feed a model,
// and its draft becomes the reply.
const kinds: CanvasNodeKind[] = [
  { id: "input", label: "Input" },
  { id: "prompt", label: "Prompt" },
  { id: "tool", label: "Tool" },
  { id: "model", label: "Model" },
  { id: "output", label: "Output" },
]

const shapes: Record<string, Pick<CanvasNode, "inputs" | "outputs" | "color">> = {
  input: { outputs: [{ id: "text", label: "Text" }], color: 1 },
  prompt: { inputs: [{ id: "question", label: "Question" }], outputs: [{ id: "prompt", label: "Prompt" }], color: 2 },
  tool: { inputs: [{ id: "query", label: "Query" }], outputs: [{ id: "results", label: "Results" }], color: 4 },
  model: {
    inputs: [
      { id: "prompt", label: "Prompt" },
      { id: "context", label: "Context" },
    ],
    outputs: [{ id: "text", label: "Text" }],
    color: 3,
  },
  output: { inputs: [{ id: "text", label: "Text" }], color: 5 },
}

const node = (id: string, kind: string, title: string, x: number, y: number, detail: string): CanvasNode => ({
  id,
  kind,
  title,
  x,
  y,
  ...shapes[kind],
  data: { detail },
})

const initialNodes: CanvasNode[] = [
  node("question", "input", "User question", 40, 150, "From the chat box"),
  node("template", "prompt", "Answer template", 320, 40, "Answer briefly, cite sources."),
  node("search", "tool", "Search docs", 320, 250, "Top 5 pages"),
  node("draft", "model", "Draft answer", 600, 130, "Fast model, temperature 0.2"),
  node("reply", "output", "Reply", 880, 160, "Sent to the chat"),
]
const wire = (from: string, to: string): CanvasEdge => ({ id: `${from}->${to}`, from, to })
const initialEdges: CanvasEdge[] = [
  wire("question:out:text", "template:in:question"),
  wire("question:out:text", "search:in:query"),
  wire("template:out:prompt", "draft:in:prompt"),
  wire("search:out:results", "draft:in:context"),
  wire("draft:out:text", "reply:in:text"),
]

function CanvasDemo() {
  const [canvas] = useState(createCanvasController)
  const history = useCanvasHistory({ nodes: initialNodes, edges: initialEdges })
  const [selected, setSelected] = useState<string[]>([])
  const focused = selected.length === 1 ? (history.nodes.find((n) => n.id === selected[0]) ?? null) : null

  return (
    <div className="canvas-demo">
      <CanvasToolbar
        canvas={canvas}
        kinds={kinds}
        selectedCount={selected.length}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />
      <Canvas
        label="Workflow"
        controller={canvas}
        nodes={history.nodes}
        edges={history.edges}
        onNodesChange={history.onNodesChange}
        onEdgesChange={history.onEdgesChange}
        selected={selected}
        onSelectedChange={setSelected}
        fitView
        kinds={kinds}
        onAddNode={(kind, at, title) => {
          const label = kinds.find((k) => k.id === kind)?.label ?? kind
          return { id: crypto.randomUUID().slice(0, 8), kind, title: title ?? `New ${label.toLowerCase()}`, ...at, ...shapes[kind], data: { detail: "" } }
        }}
        onNodeOpen={(n) => {
          setSelected([n.id])
          // Enter opens the node's details beside the canvas.
          requestAnimationFrame(() => document.getElementById("canvas-demo-detail")?.focus())
        }}
        renderNode={(n) => (n.data?.detail ? String(n.data.detail) : null)}
        onUndo={history.undo}
        onRedo={history.redo}
      />
      <CanvasInspector
        node={focused}
        nodes={history.nodes}
        edges={history.edges}
        canvas={canvas}
        onRename={(n, title) => history.setNodes((all) => all.map((x) => (x.id === n.id ? { ...x, title } : x)))}
      >
        {(n) => (
          <form
            aria-label={`Details of ${n.title}`}
            onSubmit={(event) => event.preventDefault()}
          >
            <Field name="node-detail">
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                id="canvas-demo-detail"
                defaultValue={String(n.data?.detail ?? "")}
                autoResize
                onBlur={(event) => {
                  const detail = event.currentTarget.value
                  if (detail !== n.data?.detail)
                    history.setNodes((all) => all.map((x) => (x.id === n.id ? { ...x, data: { ...x.data, detail } } : x)))
                }}
              />
            </Field>
          </form>
        )}
      </CanvasInspector>
    </div>
  )
}

export { CanvasDemo }
