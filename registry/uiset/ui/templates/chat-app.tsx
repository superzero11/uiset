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
import { ChatComposer, ChatModelPicker, ChatUsage } from "../chat-composer"
import {
  ChatReasoning,
  ChatSources,
  ChatTool,
  type ChatSource,
  type ChatToolStatus,
} from "../chat-parts"
import { ChatResponse } from "../chat-response"
import { ChatThreadList, type ChatThreadItem } from "../chat-sidebar"
import {
  estimateTokens,
  sampleAssistant,
  sampleCommands,
  sampleMentions,
  sampleModels,
  sampleSuggestions,
  type Assistant,
} from "./chat-app-sample"
import "./templates.css"

// A chat product: chats on the side, a thread, and a composer with commands, mentions,
// attachments, a model picker and usage. Plug in your model through `assistant`, an
// async generator of events; the sample one streams a placeholder answer so every part
// shows. With the AI SDK, map its stream parts (text, reasoning, tool calls, sources) to
// these events one to one.

type Turn = {
  id: number
  from: "user" | "assistant"
  text: string
  streaming?: boolean
  reasoning?: { text: string; streaming: boolean; seconds?: number }
  tools?: { id: string; name: string; title?: string; status: ChatToolStatus; input?: unknown; output?: unknown }[]
  sources?: ChatSource[]
  files?: string[]
  feedback?: ChatFeedback
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
  // A real request stops when the page goes away.
  useEffect(() => () => controller.current?.abort(), [])

  const list = turns[active] ?? []
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
    setRunning(true)
    const userId = nextId.current++
    const id = nextId.current++
    const history = list.map((t) => ({ from: t.from, text: t.text }))
    setTurns((all) => ({
      ...all,
      [thread]: [
        ...(all[thread] ?? []),
        { id: userId, from: "user", text, files: files.map((f) => f.name) },
        { id, from: "assistant", text: "", streaming: true },
      ],
    }))
    if (threads.find((t) => t.id === thread)?.title.startsWith("Untitled chat"))
      setThreads((all) => all.map((t) => (t.id === thread ? { ...t, title: text.slice(0, 40), updatedAt: new Date() } : t)))
    try {
      for await (const event of assistant({ text, files, model, history, signal: abort.signal })) {
        if (event.type === "text") update(thread, id, (t) => ({ text: t.text + event.delta }))
        else if (event.type === "reasoning")
          update(thread, id, (t) => ({
            reasoning: { text: (t.reasoning?.text ?? "") + event.delta, streaming: true },
          }))
        else if (event.type === "reasoning-end")
          update(thread, id, (t) => ({
            reasoning: { text: t.reasoning?.text ?? "", streaming: false, seconds: event.seconds },
          }))
        else if (event.type === "tool")
          update(thread, id, (t) => {
            const { type: _type, ...tool } = event
            const tools = t.tools ?? []
            return {
              tools: tools.some((x) => x.id === tool.id)
                ? tools.map((x) => (x.id === tool.id ? tool : x))
                : [...tools, tool],
            }
          })
        else if (event.type === "sources") update(thread, id, () => ({ sources: event.sources }))
      }
    } catch {
      // Stopping on purpose isn't a failure.
      if (!abort.signal.aborted)
        update(thread, id, (t) => ({ text: `${t.text}\n\n*The answer stopped early. Try again.*` }))
    } finally {
      update(thread, id, (t) => ({
        streaming: false,
        reasoning: t.reasoning && { ...t.reasoning, streaming: false },
      }))
      setUsed((all) => ({ ...all, [thread]: (all[thread] ?? 0) + estimateTokens(text) }))
      setRunning(false)
    }
  }

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
                streaming={turn.streaming}
                actions={
                  !turn.streaming && turn.text ? (
                    <ChatMessageActions
                      text={turn.text}
                      onRetry={() => send(list.findLast((t) => t.from === "user" && t.id < turn.id)?.text ?? "Try again")}
                      feedback={turn.feedback ?? null}
                      onFeedbackChange={(feedback) => update(active, turn.id, () => ({ feedback }))}
                    />
                  ) : undefined
                }
              >
                {turn.reasoning && (
                  <ChatReasoning streaming={turn.reasoning.streaming} seconds={turn.reasoning.seconds}>
                    {turn.reasoning.text}
                  </ChatReasoning>
                )}
                {turn.tools?.map((tool) => (
                  <ChatTool
                    key={tool.id}
                    name={tool.name}
                    title={tool.title}
                    status={tool.status}
                    input={tool.input}
                    output={tool.output}
                  />
                ))}
                {turn.text && <ChatResponse streaming={turn.streaming}>{turn.text}</ChatResponse>}
                {turn.sources && !turn.streaming && <ChatSources sources={turn.sources} />}
              </ChatMessage>
            ),
          )}
        </ChatThread>
        <ChatComposer
          label="Message"
          placeholder="Ask anything. Type / for commands, @ to mention a file…"
          running={running}
          onStop={() => controller.current?.abort()}
          onSubmit={({ text, files }) => send(text || "Look at these files", files)}
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
