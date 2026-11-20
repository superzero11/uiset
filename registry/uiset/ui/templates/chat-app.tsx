"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChatEmpty,
  ChatMessage,
  ChatMessageActions,
  ChatSuggestions,
  ChatThread,
  type ChatFeedback,
} from "../chat"
import { ChatComposer, ChatModelPicker, ChatQueue, ChatUsage, type ChatQueuedMessage } from "../chat-composer"
import { ChatMessageParts, type ChatMessagePart, type ChatToolPart, type ChatToolState } from "../chat-message-parts"
import { ChatThreadList, type ChatThreadItem } from "../chat-sidebar"
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
} from "./chat-app-sample"
import "./templates.css"

// A chat product: chats on the side, a thread, and a composer with commands, mentions,
// attachments, a model picker and usage. Plug in your model through `assistant`, an
// async generator of events; the sample one streams a placeholder answer so every part
// shows. With the AI SDK, map its stream parts (text, reasoning, tool calls, sources) to
// these events one to one. An agent's checkpoints, subagent runs and tool calls that wait for
// a person come as events too; an answer is kept as AI SDK message parts and drawn by
// ChatMessageParts. What's written while an answer runs is queued and sent when it's done.

type Turn = {
  id: number
  from: "user" | "assistant"
  /** A person's message; an answer's text is in its parts. */
  text: string
  streaming?: boolean
  parts?: ChatMessagePart[]
  files?: string[]
  feedback?: ChatFeedback
}

const toolState: Record<AssistantToolStatus, ChatToolState> = {
  pending: "input-streaming",
  running: "input-available",
  approval: "approval-requested",
  done: "output-available",
  error: "output-error",
  denied: "output-denied",
}

const toolPart = ({ id, name, title, status, input, output }: AssistantTool): ChatToolPart => ({
  type: `tool-${name}`,
  toolCallId: id,
  toolName: name,
  title,
  state: toolState[status],
  input,
  output,
  ...(status === "approval" ? { approval: { id } } : {}),
})

const textOf = (parts: ChatMessagePart[] = []) =>
  parts.map((p) => (p.type === "text" ? p.text : "")).join("")

const replaceOrAdd = (parts: ChatMessagePart[], part: ChatMessagePart, same: (p: ChatMessagePart) => boolean) =>
  parts.some(same) ? parts.map((p) => (same(p) ? part : p)) : [...parts, part]

/** An answer's parts with one more event in them. */
function withEvent(parts: ChatMessagePart[], event: AssistantEvent): ChatMessagePart[] {
  const last = parts.at(-1)
  switch (event.type) {
    case "text":
      return last?.type === "text"
        ? [...parts.slice(0, -1), { ...last, text: last.text + event.delta }]
        : [...parts, { type: "text", text: event.delta, state: "streaming" }]
    case "reasoning":
      return last?.type === "reasoning" && last.state === "streaming"
        ? [...parts.slice(0, -1), { ...last, text: last.text + event.delta }]
        : [...parts, { type: "reasoning", text: event.delta, state: "streaming" }]
    case "reasoning-end":
      return parts.map((p) => (p.type === "reasoning" && p.state === "streaming" ? { ...p, state: "done", seconds: event.seconds } : p))
    case "tool": {
      const { type: _type, ...tool } = event
      return replaceOrAdd(parts, toolPart(tool), (p) => (p as ChatToolPart).toolCallId === tool.id)
    }
    case "sources":
      return [...parts, ...event.sources.map((s) => ({ type: "source-url" as const, url: s.href, title: s.title }))]
    case "checkpoint":
      return [...parts, { type: "checkpoint", id: event.id, label: event.label, time: new Date() }]
    case "subagent": {
      const { type: _type, steps = [], ...run } = event
      const inner: ChatMessagePart[] = steps.map((step) => {
        if (step.type === "text") return { type: "text", text: step.text }
        const { type: _t, ...tool } = step
        return toolPart(tool)
      })
      return replaceOrAdd(parts, { type: "subagent", ...run, parts: inner }, (p) => p.type === "subagent" && p.id === run.id)
    }
  }
}

function ChatAppTemplate({
  assistant = sampleAssistant,
  models = sampleModels,
  commands = sampleCommands,
  mentions = sampleMentions,
  suggestions = sampleSuggestions,
  userName = "You",
  userAvatar,
  limit = 200000,
  onRestore,
}: {
  assistant?: Assistant
  models?: { value: string; label: string; description?: string }[]
  /** What "/" offers in the composer. */
  commands?: { value: string; label: string; description?: string }[]
  /** What "@" offers, like files in the project. */
  mentions?: { value: string; label: string }[]
  suggestions?: string[]
  userName?: string
  /** The person's picture or initials. Their own messages show none without it, as most chat apps do. */
  userAvatar?: { src?: string; fallback: string }
  /** The context window, for the usage meter. */
  limit?: number
  /** A checkpoint was restored: the thread is back to it; put your app's state back too. */
  onRestore?: (checkpoint: { id: string; label?: string }) => void
}) {
  const nextId = useRef(1)
  const nextChat = useRef(2)
  // Untitled chats get numbers in order, so no two chats (or their menus) share a name.
  const untitled = () => ({ id: `chat-${nextChat.current}`, title: `Untitled chat ${nextChat.current++}`, updatedAt: new Date() })
  const [threads, setThreads] = useState<ChatThreadItem[]>([{ id: "chat-1", title: "Untitled chat 1", updatedAt: new Date() }])
  const [active, setActive] = useState("chat-1")
  const [turns, setTurns] = useState<Record<string, Turn[]>>({ "chat-1": [] })
  const [model, setModel] = useState(models[1]?.value ?? models[0]?.value ?? "")
  const [running, setRunning] = useState(false)
  const [used, setUsed] = useState<Record<string, number>>({})
  const controller = useRef<AbortController | null>(null)
  // Tool calls waiting for a person, by id: Allow and Deny settle them, stopping denies them.
  const approvals = useRef(new Map<string, (allowed: boolean) => void>())
  // What was written while an answer ran, per chat. Stop holds it until Send now.
  const [queues, setQueues] = useState<Record<string, ChatQueuedMessage[]>>({})
  const [held, setHeld] = useState(false)
  const nextQueued = useRef(1)
  // A real request stops when the page goes away.
  useEffect(() => () => controller.current?.abort(), [])

  const list = turns[active] ?? []
  const queue = queues[active] ?? []
  const setQueue = (next: (q: ChatQueuedMessage[]) => ChatQueuedMessage[]) =>
    setQueues((all) => ({ ...all, [active]: next(all[active] ?? []) }))
  const update = (thread: string, id: number, patch: (turn: Turn) => Partial<Turn>) =>
    setTurns((all) => ({
      ...all,
      [thread]: (all[thread] ?? []).map((t) => (t.id === id ? { ...t, ...patch(t) } : t)),
    }))

  async function send(text: string, files: File[] = []) {
    // One answer at a time: Retry or a suggestion waits for Stop.
    if (running) return
    const thread = active
    const abort = new AbortController()
    controller.current = abort
    abort.signal.addEventListener("abort", () => {
      for (const settle of approvals.current.values()) settle(false)
      approvals.current.clear()
    })
    setRunning(true)
    const userId = nextId.current++
    const id = nextId.current++
    const history = list.map((t) => ({ from: t.from, text: t.from === "user" ? t.text : textOf(t.parts) }))
    setTurns((all) => ({
      ...all,
      [thread]: [
        ...(all[thread] ?? []),
        { id: userId, from: "user", text, files: files.map((f) => f.name) },
        { id, from: "assistant", text: "", streaming: true, parts: [] },
      ],
    }))
    if (threads.find((t) => t.id === thread)?.title.startsWith("Untitled chat"))
      setThreads((all) => all.map((t) => (t.id === thread ? { ...t, title: text.slice(0, 40), updatedAt: new Date() } : t)))
    try {
      const approval = (toolId: string) =>
        abort.signal.aborted
          ? Promise.resolve(false)
          : new Promise<boolean>((resolve) => approvals.current.set(toolId, resolve))
      for await (const event of assistant({ text, files, model, history, signal: abort.signal, approval }))
        update(thread, id, (t) => ({ parts: withEvent(t.parts ?? [], event) }))
    } catch {
      // Stopping on purpose isn't a failure.
      if (!abort.signal.aborted)
        update(thread, id, (t) => ({ parts: withEvent(t.parts ?? [], { type: "text", delta: "\n\n*The answer stopped early. Try again.*" }) }))
    } finally {
      update(thread, id, (t) => ({
        streaming: false,
        parts: t.parts?.map((p) => (p.type === "text" || p.type === "reasoning" ? { ...p, state: "done" as const } : p)),
      }))
      setUsed((all) => ({ ...all, [thread]: (all[thread] ?? 0) + estimateTokens(text) }))
      setRunning(false)
    }
  }

  // A tool call waiting for a person: their answer goes to the assistant, and shows at once.
  function approve(turnId: number, part: ChatToolPart, allowed: boolean) {
    const id = part.toolCallId ?? ""
    approvals.current.get(id)?.(allowed)
    approvals.current.delete(id)
    update(active, turnId, (t) => ({
      parts: t.parts?.map((p) =>
        (p as ChatToolPart).toolCallId === id ? { ...p, state: allowed ? "approval-responded" : "output-denied" } as ChatMessagePart : p,
      ),
    }))
  }

  // Back to a checkpoint: its answer up to it, and nothing after.
  function restore(turnId: number, checkpoint: { id: string; label?: string }) {
    if (running) controller.current?.abort()
    setTurns((all) => {
      const thread = all[active] ?? []
      const at = thread.findIndex((t) => t.id === turnId)
      if (at < 0) return all
      const turn = thread[at]!
      const cut = (turn.parts ?? []).findIndex((p) => p.type === "checkpoint" && p.id === checkpoint.id)
      return { ...all, [active]: [...thread.slice(0, at), { ...turn, streaming: false, parts: turn.parts?.slice(0, cut + 1) }] }
    })
    onRestore?.(checkpoint)
  }

  // The queue goes on its own once an answer is done, unless Stop held it.
  useEffect(() => {
    const next = queue[0]
    if (running || held || !next) return
    setQueue((q) => q.slice(1))
    void send(next.text)
  }, [running, held, queue])

  return (
    <div className="chat-app-template">
      <ChatThreadList
        threads={threads}
        value={active}
        onValueChange={setActive}
        onNew={() => {
          const thread = untitled()
          setThreads((all) => [thread, ...all])
          setTurns((all) => ({ ...all, [thread.id]: [] }))
          setActive(thread.id)
        }}
        onRename={(id, title) => setThreads((all) => all.map((t) => (t.id === id ? { ...t, title } : t)))}
        onDelete={(id) => {
          const rest = threads.filter((t) => t.id !== id)
          // There is always a chat to type into: deleting the last one starts a new one.
          if (!rest.length) {
            const thread = untitled()
            setThreads([thread])
            setTurns((all) => ({ ...all, [thread.id]: [] }))
            setActive(thread.id)
            return
          }
          setThreads(rest)
          if (id === active) setActive(rest[0]!.id)
        }}
      />
      <div className="chat-app-main">
        <ChatThread label="Conversation">
          {list.length === 0 && (
            <ChatEmpty title="What are we working on?">
              <ChatSuggestions suggestions={suggestions} onSelect={(s) => send(s)} />
            </ChatEmpty>
          )}
          {list.map((turn) =>
            turn.from === "user" ? (
              <ChatMessage key={turn.id} from="user" name={userName} avatar={userAvatar}>
                <p className="chat-plain">{turn.text}</p>
                {turn.files?.length ? <p className="chat-plain chat-file-note">Attached: {turn.files.join(", ")}</p> : null}
              </ChatMessage>
            ) : (
              <ChatMessage
                key={turn.id}
                from="assistant"
                name="Assistant"
                avatar={{ fallback: "AI" }}
                // Waiting for a person to allow a tool call isn't writing: no caret, not busy.
                streaming={turn.streaming && !turn.parts?.some((p) => (p as ChatToolPart).state === "approval-requested")}
                actions={
                  !turn.streaming && textOf(turn.parts) ? (
                    <ChatMessageActions
                      text={textOf(turn.parts)}
                      onRetry={() => send(list.findLast((t) => t.from === "user" && t.id < turn.id)?.text ?? "Try again")}
                      feedback={turn.feedback ?? null}
                      onFeedbackChange={(feedback) => update(active, turn.id, () => ({ feedback }))}
                    />
                  ) : undefined
                }
              >
                <ChatMessageParts
                  parts={turn.parts ?? []}
                  onApprove={(part, allowed) => approve(turn.id, part, allowed)}
                  onRestore={(checkpoint) => restore(turn.id, checkpoint)}
                />
              </ChatMessage>
            ),
          )}
        </ChatThread>
        <ChatQueue
          items={queue}
          onRemove={(id) => setQueue((q) => q.filter((m) => m.id !== id))}
          onSendNow={(id) => {
            // It goes first, and the answer running now stops for it.
            setQueue((q) => [...q.filter((m) => m.id === id), ...q.filter((m) => m.id !== id)])
            setHeld(false)
            controller.current?.abort()
          }}
        />
        <ChatComposer
          label="Message"
          placeholder="Ask anything. Type / for commands, @ to mention a file…"
          running={running}
          onStop={() => {
            setHeld(true)
            controller.current?.abort()
          }}
          onQueue={({ text }) => text && setQueue((q) => [...q, { id: `queued-${nextQueued.current++}`, text }])}
          onSubmit={({ text, files }) => {
            setHeld(false)
            void send(text || "Look at these files", files)
          }}
          commands={commands}
          mentions={mentions}
          attachments={{ maxFiles: 5, maxSize: 10 * 1024 * 1024 }}
          tools={
            <>
              <ChatModelPicker models={models} value={model} onValueChange={(value: string) => setModel(value)} />
              <ChatUsage used={used[active] ?? 0} limit={limit} />
            </>
          }
        />
      </div>
    </div>
  )
}

export { ChatAppTemplate, sampleAssistant }
export type { Assistant, AssistantEvent, AssistantInput } from "./chat-app-sample"
