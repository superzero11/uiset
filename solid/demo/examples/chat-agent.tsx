import { createSignal, onCleanup } from "solid-js"
import { ChatQueue, type ChatQueuedMessage } from "../../src/chat-composer"
import { ChatMessageParts, type ChatMessagePart, type ChatToolPart } from "../../src/chat-message-parts"

const start: ChatMessagePart[] = [
  { type: "checkpoint", id: "cp-1", label: "Checkpoint", time: "2026-11-20T14:14:00Z" },
  { type: "reasoning", text: "The fix is ready. Deploying a preview is outside the sandbox, so it needs a yes first.", seconds: 3 },
  {
    type: "subagent",
    id: "sub-1",
    name: "Researcher",
    task: "Find where the date format comes from",
    status: "done",
    seconds: 12,
    parts: [
      { type: "tool-searchCode", toolCallId: "t-1", title: "Search code", state: "output-available", input: { query: "toLocaleDateString" }, output: { files: ["src/date.ts"] } },
      { type: "text", text: "It's `formatDate` in `src/date.ts`, which ignores the locale." },
    ],
  },
  {
    type: "tasks",
    title: "Plan",
    tasks: [
      { id: "a", title: "Pass the locale to formatDate", status: "done" },
      { id: "b", title: "Deploy a preview", status: "running" },
      { id: "c", title: "Check the preview in German", status: "pending" },
    ],
  },
  { type: "tool-deployPreview", toolCallId: "t-2", title: "Deploy preview", state: "approval-requested", input: { branch: "fix/date-locale" }, approval: { id: "ap-1" } },
]

/** An agent's answer drawn from AI SDK parts: a checkpoint, a subagent's run, a plan and a tool waiting for approval; and messages queued meanwhile. */
export default function ChatAgentExample() {
  const [parts, setParts] = createSignal(start)
  const [note, setNote] = createSignal("")
  const [queue, setQueue] = createSignal<ChatQueuedMessage[]>([
    { id: "q-1", text: "Also check the French locale" },
    { id: "q-2", text: "Then open a pull request" },
  ])
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))

  const update = (id: string | undefined, next: Partial<ChatToolPart>) =>
    setParts((all) => all.map((p) => ((p as ChatToolPart).toolCallId === id ? ({ ...p, ...next } as ChatMessagePart) : p)))

  const approve = (part: ChatToolPart, approved: boolean) => {
    if (!approved) {
      update(part.toolCallId, { state: "output-denied" })
      setNote("Denied: the preview wasn't deployed.")
      return
    }
    update(part.toolCallId, { state: "approval-responded" })
    timer = setTimeout(() => update(part.toolCallId, { state: "output-available", output: { url: "https://preview.example.com/fix-date-locale" } }), 900)
    setNote("Allowed: deploying the preview.")
  }

  return (
    <div class="stack chat-agent-example">
      <ChatMessageParts
        parts={parts()}
        onApprove={approve}
        onRestore={() => {
          setParts(start)
          setNote("Restored to the checkpoint.")
        }}
      />
      <p class="example-note" role="status">
        {note()}
      </p>
      <ChatQueue
        items={queue()}
        onRemove={(id) => setQueue((q) => q.filter((m) => m.id !== id))}
        onSendNow={(id) => {
          setQueue((q) => q.filter((m) => m.id !== id))
          setNote("Sent now.")
        }}
      />
    </div>
  )
}
