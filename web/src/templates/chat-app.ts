// The Chat app page as web elements: chats on the side, the conversation, and a composer with
// commands, mentions, attachments, a model picker and usage. It streams from the React
// template's stand-in model (templates/chat-app-sample.ts); plug in yours as an `Assistant`.
// Its events become the chat's message parts here, the shape AI SDK's useChat holds, so
// useChat's `messages` and `status` could go into <uiset-chat> as they are instead.
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
  type AssistantToolStatus,
} from "@/registry/uiset/ui/templates/chat-app-sample"
import type { ChatMessage, ChatPart, ComposerItem, Feedback, Model, Thread } from "../chat"
import { attr } from "../dom"
import "./common"

const assistant: Assistant = sampleAssistant
const userName = "You"

type Chat = HTMLElement & { messages: ChatMessage[]; status: string; suggestions: string[]; feedback: Record<string, Feedback> }
type Composer = HTMLElement & { commands: ComposerItem[]; mentions: ComposerItem[] }
type Threads = HTMLElement & { threads: Thread[] }
type Picker = HTMLElement & { models: Model[]; value: string }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const chat = $<Chat>("chat")
const composer = $<Composer>("composer")
const threadsEl = $<Threads>("threads")
const picker = $<Picker>("model")
const usage = $("usage")

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

function render() {
  chat.messages = conversations.get(active) ?? []
  chat.status = running?.thread === active ? running.status : "ready"
  chat.feedback = feedback.get(active) ?? {}
  composer.toggleAttribute("running", running !== null)
  threadsEl.threads = threads
  attr(threadsEl, "value", active)
  attr(usage, "used", String(used.get(active) ?? 0))
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

/** An answer as it streams: reasoning, tool calls, text and sources, as message parts. */
class Answer {
  reasoning?: { text: string; done: boolean; seconds?: number }
  tools: { id: string; name: string; title?: string; status: AssistantToolStatus; input?: unknown; output?: unknown }[] = []
  text = ""
  sources: { href: string; title: string }[] = []

  apply(event: AssistantEvent) {
    if (event.type === "text") this.text += event.delta
    else if (event.type === "reasoning") this.reasoning = { text: (this.reasoning?.text ?? "") + event.delta, done: false }
    else if (event.type === "reasoning-end") this.reasoning = { text: this.reasoning?.text ?? "", done: true, seconds: event.seconds }
    else if (event.type === "tool") {
      const { type: _type, ...tool } = event
      const known = this.tools.findIndex((t) => t.id === tool.id)
      if (known >= 0) this.tools[known] = tool
      else this.tools.push(tool)
    } else if (event.type === "sources") this.sources = event.sources
  }

  parts(streaming: boolean): ChatPart[] {
    const state = streaming ? "streaming" : "done"
    return [
      ...(this.reasoning ? [{ type: "reasoning", text: this.reasoning.text, state: this.reasoning.done || !streaming ? "done" : "streaming", seconds: this.reasoning.seconds } as ChatPart] : []),
      ...this.tools.map((tool) => ({ type: `tool-${tool.name}`, toolName: tool.name, title: tool.title, state: toolState[tool.status], input: tool.input, output: tool.output })),
      ...(this.text ? [{ type: "text", text: this.text, state } as ChatPart] : []),
      ...this.sources.map((source) => ({ type: "source-url", url: source.href, title: source.title }) as ChatPart),
    ]
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
    const parts = answer.parts(streaming)
    if (parts.length) put(thread, { id, role: "assistant", name: "Assistant", avatar: { fallback: "AI" }, parts })
  }
  try {
    for await (const event of assistant({ text, files, model: picker.value, history, signal: abort.signal })) {
      answer.apply(event)
      running.status = "streaming"
      show(true)
      render()
    }
  } catch {
    // Stopping on purpose isn't a failure.
    if (!abort.signal.aborted) answer.text += "\n\n*The answer stopped early. Try again.*"
  } finally {
    show(false)
    used.set(thread, (used.get(thread) ?? 0) + estimateTokens(text))
    running = null
    render()
  }
}

composer.addEventListener("send", (event) => {
  const { text, files } = (event as CustomEvent<{ text: string; files: FileList }>).detail
  void send(text || "Look at these files", [...files])
})
composer.addEventListener("stop", () => running?.abort.abort())
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
