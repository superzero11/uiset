import type { AgentStep as BridgeStep } from "@ui-sdk/react/agent"
import { elementOf } from "@ui-sdk/react/observe"
import { useRef, useState, useSyncExternalStore } from "react"
import {
  AgentActivity,
  AgentApprovals,
  AgentConsole,
  AgentSnapshot,
  AgentStep,
  type AgentStepStatus,
} from "@/registry/uiset/ui/agent-console"
import { ChatMessage, ChatSuggestions, ChatThread } from "@/registry/uiset/ui/chat"
import { ChatComposer } from "@/registry/uiset/ui/chat-composer"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { agent, approvals, history } from "./agent"
import { plan } from "./demo-agent"

type Step = { say: string; status: AgentStepStatus; note?: string }
type Message = {
  id: number
  from: "you" | "agent"
  text: string
  steps: Step[]
  streaming: boolean
}

const suggestions = [
  "Make it public and move it to Europe",
  "Turn on the weekly digest",
  "Rename it to Atlas",
  "Delete the project",
  "Undo that",
]

const help =
  "I can rename the project, change its visibility or region, turn the weekly digest or deploy on push on or off, save it, or delete it. I'll ask you before anything destructive. Try “make it public and move it to Europe”."

const within = () => document.getElementById("project-settings")
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function ConsoleDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: "agent",
      text: "Hi. Tell me what to change in the project settings.",
      steps: [],
      streaming: false,
    },
  ])
  const [running, setRunning] = useState(false)
  const stopped = useRef(false)
  const nextId = useRef(1)
  const pending = useSyncExternalStore(
    approvals.subscribe,
    approvals.pending,
    approvals.pending,
  )

  const status = pending.length ? "waiting" : running ? "working" : "idle"

  const update = (id: number, patch: (message: Message) => Partial<Message>) =>
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)))

  async function stream(id: number, text: string) {
    const words = text.split(" ")
    for (let i = 1; i <= words.length; i++) {
      if (stopped.current) break
      update(id, () => ({ text: words.slice(0, i).join(" ") }))
      await wait(28)
    }
    update(id, () => ({ streaming: false }))
  }

  // Labels match by words, so "Region" also names a "Revenue by region" chart elsewhere
  // on this page. Like a real model reading the bridge's "Use a ref" error, the demo
  // picks the control with that exact label in the settings it works on.
  function inSettings(step: BridgeStep): BridgeStep {
    const match = agent
      .snapshot()
      .find(
        (entry) => entry.label === step.ref && within()?.contains(elementOf(entry.ref) ?? null),
      )
    return match ? { ...step, ref: match.ref } : step
  }

  async function send(text: string) {
    stopped.current = false
    setRunning(true)
    const id = nextId.current
    nextId.current += 2
    setMessages((all) => [
      ...all,
      { id, from: "you", text, steps: [], streaming: false },
      { id: id + 1, from: "agent", text: "", steps: [], streaming: true },
    ])
    const reply = id + 1
    const intent = plan(text)

    if (intent.kind === "help") {
      await stream(reply, help)
    } else if (intent.kind === "look") {
      const seen = agent
        .snapshot()
        .filter((entry) => within()?.contains(elementOf(entry.ref) ?? null))
        .map((entry) => entry.label)
      await stream(reply, `I can see ${seen.length} controls here: ${seen.join(", ")}.`)
    } else if (intent.kind === "undo") {
      update(reply, () => ({ steps: [{ say: "Undo my changes", status: "running" }] }))
      const missed = await history.undoSource("agent")
      update(reply, () => ({
        steps: [{ say: "Undo my changes", status: missed.length ? "failed" : "done" }],
      }))
      await stream(
        reply,
        missed.length
          ? `I put most things back, but ${missed.length} control${missed.length === 1 ? " was" : "s were"} gone or locked.`
          : "Done. Everything I changed is back the way it was. Anything you changed yourself stayed.",
      )
    } else {
      let done = 0
      for (const [index, { say, step }] of intent.steps.entries()) {
        if (stopped.current) break
        update(reply, (m) => ({ steps: [...m.steps, { say, status: "running" }] }))
        const result = await agent.act({ steps: [inSettings(step)] })
        const message = result.error?.message ?? ""
        const status: AgentStepStatus = result.ok
          ? "done"
          : /said no|refused|Needs a person/i.test(message)
            ? "refused"
            : "failed"
        if (result.ok) done++
        update(reply, (m) => ({
          steps: m.steps.map((s, i) =>
            i === index ? { ...s, status, note: message } : s,
          ),
        }))
        await wait(250)
      }
      const total = intent.steps.length
      await stream(
        reply,
        stopped.current
          ? "Stopped. What I'd already changed is in Activity, where you can undo it."
          : done === total
            ? `Done: ${done === 1 ? "one change" : `${done} changes`}. You can see and undo ${done === 1 ? "it" : "them"} in Activity.`
            : done === 0
              ? "I didn't change anything."
              : `I made ${done} of ${total} changes. The rest didn't go through.`,
      )
    }
    setRunning(false)
  }

  return (
    <AgentConsole title="Agent" status={status} className="console-demo">
      <Tabs defaultValue="chat">
        <TabsList aria-label="Agent views">
          <TabsTab value="chat">Chat</TabsTab>
          <TabsTab value="activity">Activity</TabsTab>
          <TabsTab value="page">What it sees</TabsTab>
        </TabsList>
        <TabsPanel value="chat" keepMounted>
          <ChatThread>
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                from={m.from === "you" ? "user" : "assistant"}
                name={m.from === "you" ? "You" : "Agent"}
                streaming={m.streaming}
              >
                {m.steps.map((s, i) => (
                  <AgentStep key={i} status={s.status}>
                    {s.say}
                  </AgentStep>
                ))}
                {m.text && <p>{m.text}</p>}
              </ChatMessage>
            ))}
          </ChatThread>
          {messages.length === 1 && (
            <ChatSuggestions suggestions={suggestions} onSelect={send} />
          )}
        </TabsPanel>
        <TabsPanel value="activity" keepMounted>
          <AgentActivity history={history} />
        </TabsPanel>
        <TabsPanel value="page">
          <AgentSnapshot agent={agent} within={within} />
        </TabsPanel>
      </Tabs>
      <AgentApprovals approvals={approvals} />
      <ChatComposer
        label="Message"
        placeholder="Ask the agent to change something…"
        running={running}
        onSubmit={({ text }) => send(text)}
        onStop={() => {
          stopped.current = true
          approvals.denyAll()
        }}
      />
      <p className="console-note">
        Simulated model, no API key. The bridge, approvals, history and undo are real.
      </p>
    </AgentConsole>
  )
}

export { ConsoleDemo }
