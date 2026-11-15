// The Chat demo's own script: a pretend model that streams markdown, thinks, calls a tool
// that needs approval, and cites sources, so every part shows. An app would wire AI SDK's
// useChat here instead: its `messages` and `status` go straight in.
import { createAgent } from "@ui-sdk/web/agent"
import type { ChatMessage, ChatPart, Thread } from "./chat"

type Chat = HTMLElement & { messages: ChatMessage[]; status: string; suggestions: string[] }
type Composer = HTMLElement & { commands: { value: string; label: string; description?: string }[] }

const chat = document.getElementById("chat") as Chat
const composer = document.getElementById("composer") as Composer
const threadsEl = document.getElementById("threads") as HTMLElement & { threads: Thread[] }

let threads: Thread[] = [
  { id: "t1", title: "Release checklist", updatedAt: new Date(Date.now() - 5 * 60000) },
  { id: "t2", title: "Pricing page copy", updatedAt: new Date(Date.now() - 3 * 3600000) },
]
threadsEl.threads = threads
threadsEl.addEventListener("valuechange", (e) => console.info(`Open chat ${(e as CustomEvent<{ value: string }>).detail.value}`))
threadsEl.addEventListener("rename", (e) => {
  const { value, title } = (e as CustomEvent<{ value: string; title: string }>).detail
  threads = threads.map((t) => (t.id === value ? { ...t, title } : t))
  threadsEl.threads = threads
})
threadsEl.addEventListener("delete", (e) => {
  threads = threads.filter((t) => t.id !== (e as CustomEvent<{ value: string }>).detail.value)
  threadsEl.threads = threads
})
threadsEl.addEventListener("new", () => {
  const id = `t${Date.now()}`
  threads = [{ id, title: "New chat", updatedAt: new Date() }, ...threads]
  threadsEl.threads = threads
  threadsEl.setAttribute("value", id)
  messages = []
  render()
})

// The menu puts the "/" in front: labels are the words after it.
composer.commands = [
  { value: "summarize", label: "summarize", description: "Sum up the conversation" },
  { value: "plan", label: "plan", description: "Make a step-by-step plan" },
]

let messages: ChatMessage[] = []
let status = "ready"
let next = 1
const render = () => {
  chat.messages = messages
  chat.status = status
  composer.toggleAttribute("running", status === "submitted" || status === "streaming")
}
chat.suggestions = ["What's left before the release?", "Write the changelog"]

const answer = `Here's what's left before **Friday**:

1. Freeze the API and tag \`v1.4.0\`
2. Run the migration on staging
3. Publish the changelog

\`\`\`ts
await release({ tag: "v1.4.0", notes: changelog })
\`\`\`

| Step | Owner |
| --- | --- |
| Tag | Grace |
| Migrate | Ada |`

let stopped = false
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function reply() {
  stopped = false
  status = "submitted"
  render()
  await wait(300)
  const id = `m${next++}`
  const parts: ChatPart[] = [{ type: "reasoning", text: "Checking the release board and the open pull requests.", state: "streaming" }]
  messages = [...messages, { id, role: "assistant", parts }]
  status = "streaming"
  render()
  await wait(300)
  parts[0] = { type: "reasoning", text: "Checked the release board and the open pull requests.", state: "done", seconds: 2 }
  parts.push({ type: "tool-searchIssues", title: "Search issues", state: "output-available", input: { label: "release" }, output: { open: 3 } })
  // Stream the answer a few words at a time.
  const words = answer.split(/(?<=\s)/)
  parts.push({ type: "text", text: "", state: "streaming" })
  for (let i = 0; i < words.length && !stopped; i += 6) {
    parts[parts.length - 1] = { type: "text", text: words.slice(0, i + 6).join(""), state: "streaming" }
    messages = messages.map((m) => (m.id === id ? { ...m, parts: [...parts] } : m))
    render()
    await wait(30)
  }
  parts[parts.length - 1] = { type: "text", text: stopped ? (parts.at(-1) as { text: string }).text : answer, state: "done" }
  parts.push({ type: "source-url", url: "https://example.com/release-board", title: "Release board" })
  messages = messages.map((m) => (m.id === id ? { ...m, parts: [...parts] } : m))
  status = "ready"
  render()
}

composer.addEventListener("send", (e) => {
  const { text } = (e as CustomEvent<{ text: string }>).detail
  messages = [...messages, { id: `m${next++}`, role: "user", parts: [{ type: "text", text }] }]
  void reply()
})
composer.addEventListener("stop", () => (stopped = true))
chat.addEventListener("suggestion", (e) => {
  const text = (e as CustomEvent<{ value: string }>).detail.value
  messages = [...messages, { id: `m${next++}`, role: "user", parts: [{ type: "text", text }] }]
  void reply()
})
chat.addEventListener("retry", (e) => {
  const id = (e as CustomEvent<{ value: string }>).detail.value
  messages = messages.filter((m) => m.id !== id)
  void reply()
})

render()
Object.assign(window, { agent: createAgent() })
