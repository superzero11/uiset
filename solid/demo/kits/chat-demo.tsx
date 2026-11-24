import { createSignal, For, onCleanup, Show } from "solid-js"
import { ChatBranch, ChatEmpty, ChatMessage, ChatMessageActions, ChatSuggestions, ChatTasks, ChatThread, type ChatFeedback, type ChatTask } from "../../src/chat"
import { ChatComposer, ChatModelPicker, ChatQueue, ChatUsage, type ChatQueuedMessage } from "../../src/chat-composer"
import { ChatMessageParts, type ChatMessagePart, type ChatToolPart } from "../../src/chat-message-parts"
import { ChatCitation, ChatReasoning, ChatSources, ChatTool, type ChatSource, type ChatToolStatus } from "../../src/chat-parts"
import { ChatResponse } from "../../src/chat-response"
import { ChatThreadList, type ChatThreadItem } from "../../src/chat-sidebar"

// The chat kit's demo in Solid: React's (src/site/chat-demo.tsx), part for part.

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
  { href: "https://react.dev/reference/react/useDeferredValue", title: "useDeferredValue", description: "Defer updating a part of the UI." },
  { href: "https://developer.mozilla.org/en-US/docs/Web/API/AbortController", title: "AbortController", description: "Abort one or more web requests when you need to." },
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
  { id: 1, from: "user", text: "Search fires a request on every keystroke. How do I debounce it in React?" },
  {
    id: 2,
    from: "assistant",
    text: answer,
    reasoning: {
      text: "They want fewer requests, and correct results when responses arrive out of order. Debounce the value, abort the previous fetch.",
      streaming: false,
      seconds: 4,
    },
    tool: { name: "search_docs", status: "done", input: { query: "react debounce input fetch abort" }, output: { results: 2, top: "useDeferredValue, AbortController" } },
    sources,
    versions: ["Use `useDeferredValue` for rendering, and a debounced value for fetching.", answer],
    version: 1,
  },
  {
    id: 3,
    from: "assistant",
    text: "Here's how I'd roll it out:",
    tasks: [
      { id: "a", title: "Add useDebounced to hooks/", status: "done" },
      { id: "b", title: "Abort stale requests in useSearch", status: "running" },
      { id: "c", title: "Test fast typing on a slow network", status: "pending", detail: "Chrome DevTools, Slow 4G" },
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
          { type: "text", text: "Typing “react” fast sends one request, and a slow early response no longer replaces a newer one." },
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
  const [threads, setThreads] = createSignal(threads0)
  const [active, setActive] = createSignal("bug")
  const [turns, setTurns] = createSignal<Record<string, Turn[]>>({ bug: seed, launch: [], pricing: [] })
  const [running, setRunning] = createSignal(false)
  const [used, setUsed] = createSignal(18400)
  // What was written while an answer ran, per chat; sent in turn when it's done. Stop holds
  // the rest until Send now.
  const [queues, setQueues] = createSignal<Record<string, ChatQueuedMessage[]>>({})
  const [held, setHeld] = createSignal(false)
  let stopped = false
  let nextId = 10
  const timers: ReturnType<typeof setTimeout>[] = []
  onCleanup(() => timers.forEach(clearTimeout))
  const queue = () => queues()[active()] ?? []
  const setQueue = (next: (q: ChatQueuedMessage[]) => ChatQueuedMessage[]) => {
    const chat = active()
    setQueues((all) => ({ ...all, [chat]: next(all[chat] ?? []) }))
  }

  const list = () => turns()[active()] ?? []
  const update = (id: number, patch: (turn: Turn) => Partial<Turn>, chat = active()) =>
    setTurns((all) => ({ ...all, [chat]: (all[chat] ?? []).map((t) => (t.id === id ? { ...t, ...patch(t) } : t)) }))

  const updatePart = (turnId: number, callId: string | undefined, patch: Partial<ChatToolPart>, then?: ChatMessagePart) =>
    update(turnId, (t) => ({
      parts: [...(t.parts ?? []).map((p) => ((p as ChatToolPart).toolCallId === callId ? ({ ...p, ...patch } as ChatMessagePart) : p)), ...(then ? [then] : [])],
    }))

  function approve(turnId: number, part: ChatToolPart, approved: boolean) {
    if (!approved) {
      updatePart(turnId, part.toolCallId, { state: "output-denied" }, { type: "text", text: "Okay, I won't open it. The branch is still there." })
      return
    }
    updatePart(turnId, part.toolCallId, { state: "approval-responded" })
    timers.push(
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
    const chat = active()
    setTurns((all) => {
      const turnsNow = all[chat] ?? []
      const at = turnsNow.findIndex((t) => t.id === turnId)
      if (at < 0) return all
      const start = seed.find((t) => t.id === turnId)
      return { ...all, [chat]: [...turnsNow.slice(0, at), start ?? turnsNow[at]!] }
    })
  }

  // The next queued message goes once nothing runs and nothing holds the queue. Run after the
  // writes that could free it are in (a microtask on), so it reads them.
  const drain = () =>
    queueMicrotask(() => {
      const next = queue()[0]
      if (running() || held() || !next) return
      setQueue((q) => q.slice(1))
      void send(next.text)
    })

  async function send(text: string, files: File[] = []) {
    stopped = false
    const chat = active()
    setRunning(true)
    const userId = nextId++
    const id = nextId++
    setTurns((all) => ({
      ...all,
      [chat]: [...(all[chat] ?? []), { id: userId, from: "user", text, files: files.map((f) => f.name) }, { id, from: "assistant", text: "", streaming: true, reasoning: { text: "", streaming: true } }],
    }))
    const thought = `They asked: “${text}”. Check the docs first, then answer briefly with an example.`
    for (let i = 1; i <= thought.length && !stopped; i += 4) {
      update(id, (t) => ({ reasoning: { ...t.reasoning!, text: thought.slice(0, i) } }), chat)
      await wait(16)
    }
    update(id, () => ({ reasoning: { text: thought, streaming: false, seconds: 2 }, tool: { name: "search_docs", status: "running", input: { query: text.slice(0, 60) } } }), chat)
    await wait(500)
    update(id, (t) => ({ tool: { ...t.tool!, status: "done", output: { results: 2 } }, sources }), chat)
    const reply = `Here's a short answer to **“${text}”**.\n\nThis is a simulated assistant, so the content is a placeholder, but every part you see is a real UISet chat component:\n\n\`\`\`ts\nconst answer = await assistant.reply(${JSON.stringify(text.slice(0, 40))})\n\`\`\`\n\n${files.length ? `I received ${files.length} attachment${files.length === 1 ? "" : "s"}.` : "Attach a file with the paperclip, or paste one."}`
    const words = reply.split(" ")
    for (let i = 1; i <= words.length && !stopped; i++) {
      update(id, () => ({ text: words.slice(0, i).join(" ") }), chat)
      await wait(22)
    }
    update(id, () => ({ streaming: false }), chat)
    setUsed((n) => n + 900 + text.length * 4)
    setRunning(false)
    drain()
  }

  return (
    <div class="chat-app">
      <ChatThreadList
        threads={threads()}
        value={active()}
        onValueChange={setActive}
        onNew={() => {
          const id = `chat-${nextId++}`
          setThreads((all) => [{ id, title: "New chat", updatedAt: new Date() }, ...all])
          setTurns((all) => ({ ...all, [id]: [] }))
          setActive(id)
        }}
        onRename={(id, title) => setThreads((all) => all.map((t) => (t.id === id ? { ...t, title } : t)))}
        onDelete={(id) => {
          const rest = threads().filter((t) => t.id !== id)
          setThreads(rest)
          if (id === active()) setActive(rest[0]?.id ?? "")
        }}
      />
      <div class="chat-main">
        <ChatThread label="Conversation">
          <Show when={list().length === 0}>
            <ChatEmpty title="What are we working on?">
              <ChatSuggestions suggestions={["Review my search hook", "Draft release notes", "Explain AbortController"]} onSelect={(s) => send(s)} />
            </ChatEmpty>
          </Show>
          <For each={list()} keyed={(turn) => turn.id}>
            {(turn) => (
              <Show when={turn().from === "user"} fallback={<AssistantTurn turn={turn()} send={send} update={update} approve={approve} restore={restore} />}>
                <ChatMessage from="user" name="You" time={minutes(6)}>
                  <p class="chat-plain">{turn().text}</p>
                  <Show when={turn().files?.length}>
                    <p class="chat-plain chat-file-note">Attached: {turn().files!.join(", ")}</p>
                  </Show>
                </ChatMessage>
              </Show>
            )}
          </For>
        </ChatThread>
        <ChatQueue
          items={queue()}
          onRemove={(id) => setQueue((q) => q.filter((m) => m.id !== id))}
          onSendNow={(id) => {
            // It goes first, and the answer running now stops for it.
            setQueue((q) => [...q.filter((m) => m.id === id), ...q.filter((m) => m.id !== id)])
            setHeld(false)
            stopped = true
            drain()
          }}
        />
        <ChatComposer
          label="Message"
          placeholder="Ask anything. Type / for commands, @ to mention a file…"
          running={running()}
          onStop={() => {
            stopped = true
            setHeld(true)
          }}
          onQueue={({ text }) => text && setQueue((q) => [...q, { id: `q-${nextId++}`, text }])}
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
              <ChatUsage used={used()} limit={200000} />
            </>
          }
        />
        <p class="console-note">
          Simulated assistant. Every part is a real component: markdown, code, reasoning, tool calls, sources, tasks, versions, attachments, commands and mentions; and an agent’s turn from AI
          SDK parts: a checkpoint, a subagent’s run, a pull request waiting for Allow. Write while it answers to queue a message.
        </p>
      </div>
    </div>
  )
}

/** One of the assistant's turns: its reasoning, tool call, answer, sources, plan or agent parts. */
function AssistantTurn(props: {
  turn: Turn
  send: (text: string) => void
  update: (id: number, patch: (turn: Turn) => Partial<Turn>) => void
  approve: (turnId: number, part: ChatToolPart, approved: boolean) => void
  restore: (turnId: number) => void
}) {
  const shownText = () => (props.turn.versions ? props.turn.versions[props.turn.version ?? 0]! : props.turn.text)
  return (
    <ChatMessage
      from="assistant"
      name="Assistant"
      avatar={{ fallback: "AI" }}
      streaming={props.turn.streaming}
      actions={
        <Show when={!props.turn.streaming && props.turn.text && !props.turn.parts}>
          <div class="chat-message-footer">
            <ChatMessageActions
              text={shownText()}
              onRetry={() => props.send("Try that again")}
              feedback={props.turn.feedback ?? null}
              onFeedbackChange={(feedback) => props.update(props.turn.id, () => ({ feedback }))}
            />
            <Show when={props.turn.versions}>
              {(versions) => <ChatBranch index={props.turn.version ?? 0} count={versions().length} onIndexChange={(version) => props.update(props.turn.id, () => ({ version }))} />}
            </Show>
          </div>
        </Show>
      }
    >
      <Show when={props.turn.reasoning}>
        {(reasoning) => (
          <ChatReasoning streaming={reasoning().streaming} seconds={reasoning().seconds}>
            {reasoning().text}
          </ChatReasoning>
        )}
      </Show>
      <Show when={props.turn.tool}>{(tool) => <ChatTool name={tool().name} title="Searched the docs" status={tool().status} input={tool().input} output={tool().output} />}</Show>
      <Show when={props.turn.text}>
        <ChatResponse streaming={props.turn.streaming}>{shownText()}</ChatResponse>
      </Show>
      <Show when={!props.turn.streaming && props.turn.sources}>
        {(cited) => (
          <>
            <p class="chat-plain chat-cite-line">
              Sources: <ChatCitation index={1} source={cited()[0]!} />
              <ChatCitation index={2} source={cited()[1]!} />
            </p>
            <ChatSources sources={cited()} />
          </>
        )}
      </Show>
      <Show when={props.turn.tasks}>{(tasks) => <ChatTasks title="Rollout" tasks={tasks()} />}</Show>
      <Show when={props.turn.parts}>
        {(parts) => <ChatMessageParts parts={parts()} onApprove={(part, approved) => props.approve(props.turn.id, part, approved)} onRestore={() => props.restore(props.turn.id)} />}
      </Show>
    </ChatMessage>
  )
}

export { ChatDemo }
