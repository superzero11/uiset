"use client"

import { Fragment, type ReactNode } from "react"
import { ChatTasks } from "./chat"
import { ChatCheckpoint, ChatReasoning, ChatSources, ChatSubagent, ChatTool, type ChatSubagentStatus, type ChatToolStatus } from "./chat-parts"
import { ChatResponse } from "./chat-response"

// Vercel AI SDK `UIMessage` parts, drawn with the chat kit's parts, as the Web Components chat
// draws them. The types are written out, so there's no dependency on the `ai` package; the
// kit adds three of its own: tasks, checkpoint and subagent.

type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied"

type ToolPart = {
  type: `tool-${string}` | "dynamic-tool"
  toolCallId?: string
  toolName?: string
  title?: string
  state?: ToolState
  input?: unknown
  output?: unknown
  errorText?: string
  approval?: { id: string; approved?: boolean }
}

type MessagePart =
  | { type: "text"; text: string; state?: "streaming" | "done" }
  | { type: "reasoning"; text: string; state?: "streaming" | "done"; seconds?: number }
  | { type: "source-url"; url: string; title?: string; sourceId?: string }
  | { type: "file"; mediaType: string; url: string; filename?: string }
  | { type: "step-start" }
  | { type: "tasks"; title?: string; tasks: { id: string; title: string; status: "pending" | "running" | "done" | "failed"; detail?: string }[] }
  | { type: "checkpoint"; id: string; label?: string; time?: string | Date }
  | { type: "subagent"; id: string; name: string; task?: string; status: ChatSubagentStatus; seconds?: number; parts: MessagePart[] }
  | ToolPart

const toolStatus: Record<ToolState, ChatToolStatus> = {
  "input-streaming": "pending",
  "input-available": "running",
  "approval-requested": "approval",
  "approval-responded": "running",
  "output-available": "done",
  "output-error": "error",
  "output-denied": "denied",
}

const isTool = (part: MessagePart): part is ToolPart => part.type === "dynamic-tool" || part.type.startsWith("tool-")
const safeFile = (url: string) => /^(data|blob):/i.test(url)

/**
 * Draws a message's parts: text as Markdown (completed while it streams), reasoning, tool
 * calls in every state with Allow and Deny when one waits for approval, sources (once the
 * answer is complete), files, a plan, checkpoints and subagent runs with their own steps.
 */
function ChatMessageParts({
  parts,
  onApprove,
  onRestore,
}: {
  parts: MessagePart[]
  /** A tool call waiting for approval was allowed or denied; with the AI SDK, pass it to
   *  `addToolApprovalResponse({ id: part.approval.id, approved })`. */
  onApprove?: (part: ToolPart, approved: boolean) => void
  onRestore?: (checkpoint: Extract<MessagePart, { type: "checkpoint" }>) => void
}) {
  const streaming = parts.some((p) => "state" in p && p.state === "streaming")
  const sources = parts.filter((p): p is Extract<MessagePart, { type: "source-url" }> => p.type === "source-url")
  const draw = (part: MessagePart, key: string): ReactNode => {
    if (part.type === "text") return <ChatResponse key={key} streaming={part.state === "streaming"}>{part.text}</ChatResponse>
    if (part.type === "reasoning")
      return (
        <ChatReasoning key={key} streaming={part.state === "streaming"} seconds={part.seconds}>
          {part.text}
        </ChatReasoning>
      )
    if (part.type === "file") {
      if (!safeFile(part.url)) return <span key={key}>{part.filename ?? "File"}</span>
      if (part.mediaType.startsWith("image/"))
        return (
          <figure key={key} className="chat-image">
            <img src={part.url} alt={part.filename ?? ""} loading="lazy" decoding="async" />
            {part.filename && <figcaption>{part.filename}</figcaption>}
          </figure>
        )
      return (
        <a key={key} href={part.url} download={part.filename ?? ""}>
          {part.filename ?? "File"}
        </a>
      )
    }
    if (part.type === "tasks") return <ChatTasks key={key} title={part.title} tasks={part.tasks} />
    if (part.type === "checkpoint")
      return (
        <ChatCheckpoint
          key={key}
          label={part.label}
          time={part.time === undefined ? undefined : new Date(part.time)}
          onRestore={onRestore ? () => onRestore(part) : undefined}
        />
      )
    if (part.type === "subagent")
      return (
        <ChatSubagent key={key} name={part.name} task={part.task} status={part.status} seconds={part.seconds}>
          {part.parts.map((inner, i) => draw(inner, `${key}:${i}`))}
        </ChatSubagent>
      )
    if (isTool(part)) {
      const name = part.toolName ?? part.type.replace(/^tool-/, "")
      return (
        <ChatTool
          key={key}
          name={name}
          title={part.title}
          status={toolStatus[part.state ?? "input-available"] ?? "running"}
          input={part.input}
          output={part.output}
          error={part.errorText}
          onApprove={onApprove ? (approved) => onApprove(part, approved) : undefined}
        />
      )
    }
    return null
  }
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={(part as { toolCallId?: string; id?: string }).toolCallId ?? (part as { id?: string }).id ?? i}>
          {part.type === "source-url" ? null : draw(part, String(i))}
        </Fragment>
      ))}
      {/* Sources come once the answer is complete, so they don't sit ahead of text still arriving. */}
      {!streaming && sources.length > 0 && <ChatSources sources={sources.map((s) => ({ href: s.url, title: s.title ?? s.url }))} />}
    </>
  )
}

export { ChatMessageParts }
export type { MessagePart as ChatMessagePart, ToolPart as ChatToolPart, ToolState as ChatToolState }
