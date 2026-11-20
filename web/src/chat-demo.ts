// The Chat demo's own script: a pretend model that streams markdown, thinks, calls a tool and
// cites sources, so every part shows. Asked to fix something, it works as an agent: a
// checkpoint, a subagent's run, and a deploy that waits for Allow. What's written meanwhile is
// queued. An app would wire AI SDK's useChat here instead: its `messages` and `status` go
// straight in.
import { createAgent } from "@ui-sdk/web/agent"
import type { ChatMessage, ChatPart, Thread } from "./chat"

type Chat = HTMLElement & { messages: ChatMessage[]; status: string; suggestions: string[] }
type Composer = HTMLElement & { commands: { value: string; label: string; description?: string }[] }
type Queue = HTMLElement & { items: { id: string; text: string }[] }

const chat = document.getElementById("chat") as Chat
const composer = document.getElementById("composer") as Composer
const threadsEl = document.getElementById("threads") as HTMLElement & { threads: Thread[] }
const queueEl = document.getElementById("queue") as Queue

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
// What was written while an answer ran; Stop holds it until Send now.
let queue: { id: string; text: string }[] = []
let held = false
// Tool calls waiting for Allow or Deny, and answers cut back to a checkpoint.
const pending = new Map<string, (allowed: boolean) => void>()
const cut = new Set<string>()
const render = () => {
  chat.messages = messages
  chat.status = status
  composer.toggleAttribute("running", status === "submitted" || status === "streaming")
  queueEl.items = queue
}
chat.suggestions = ["What's left before the release?", "Write the changelog", "Fix the date format and deploy a preview"]

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

const ask = (text: string) => {
  held = false
  messages = [...messages, { id: `m${next++}`, role: "user", parts: [{ type: "text", text }] }]
  void (/\b(fix|deploy)\b/i.test(text) ? agentReply() : reply())
}

function done() {
  status = "ready"
  render()
  const [first, ...rest] = queue
  if (held || !first) return
  queue = rest
  ask(first.text)
}

/** An agent's turn: a checkpoint, a subagent's research, then a deploy that waits for a person. */
async function agentReply() {
  stopped = false
  status = "submitted"
  render()
  await wait(300)
  const id = `m${next++}`
  const deploy = `deploy-${id}`
  const parts: ChatPart[] = [
    { type: "checkpoint", id: `cp-${id}`, label: "Before the fix", time: new Date() },
    { type: "subagent", id: `sub-${id}`, name: "Researcher", task: "Find where the date format comes from", status: "running", parts: [] },
  ]
  const show = () => {
    if (cut.has(id)) return
    const message: ChatMessage = { id, role: "assistant", parts: [...parts] }
    messages = messages.some((m) => m.id === id) ? messages.map((m) => (m.id === id ? message : m)) : [...messages, message]
    render()
  }
  status = "streaming"
  show()
  await wait(900)
  if (stopped || cut.has(id)) return done()
  parts[1] = {
    type: "subagent",
    id: `sub-${id}`,
    name: "Researcher",
    task: "Find where the date format comes from",
    status: "done",
    seconds: 4,
    parts: [
      { type: "tool-searchCode", title: "Searched the code", state: "output-available", input: { query: "toLocaleDateString" }, output: { files: ["src/date.ts"] } },
      { type: "text", text: "It's `formatDate` in `src/date.ts`, which ignores the locale." },
    ],
  }
  parts.push({ type: "text", text: "`formatDate` now takes the locale. Deploying a preview is outside the sandbox, so it needs your yes.", state: "done" })
  parts.push({ type: "tool-deployPreview", toolCallId: deploy, title: "Deploy a preview", state: "approval-requested", input: { branch: "fix/date-locale" } } as ChatPart)
  show()
  const allowed = await new Promise<boolean>((resolve) => pending.set(deploy, resolve))
  pending.delete(deploy)
  if (stopped || cut.has(id)) return done()
  const tool = parts.length - 1
  if (!allowed) {
    parts[tool] = { ...parts[tool]!, state: "output-denied" } as ChatPart
    parts.push({ type: "text", text: "Okay, no preview. The fix is on the branch when you want one.", state: "done" })
    show()
    return done()
  }
  parts[tool] = { ...parts[tool]!, state: "approval-responded" } as ChatPart
  show()
  await wait(900)
  if (cut.has(id)) return done()
  parts[tool] = { ...parts[tool]!, state: "output-available", output: { url: "https://fix-date-locale.preview.example.com" } } as ChatPart
  parts.push({ type: "text", text: "The preview is up: https://fix-date-locale.preview.example.com", state: "done" })
  show()
  done()
}

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
  done()
}

const stop = () => {
  stopped = true
  for (const settle of pending.values()) settle(false)
}
composer.addEventListener("send", (e) => ask((e as CustomEvent<{ text: string }>).detail.text))
composer.addEventListener("stop", () => {
  held = true
  stop()
})
composer.addEventListener("queue", (e) => {
  const { text } = (e as CustomEvent<{ text: string }>).detail
  if (!text) return
  queue = [...queue, { id: `q${next++}`, text }]
  render()
})
queueEl.addEventListener("remove", (e) => {
  queue = queue.filter((m) => m.id !== (e as CustomEvent<{ value: string }>).detail.value)
  render()
})
queueEl.addEventListener("send", (e) => {
  // Send now: it goes first, and the answer running now stops for it.
  const id = (e as CustomEvent<{ value: string }>).detail.value
  queue = [...queue.filter((m) => m.id === id), ...queue.filter((m) => m.id !== id)]
  held = false
  if (status === "ready") done()
  else stop()
})
chat.addEventListener("approve", (e) => {
  const { value, id, part } = (e as CustomEvent<{ value: boolean; id: string; part: number }>).detail
  const tool = messages.find((m) => m.id === id)?.parts[part] as { toolCallId?: string } | undefined
  if (tool?.toolCallId) pending.get(tool.toolCallId)?.(value)
})
chat.addEventListener("restore", (e) => {
  // Back to a checkpoint: its answer up to it, and nothing after.
  const { id, part } = (e as CustomEvent<{ value: string; id: string; part: number }>).detail
  const at = messages.findIndex((m) => m.id === id)
  if (at < 0) return
  cut.add(id)
  stop()
  messages = [...messages.slice(0, at), { ...messages[at]!, parts: messages[at]!.parts.slice(0, part + 1) }]
  render()
})
chat.addEventListener("suggestion", (e) => ask((e as CustomEvent<{ value: string }>).detail.value))
chat.addEventListener("retry", (e) => {
  const id = (e as CustomEvent<{ value: string }>).detail.value
  messages = messages.filter((m) => m.id !== id)
  void reply()
})

render()
Object.assign(window, { agent: createAgent() })
