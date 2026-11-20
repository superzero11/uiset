import { useEffect, useRef, useState } from "react"
import {
  ChatBranch,
  ChatEmpty,
  ChatMessage,
  ChatMessageActions,
  ChatSuggestions,
  ChatTasks,
  ChatThread,
  type ChatFeedback,
  type ChatTask,
} from "@/registry/uiset/ui/chat"
import {
  ChatComposer,
  ChatModelPicker,
  ChatQueue,
  ChatUsage,
  type ChatQueuedMessage,
} from "@/registry/uiset/ui/chat-composer"
import {
  ChatMessageParts,
  type ChatMessagePart,
  type ChatToolPart,
} from "@/registry/uiset/ui/chat-message-parts"
import {
  ChatCitation,
  ChatReasoning,
  ChatSources,
  ChatTool,
  type ChatSource,
  type ChatToolStatus,
} from "@/registry/uiset/ui/chat-parts"
import { ChatResponse } from "@/registry/uiset/ui/chat-response"
import { ChatThreadList, type ChatThreadItem } from "@/registry/uiset/ui/chat-sidebar"

type Turn = {
  id: number
  from: "user" | "assistant"
  text: string
  streaming?: boolean
  reasoning?: { text: string; streaming: boolean; seconds?: number }
  tool?: { name: string; status: ChatToolStatus; input: unknown; output?: unknown }
  sources?: ChatSource[]
  tasks?: ChatTask[]
  files?: string[]
  feedback?: ChatFeedback
  versions?: string[]
  version?: number
  /** An agent's turn, as AI SDK message parts. */
  parts?: ChatMessagePart[]
}

const minutes = (n: number) => new Date(Date.now() - n * 60000)

const sources: ChatSource[] = [
  {
    href: "https://react.dev/reference/react/useDeferredValue",
    title: "useDeferredValue",
    description: "Defer updating a part of the UI.",
  },
  {
    href: "https://developer.mozilla.org/en-US/docs/Web/API/AbortController",
    title: "AbortController",
    description: "Abort one or more web requests when you need to.",
  },
]

const answer = `Debounce the **value**, not the handler, and cancel stale requests:

\`\`\`tsx
function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}
\`\`\`

Then fetch from the debounced query with an \`AbortController\`, so a slow old response can't overwrite a newer one.

| Approach | Requests while typing "react" |
| --- | --- |
| No debounce | 5 |
| Debounced 250 ms | 1 |`

const seed: Turn[] = [
  {
    id: 1,
    from: "user",
    text: "Search fires a request on every keystroke. How do I debounce it in React?",
  },
  {
    id: 2,
    from: "assistant",
    text: answer,
    reasoning: {
      text: "They want fewer requests, and correct results when responses arrive out of order. Debounce the value, abort the previous fetch.",
      streaming: false,
      seconds: 4,
    },
    tool: {
      name: "search_docs",
      status: "done",
      input: { query: "react debounce input fetch abort" },
      output: { results: 2, top: "useDeferredValue, AbortController" },
    },
    sources,
    versions: [
      "Use `useDeferredValue` for rendering, and a debounced value for fetching.",
      answer,
    ],
    version: 1,
  },
  {
    id: 3,
    from: "assistant",
    text: "Here's how I'd roll it out:",
    tasks: [
      { id: "a", title: "Add useDebounced to hooks/", status: "done" },
      { id: "b", title: "Abort stale requests in useSearch", status: "running" },
      {
        id: "c",
        title: "Test fast typing on a slow network",
        status: "pending",
        detail: "Chrome DevTools, Slow 4G",
      },
    ],
  },
  {
    id: 4,
    from: "assistant",
    text: "",
    parts: [
      { type: "checkpoint", id: "cp-rollout", label: "Before the rollout", time: minutes(3) },
      {
        type: "subagent",
        id: "sub-tester",
        name: "Tester",
        task: "Type fast on a slow network",
        status: "done",
        seconds: 9,
        parts: [
          {
            type: "tool-runTests",
            toolCallId: "t-tests",
            title: "Ran the search tests",
            state: "output-available",
            input: { network: "Slow 4G", typing: "react" },
            output: { passed: 12, failed: 0 },
          },
          {
            type: "text",
            text: "Typing “react” fast sends one request, and a slow early response no longer replaces a newer one.",
          },
        ],
      },
      { type: "text", text: "The fix holds up on a slow network. Opening a pull request needs your yes." },
      {
        type: "tool-openPullRequest",
        toolCallId: "t-pr",
        title: "Open a pull request",
        state: "approval-requested",
        input: { branch: "fix/debounce-search", title: "Debounce search and abort stale requests" },
        approval: { id: "ap-pr" },
      },
    ],
  },
]

const threads0: ChatThreadItem[] = [
  { id: "bug", title: "Debounce bug in search", updatedAt: minutes(4) },
  { id: "launch", title: "Launch checklist", updatedAt: minutes(140) },
  { id: "pricing", title: "Pricing page copy", updatedAt: minutes(60 * 26) },
]

const models = [
  { value: "fast", label: "Fast", description: "Quick answers, lower cost" },
  { value: "balanced", label: "Balanced", description: "The default" },
  { value: "deep", label: "Deep", description: "Thinks longer on hard problems" },
]

const commands = [
  { value: "explain", label: "explain", description: "Explain the selected code" },
  { value: "test", label: "test", description: "Write tests for it" },
  { value: "summarize", label: "summarize", description: "Summarize this chat" },
]

const mentions = [
  { value: "search.tsx", label: "search.tsx", description: "src/components" },
  { value: "use-search.ts", label: "use-search.ts", description: "src/hooks" },
  { value: "api.ts", label: "api.ts", description: "src/lib" },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function ChatDemo() {
  const [threads, setThreads] = useState(threads0)
  const [active, setActive] = useState("bug")
  const [turns, setTurns] = useState<Record<string, Turn[]>>({
    bug: seed,
    launch: [],
    pricing: [],
  })
  const [running, setRunning] = useState(false)
  const [used, setUsed] = useState(18400)
  // What was written while an answer ran, per chat; sent in turn when it's done. Stop holds
  // the rest until Send now.
  const [queues, setQueues] = useState<Record<string, ChatQueuedMessage[]>>({})
  const [held, setHeld] = useState(false)
  const stopped = useRef(false)
  const nextId = useRef(10)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const queue = queues[active] ?? []
  const setQueue = (next: (q: ChatQueuedMessage[]) => ChatQueuedMessage[]) =>
    setQueues((all) => ({ ...all, [active]: next(all[active] ?? []) }))

  const list = turns[active] ?? []
  const update = (id: number, patch: (turn: Turn) => Partial<Turn>) =>
    setTurns((all) => ({
      ...all,
      [active]: (all[active] ?? []).map((t) => (t.id === id ? { ...t, ...patch(t) } : t)),
    }))

  const updatePart = (turnId: number, callId: string | undefined, patch: Partial<ChatToolPart>, then?: ChatMessagePart) =>
    update(turnId, (t) => ({
      parts: [
        ...(t.parts ?? []).map((p) =>
          (p as ChatToolPart).toolCallId === callId ? ({ ...p, ...patch } as ChatMessagePart) : p,
        ),
        ...(then ? [then] : []),
      ],
    }))

  function approve(turnId: number, part: ChatToolPart, approved: boolean) {
    if (!approved) {
      updatePart(turnId, part.toolCallId, { state: "output-denied" }, { type: "text", text: "Okay, I won't open it. The branch is still there." })
      return
    }
    updatePart(turnId, part.toolCallId, { state: "approval-responded" })
    timers.current.push(
      setTimeout(
        () =>
          updatePart(
            turnId,
            part.toolCallId,
            { state: "output-available", output: { url: "https://github.com/acme/app/pull/482", number: 482 } },
            { type: "text", text: "Opened pull request #482: *Debounce search and abort stale requests*." },
          ),
        900,
      ),
    )
  }

  // Back to the checkpoint: the agent's turn as it was there, and nothing after it.
  function restore(turnId: number) {
    setTurns((all) => {
      const list = all[active] ?? []
      const at = list.findIndex((t) => t.id === turnId)
      if (at < 0) return all
      const start = seed.find((t) => t.id === turnId)
      return { ...all, [active]: [...list.slice(0, at), start ?? list[at]!] }
    })
  }

  useEffect(() => {
    const next = queue[0]
    if (running || held || !next) return
    setQueue((q) => q.slice(1))
    void send(next.text)
  }, [running, held, queue])

  async function send(text: string, files: File[] = []) {
    stopped.current = false
    setRunning(true)
    const userId = nextId.current++
    const id = nextId.current++
    setTurns((all) => ({
      ...all,
      [active]: [
        ...(all[active] ?? []),
        { id: userId, from: "user", text, files: files.map((f) => f.name) },
        {
          id,
          from: "assistant",
          text: "",
          streaming: true,
          reasoning: { text: "", streaming: true },
        },
      ],
    }))
    const thought = `They asked: “${text}”. Check the docs first, then answer briefly with an example.`
    for (let i = 1; i <= thought.length && !stopped.current; i += 4) {
      update(id, (t) => ({ reasoning: { ...t.reasoning!, text: thought.slice(0, i) } }))
      await wait(16)
    }
    update(id, () => ({
      reasoning: { text: thought, streaming: false, seconds: 2 },
      tool: {
        name: "search_docs",
        status: "running",
        input: { query: text.slice(0, 60) },
      },
    }))
    await wait(500)
    update(id, (t) => ({
      tool: { ...t.tool!, status: "done", output: { results: 2 } },
      sources,
    }))
    const reply = `Here's a short answer to **“${text}”**.\n\nThis is a simulated assistant, so the content is a placeholder, but every part you see is a real UISet chat component:\n\n\`\`\`ts\nconst answer = await assistant.reply(${JSON.stringify(text.slice(0, 40))})\n\`\`\`\n\n${files.length ? `I received ${files.length} attachment${files.length === 1 ? "" : "s"}.` : "Attach a file with the paperclip, or paste one."}`
    const words = reply.split(" ")
    for (let i = 1; i <= words.length && !stopped.current; i++) {
      update(id, () => ({ text: words.slice(0, i).join(" ") }))
      await wait(22)
    }
    update(id, () => ({ streaming: false }))
    setUsed((n) => n + 900 + text.length * 4)
    setRunning(false)
  }

  return (
    <div className="chat-app">
      <ChatThreadList
        threads={threads}
        value={active}
        onValueChange={setActive}
        onNew={() => {
          const id = `chat-${nextId.current++}`
          setThreads((all) => [{ id, title: "New chat", updatedAt: new Date() }, ...all])
          setTurns((all) => ({ ...all, [id]: [] }))
          setActive(id)
        }}
        onRename={(id, title) =>
          setThreads((all) => all.map((t) => (t.id === id ? { ...t, title } : t)))
        }
        onDelete={(id) => {
          setThreads((all) => all.filter((t) => t.id !== id))
          if (id === active) setActive(threads.find((t) => t.id !== id)?.id ?? "")
        }}
      />
      <div className="chat-main">
        <ChatThread label="Conversation">
          {list.length === 0 && (
            <ChatEmpty title="What are we working on?">
              <ChatSuggestions
                suggestions={[
                  "Review my search hook",
                  "Draft release notes",
                  "Explain AbortController",
                ]}
                onSelect={(s) => send(s)}
              />
            </ChatEmpty>
          )}
          {list.map((turn) =>
            turn.from === "user" ? (
              <ChatMessage
                key={turn.id}
                from="user"
                name="You"
                time={minutes(6)}
              >
                <p className="chat-plain">{turn.text}</p>
                {turn.files?.length ? (
                  <p className="chat-plain chat-file-note">
                    Attached: {turn.files.join(", ")}
                  </p>
                ) : null}
              </ChatMessage>
            ) : (
              <ChatMessage
                key={turn.id}
                from="assistant"
                name="Assistant"
                avatar={{ fallback: "AI" }}
                streaming={turn.streaming}
                actions={
                  !turn.streaming && turn.text && !turn.parts ? (
                    <div className="chat-message-footer">
                      <ChatMessageActions
                        text={
                          turn.versions ? turn.versions[turn.version ?? 0] : turn.text
                        }
                        onRetry={() => send("Try that again")}
                        feedback={turn.feedback ?? null}
                        onFeedbackChange={(feedback) =>
                          update(turn.id, () => ({ feedback }))
                        }
                      />
                      {turn.versions && (
                        <ChatBranch
                          index={turn.version ?? 0}
                          count={turn.versions.length}
                          onIndexChange={(version) =>
                            update(turn.id, () => ({ version }))
                          }
                        />
                      )}
                    </div>
                  ) : undefined
                }
              >
                {turn.reasoning && (
                  <ChatReasoning
                    streaming={turn.reasoning.streaming}
                    seconds={turn.reasoning.seconds}
                  >
                    {turn.reasoning.text}
                  </ChatReasoning>
                )}
                {turn.tool && (
                  <ChatTool
                    name={turn.tool.name}
                    title="Searched the docs"
                    status={turn.tool.status}
                    input={turn.tool.input}
                    output={turn.tool.output}
                  />
                )}
                {turn.text && (
                  <ChatResponse streaming={turn.streaming}>
                    {turn.versions ? turn.versions[turn.version ?? 0]! : turn.text}
                  </ChatResponse>
                )}
                {turn.sources && !turn.streaming && (
                  <p className="chat-plain chat-cite-line">
                    Sources: <ChatCitation index={1} source={turn.sources[0]!} />
                    <ChatCitation index={2} source={turn.sources[1]!} />
                  </p>
                )}
                {turn.sources && !turn.streaming && (
                  <ChatSources sources={turn.sources} />
                )}
                {turn.tasks && <ChatTasks title="Rollout" tasks={turn.tasks} />}
                {turn.parts && (
                  <ChatMessageParts
                    parts={turn.parts}
                    onApprove={(part, approved) => approve(turn.id, part, approved)}
                    onRestore={() => restore(turn.id)}
                  />
                )}
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
            stopped.current = true
          }}
        />
        <ChatComposer
          label="Message"
          placeholder="Ask anything. Type / for commands, @ to mention a file…"
          running={running}
          onStop={() => {
            stopped.current = true
            setHeld(true)
          }}
          onQueue={({ text }) => text && setQueue((q) => [...q, { id: `q-${nextId.current++}`, text }])}
          onSubmit={({ text, files }) => {
            setHeld(false)
            void send(text || "Look at these files", files)
          }}
          commands={commands}
          mentions={mentions}
          attachments={{ maxFiles: 5, maxSize: 10 * 1024 * 1024 }}
          tools={
            <>
              <ChatModelPicker models={models} defaultValue="balanced" />
              <ChatUsage used={used} limit={200000} />
            </>
          }
        />
        <p className="console-note">
          Simulated assistant. Every part is a real component: markdown, code, reasoning,
          tool calls, sources, tasks, versions, attachments, commands and mentions; and an
          agent&rsquo;s turn from AI SDK parts: a checkpoint, a subagent&rsquo;s run, a pull
          request waiting for Allow. Write while it answers to queue a message.
        </p>
      </div>
    </div>
  )
}

export { ChatDemo }
