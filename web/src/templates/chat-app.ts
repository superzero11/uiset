// The Chat app page as web elements: chats on the side, the conversation, and a composer with
// commands, mentions, attachments, a model picker and usage. It streams from the React
// template's stand-in model (templates/chat-app-sample.ts); plug in yours as an `Assistant`.
// Its events become the chat's message parts here, the shape AI SDK's useChat holds, so
// useChat's `messages` and `status` could go into <uiset-chat> as they are instead. An agent's
// checkpoints, subagent runs and tool calls waiting for a person come as events too, and what's
// written while an answer runs is queued and sent when it's done.
import { createAgent } from "@ui-sdk/web/agent"
import {
  estimateTokens,
  sampleAssistant,
  sampleCommands,
  sampleMentions,
  sampleModels,
  sampleSuggestions,
  type Assistant,
  type AssistantEvent,
  type AssistantTool,
  type AssistantToolStatus,
} from "@/registry/uiset/ui/templates/chat-app-sample"
import type { ChatMessage, ChatPart, ComposerItem, Feedback, Model, Thread } from "../chat"
import { attr } from "../dom"
import "./common"

const assistant: Assistant = sampleAssistant
const userName = "You"

type Chat = HTMLElement & { messages: ChatMessage[]; status: string; suggestions: string[]; feedback: Record<string, Feedback> }
type Composer = HTMLElement & { commands: ComposerItem[]; mentions: ComposerItem[] }
type Queue = HTMLElement & { items: { id: string; text: string }[] }
type Threads = HTMLElement & { threads: Thread[] }
type Picker = HTMLElement & { models: Model[]; value: string }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const chat = $<Chat>("chat")
const composer = $<Composer>("composer")
const threadsEl = $<Threads>("threads")
const picker = $<Picker>("model")
const usage = $("usage")
const queueEl = $<Queue>("queue")

picker.models = sampleModels
composer.commands = sampleCommands
composer.mentions = sampleMentions
chat.suggestions = sampleSuggestions

let next = 1
let nextChat = 2
// Untitled chats get numbers, so no two chats (or their menus) share a name.
const untitled = (): Thread => ({ id: `chat-${nextChat}`, title: `Untitled chat ${nextChat++}`, updatedAt: new Date() })
let threads: Thread[] = [{ id: "chat-1", title: "Untitled chat 1", updatedAt: new Date() }]
let active = "chat-1"
const conversations = new Map<string, ChatMessage[]>([["chat-1", []]])
const feedback = new Map<string, Record<string, Feedback>>()
const used = new Map<string, number>()
// One answer at a time: Retry or a suggestion waits for Stop.
let running: { thread: string; abort: AbortController; status: "submitted" | "streaming" } | null = null
// Tool calls waiting for a person, by id: Allow and Deny settle them, stopping denies them.
const approvals = new Map<string, (allowed: boolean) => void>()
// What was written while an answer ran, per chat. Stop holds it until Send now.
const queues = new Map<string, { id: string; text: string }[]>()
let held = false
let nextQueued = 1
// Answers cut back to a checkpoint while streaming: what they still send is dropped.
const restored = new Set<string>()

function render() {
  chat.messages = conversations.get(active) ?? []
  chat.status = running?.thread === active ? running.status : "ready"
  chat.feedback = feedback.get(active) ?? {}
  composer.toggleAttribute("running", running !== null)
  threadsEl.threads = threads
  attr(threadsEl, "value", active)
  attr(usage, "used", String(used.get(active) ?? 0))
  queueEl.items = queues.get(active) ?? []
}

/** The next queued message goes once nothing is running, unless Stop held the queue. */
function sendQueued() {
  const [first, ...rest] = queues.get(active) ?? []
  if (running || held || !first) return
  queues.set(active, rest)
  void send(first.text)
}

const textOf = (message: ChatMessage) =>
  message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n")

// The sample's tool states, as AI SDK names them.
const toolState: Record<AssistantToolStatus, string> = {
  pending: "input-streaming",
  running: "input-available",
  approval: "approval-requested",
  done: "output-available",
  error: "output-error",
  denied: "output-denied",
}

const toolPart = ({ id, name, title, status, input, output }: AssistantTool) =>
  ({ type: `tool-${name}`, toolCallId: id, toolName: name, title, state: toolState[status], input, output }) as ChatPart

/** An answer as it streams, as message parts in the order they came. */
class Answer {
  parts: ChatPart[] = []

  apply(event: AssistantEvent) {
    const last = this.parts.at(-1)
    const at = (same: (p: ChatPart) => boolean, part: ChatPart) => {
      const i = this.parts.findIndex(same)
      if (i >= 0) this.parts[i] = part
      else this.parts.push(part)
    }
    if (event.type === "text") {
      if (last?.type === "text") (last as { text: string }).text += event.delta
      else this.parts.push({ type: "text", text: event.delta, state: "streaming" })
    } else if (event.type === "reasoning") {
      if (last?.type === "reasoning" && (last as { state?: string }).state === "streaming") (last as { text: string }).text += event.delta
      else this.parts.push({ type: "reasoning", text: event.delta, state: "streaming" })
    } else if (event.type === "reasoning-end") {
      for (const p of this.parts) if (p.type === "reasoning" && (p as { state?: string }).state === "streaming") Object.assign(p, { state: "done", seconds: event.seconds })
    } else if (event.type === "tool") {
      const { type: _type, ...tool } = event
      at((p) => (p as { toolCallId?: string }).toolCallId === tool.id, toolPart(tool))
    } else if (event.type === "sources") this.parts.push(...event.sources.map((s) => ({ type: "source-url", url: s.href, title: s.title }) as ChatPart))
    else if (event.type === "checkpoint") this.parts.push({ type: "checkpoint", id: event.id, label: event.label, time: new Date() })
    else if (event.type === "subagent") {
      const { type: _type, steps = [], ...run } = event
      const inner = steps.map((step): ChatPart => {
        if (step.type === "text") return { type: "text", text: step.text }
        const { type: _t, ...tool } = step
        return toolPart(tool)
      })
      at((p) => p.type === "subagent" && (p as { id: string }).id === run.id, { type: "subagent", ...run, parts: inner })
    }
  }

  /** A copy for the chat; done, every text and thought is complete. */
  snapshot(streaming: boolean): ChatPart[] {
    return this.parts.map((p) => (!streaming && (p.type === "text" || p.type === "reasoning") ? { ...p, state: "done" } : { ...p }) as ChatPart)
  }
}

function put(thread: string, message: ChatMessage) {
  // A chat deleted while its answer streamed takes nothing more.
  const list = conversations.get(thread)
  if (!list) return
  conversations.set(thread, list.some((m) => m.id === message.id) ? list.map((m) => (m.id === message.id ? message : m)) : [...list, message])
}

async function send(text: string, files: File[] = []) {
  if (running) return
  const thread = active
  const abort = new AbortController()
  running = { thread, abort, status: "submitted" }
  const history = (conversations.get(thread) ?? []).map((m) => ({ from: m.role === "user" ? ("user" as const) : ("assistant" as const), text: textOf(m) }))
  put(thread, {
    id: `m${next++}`,
    role: "user",
    name: userName,
    parts: [{ type: "text", text }, ...files.map((file) => ({ type: "file", mediaType: file.type || "application/octet-stream", url: URL.createObjectURL(file), filename: file.name }) as ChatPart)],
  })
  // A new chat takes its name from what was asked first.
  threads = threads.map((t) => (t.id === thread ? { ...t, title: t.title.startsWith("Untitled chat") ? text.slice(0, 40) : t.title, updatedAt: new Date() } : t))
  render()
  const id = `m${next++}`
  const answer = new Answer()
  const show = (streaming: boolean) => {
    if (restored.has(id)) return
    const parts = answer.snapshot(streaming)
    if (parts.length) put(thread, { id, role: "assistant", name: "Assistant", avatar: { fallback: "AI" }, parts })
  }
  abort.signal.addEventListener("abort", () => {
    for (const settle of approvals.values()) settle(false)
    approvals.clear()
  })
  const approval = (toolId: string) =>
    abort.signal.aborted ? Promise.resolve(false) : new Promise<boolean>((resolve) => approvals.set(toolId, resolve))
  try {
    for await (const event of assistant({ text, files, model: picker.value, history, signal: abort.signal, approval })) {
      answer.apply(event)
      running.status = "streaming"
      show(true)
      render()
    }
  } catch {
    // Stopping on purpose isn't a failure.
    if (!abort.signal.aborted) answer.apply({ type: "text", delta: "\n\n*The answer stopped early. Try again.*" })
  } finally {
    show(false)
    used.set(thread, (used.get(thread) ?? 0) + estimateTokens(text))
    running = null
    render()
    sendQueued()
  }
}

composer.addEventListener("send", (event) => {
  const { text, files } = (event as CustomEvent<{ text: string; files: FileList }>).detail
  held = false
  void send(text || "Look at these files", [...files])
})
composer.addEventListener("stop", () => {
  held = true
  running?.abort.abort()
})
composer.addEventListener("queue", (event) => {
  const { text } = (event as CustomEvent<{ text: string }>).detail
  if (!text) return
  queues.set(active, [...(queues.get(active) ?? []), { id: `queued-${nextQueued++}`, text }])
  render()
})
queueEl.addEventListener("remove", (event) => {
  const id = (event as CustomEvent<{ value: string }>).detail.value
  queues.set(active, (queues.get(active) ?? []).filter((m) => m.id !== id))
  render()
})
queueEl.addEventListener("send", (event) => {
  // Send now: it goes first, and the answer running now stops for it.
  const id = (event as CustomEvent<{ value: string }>).detail.value
  const list = queues.get(active) ?? []
  queues.set(active, [...list.filter((m) => m.id === id), ...list.filter((m) => m.id !== id)])
  held = false
  if (running) running.abort.abort()
  else sendQueued()
})
chat.addEventListener("approve", (event) => {
  // A tool call waiting for a person: their answer goes to the assistant, and shows at once.
  const { value: allowed, id, part } = (event as CustomEvent<{ value: boolean; id: string; part: number }>).detail
  const message = (conversations.get(active) ?? []).find((m) => m.id === id)
  const tool = message?.parts[part] as { toolCallId?: string; state?: string } | undefined
  if (!message || !tool?.toolCallId) return
  approvals.get(tool.toolCallId)?.(allowed)
  approvals.delete(tool.toolCallId)
  put(active, { ...message, parts: message.parts.map((p, i) => (i === part ? ({ ...p, state: allowed ? "approval-responded" : "output-denied" } as ChatPart) : p)) })
  render()
})
chat.addEventListener("restore", (event) => {
  // Back to a checkpoint: its answer up to it, and nothing after.
  const { id, part } = (event as CustomEvent<{ value: string; id: string; part: number }>).detail
  restored.add(id)
  if (running?.thread === active) running.abort.abort()
  const list = conversations.get(active) ?? []
  const at = list.findIndex((m) => m.id === id)
  if (at < 0) return
  conversations.set(active, [...list.slice(0, at), { ...list[at]!, parts: list[at]!.parts.slice(0, part + 1) }])
  render()
})
chat.addEventListener("suggestion", (event) => void send((event as CustomEvent<{ value: string }>).detail.value))
chat.addEventListener("retry", (event) => {
  // Retry asks the question before that answer again.
  const id = (event as CustomEvent<{ value: string }>).detail.value
  const list = conversations.get(active) ?? []
  // From an error before any answer, there's no answer id: the last question goes again.
  const at = list.findIndex((m) => m.id === id)
  const question = (at < 0 ? list : list.slice(0, at)).findLast((m) => m.role === "user")
  void send(question ? textOf(question) : "Try again")
})
chat.addEventListener("feedbackchange", (event) => {
  const { value, id } = (event as CustomEvent<{ value: Feedback | null; id: string }>).detail
  const all = { ...feedback.get(active) }
  if (value) all[id] = value
  else delete all[id]
  feedback.set(active, all)
  render()
})

threadsEl.addEventListener("valuechange", (event) => {
  active = (event as CustomEvent<{ value: string }>).detail.value
  render()
})
threadsEl.addEventListener("new", () => {
  const thread = untitled()
  threads = [thread, ...threads]
  conversations.set(thread.id, [])
  active = thread.id
  render()
  composer.focus()
})
threadsEl.addEventListener("rename", (event) => {
  const { value, title } = (event as CustomEvent<{ value: string; title: string }>).detail
  threads = threads.map((t) => (t.id === value ? { ...t, title } : t))
  render()
})
threadsEl.addEventListener("delete", (event) => {
  const id = (event as CustomEvent<{ value: string }>).detail.value
  // An answer streaming into the deleted chat stops.
  if (running?.thread === id) running.abort.abort()
  threads = threads.filter((t) => t.id !== id)
  // Its attachments' object URLs go with it.
  for (const message of conversations.get(id) ?? [])
    for (const part of message.parts) if (part.type === "file" && (part as { url: string }).url.startsWith("blob:")) URL.revokeObjectURL((part as { url: string }).url)
  conversations.delete(id)
  // There is always a chat to type into: deleting the last one starts a new one.
  if (!threads.length) {
    const thread = untitled()
    threads = [thread]
    conversations.set(thread.id, [])
  }
  if (id === active || !threads.some((t) => t.id === active)) active = threads[0]!.id
  render()
})

render()
Object.assign(window, { agent: createAgent() })
