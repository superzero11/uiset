import { createMemo, For, Match, Show, Switch } from "solid-js"
import { ChatTasks } from "./chat"
import { ChatCheckpoint, ChatReasoning, ChatSources, ChatSubagent, ChatTool, type ChatSubagentStatus, type ChatToolStatus } from "./chat-parts"
import { ChatResponse } from "./chat-response"

// Vercel AI SDK `UIMessage` parts, drawn with the chat kit's parts, as React's and the Web
// Components chat draw them. The types are written out, so there's no dependency on the `ai`
// package; the kit adds three of its own: tasks, checkpoint and subagent.

type ToolState = "input-streaming" | "input-available" | "approval-requested" | "approval-responded" | "output-available" | "output-error" | "output-denied"

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

type Of<T extends MessagePart["type"]> = Extract<MessagePart, { type: T }>

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
const as = <T extends MessagePart["type"]>(part: MessagePart, type: T) => (part.type === type ? (part as Of<T>) : false)

type Handlers = {
  onApprove?: (part: ToolPart, approved: boolean) => void
  onRestore?: (checkpoint: Of<"checkpoint">) => void
}

/** Each part with a key that follows it: its call or its own id, else its place. */
function keyed(parts: MessagePart[]) {
  return parts.map((part, index) => ({ key: (part as { toolCallId?: string }).toolCallId ?? (part as { id?: string }).id ?? `#${index}`, part }))
}

function Part(props: Handlers & { part: MessagePart }) {
  return (
    <Switch>
      <Match when={as(props.part, "text")}>{(part) => <ChatResponse streaming={part().state === "streaming"}>{part().text}</ChatResponse>}</Match>
      <Match when={as(props.part, "reasoning")}>
        {(part) => (
          <ChatReasoning streaming={part().state === "streaming"} seconds={part().seconds}>
            {part().text}
          </ChatReasoning>
        )}
      </Match>
      <Match when={as(props.part, "file")}>
        {(part) => (
          <Show when={safeFile(part().url)} fallback={<span>{part().filename ?? "File"}</span>}>
            <Show
              when={part().mediaType.startsWith("image/")}
              fallback={
                <a href={part().url} download={part().filename ?? ""}>
                  {part().filename ?? "File"}
                </a>
              }
            >
              <figure class="chat-image">
                <img src={part().url} alt={part().filename ?? ""} loading="lazy" decoding="async" />
                <Show when={part().filename}>
                  <figcaption>{part().filename}</figcaption>
                </Show>
              </figure>
            </Show>
          </Show>
        )}
      </Match>
      <Match when={as(props.part, "tasks")}>{(part) => <ChatTasks title={part().title} tasks={part().tasks} />}</Match>
      <Match when={as(props.part, "checkpoint")}>
        {(part) => (
          <ChatCheckpoint
            label={part().label}
            time={part().time === undefined ? undefined : new Date(part().time!)}
            onRestore={props.onRestore ? () => props.onRestore?.(part()) : undefined}
          />
        )}
      </Match>
      <Match when={as(props.part, "subagent")}>
        {(part) => (
          <ChatSubagent name={part().name} task={part().task} status={part().status} seconds={part().seconds}>
            <For each={keyed(part().parts)} keyed={(entry) => entry.key}>
              {(entry) => (
                <Show when={entry().part.type !== "source-url"}>
                  <Part part={entry().part} onApprove={props.onApprove} onRestore={props.onRestore} />
                </Show>
              )}
            </For>
          </ChatSubagent>
        )}
      </Match>
      <Match when={isTool(props.part) && props.part}>
        {(part) => (
          <ChatTool
            name={part().toolName ?? part().type.replace(/^tool-/, "")}
            title={part().title}
            status={toolStatus[part().state ?? "input-available"] ?? "running"}
            input={part().input}
            output={part().output}
            error={part().errorText}
            onApprove={props.onApprove ? (approved) => props.onApprove?.(part(), approved) : undefined}
          />
        )}
      </Match>
    </Switch>
  )
}

/**
 * Draws a message's parts: text as Markdown (completed while it streams), reasoning, tool
 * calls in every state with Allow and Deny when one waits for approval, sources (once the
 * answer is complete), files, a plan, checkpoints and subagent runs with their own steps.
 */
function ChatMessageParts(
  props: Handlers & {
    parts: MessagePart[]
  },
) {
  const streaming = () => props.parts.some((part) => "state" in part && part.state === "streaming")
  const sources = createMemo(() => props.parts.filter((part): part is Of<"source-url"> => part.type === "source-url"))
  return (
    <>
      <For each={keyed(props.parts)} keyed={(entry) => entry.key}>
        {(entry) => (
          <Show when={entry().part.type !== "source-url"}>
            <Part part={entry().part} onApprove={props.onApprove} onRestore={props.onRestore} />
          </Show>
        )}
      </For>
      {/* Sources come once the answer is complete, so they don't sit ahead of text still arriving. */}
      <Show when={!streaming() && sources().length > 0}>
        <ChatSources sources={sources().map((source) => ({ href: source.url, title: source.title ?? source.url }))} />
      </Show>
    </>
  )
}

export { ChatMessageParts }
export type { MessagePart as ChatMessagePart, ToolPart as ChatToolPart, ToolState as ChatToolState }
