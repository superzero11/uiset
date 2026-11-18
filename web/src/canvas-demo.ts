// The Canvas demo's own script: an agent workflow, as an app would wire it. A question goes
// to a prompt and a docs search, both feed a model, and its draft becomes the reply.
import { createAgent } from "@ui-sdk/web/agent"
import type { CanvasEdge, CanvasNodeKind } from "@/registry/uiset/ui/canvas/canvas"
import type { CanvasElement, CanvasNode } from "./canvas"

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

const node = (id: string, kind: string, title: string, x: number, y: number, detail: string): CanvasNode => ({ id, kind, title, x, y, ...shapes[kind], data: { detail } })
const wire = (from: string, to: string): CanvasEdge => ({ id: `${from}->${to}`, from, to })

const canvas = document.getElementById("workflow") as CanvasElement
canvas.kinds = kinds
canvas.nodes = [
  node("question", "input", "User question", 40, 150, "From the chat box"),
  node("template", "prompt", "Answer template", 320, 40, "Answer briefly, cite sources."),
  node("search", "tool", "Search docs", 320, 250, "Top 5 pages"),
  node("draft", "model", "Draft answer", 600, 130, "Fast model, temperature 0.2"),
  node("reply", "output", "Reply", 880, 160, "Sent to the chat"),
]
canvas.edges = [
  wire("question:out:text", "template:in:question"),
  wire("question:out:text", "search:in:query"),
  wire("template:out:prompt", "draft:in:prompt"),
  wire("search:out:results", "draft:in:context"),
  wire("draft:out:text", "reply:in:text"),
]
canvas.createNode = (kind, at, title) => {
  const label = kinds.find((k) => k.id === kind)?.label ?? kind
  return { id: crypto.randomUUID().slice(0, 8), kind, title: title ?? `New ${label.toLowerCase()}`, ...at, ...shapes[kind], data: { detail: "" } }
}
canvas.renderNode = (n) => (n.data?.detail ? String(n.data.detail) : null)

// Enter opens the node's details beside the canvas.
canvas.addEventListener("open", (event) => {
  const id = (event as CustomEvent<{ value: string }>).detail.value
  ;(canvas as unknown as { api: { select: (...ids: string[]) => boolean } }).api.select(id)
  // The inspector redraws for the node in a microtask; its field takes focus right after.
  queueMicrotask(() => document.querySelector<HTMLElement>("uiset-canvas-inspector textarea")?.focus())
})

// The inspector's own field: notes on the node, saved as focus leaves.
const inspector = document.querySelector("uiset-canvas-inspector") as HTMLElement & { renderFields: (n: CanvasNode) => Node }
inspector.renderFields = (n) => {
  const form = document.createElement("form")
  form.setAttribute("aria-label", `Details of ${n.title}`)
  form.addEventListener("submit", (event) => event.preventDefault())
  form.innerHTML = `<ui-field name="node-detail"><ui-field-label>Notes</ui-field-label><ui-textarea auto-resize><textarea></textarea></ui-textarea></ui-field>`
  const textarea = form.querySelector("textarea")!
  textarea.value = String(n.data?.detail ?? "")
  textarea.addEventListener("blur", () => {
    if (textarea.value !== n.data?.detail) canvas.updateNode?.(n.id, { data: { ...n.data, detail: textarea.value } })
  })
  return form
}

Object.assign(window, { agent: createAgent() })
