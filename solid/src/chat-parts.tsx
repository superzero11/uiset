import type { JSX } from "@solidjs/web"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/solid/collapsible"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@ui-sdk/solid/hover-card"
import { createSignal, For, Show } from "solid-js"
import { Button } from "./button"
import { ChatShimmer } from "./chat"
import { ScrollBox } from "./scroll-area"
import "../../registry/uiset/ui/chat/chat.css"

// Opens while the model thinks, closes when it's done, unless the person chose.
function ChatReasoning(props: { streaming?: boolean; seconds?: number; children: JSX.Element }) {
  const [chosen, setChosen] = createSignal<boolean | null>(null)
  const open = () => chosen() ?? !!props.streaming
  return (
    <Collapsible
      class="chat-reasoning"
      open={open()}
      onOpenChange={(next) => {
        // Only people and agents call this; while no one has chosen, it follows the stream.
        setChosen(next)
      }}
    >
      <CollapsibleTrigger class="chat-disclosure">
        <Show when={props.streaming} fallback={<span>{props.seconds ? `Thought for ${Math.max(1, Math.round(props.seconds))}s` : "Reasoning"}</span>}>
          <ChatShimmer>Thinking…</ChatShimmer>
        </Show>
      </CollapsibleTrigger>
      <CollapsiblePanel class="chat-reasoning-panel">{props.children}</CollapsiblePanel>
    </Collapsible>
  )
}

type ToolStatus = "pending" | "running" | "approval" | "done" | "error" | "denied"

const toolWords: Record<ToolStatus, string> = {
  pending: "Queued",
  running: "Running",
  approval: "Needs your approval",
  done: "Done",
  error: "Failed",
  denied: "Not allowed",
}

function json(value: unknown) {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** A tool call's input or output, in a scrolling box of its own. */
function ToolCode(props: { heading: string; label: string; value: unknown }) {
  return (
    <section>
      <h4>{props.heading}</h4>
      <ScrollBox axis="both" data-frame="none" dir="ltr" class="chat-tool-code" viewport={{ role: "region", "aria-label": props.label }}>
        <pre>
          <code translate="no">{json(props.value)}</code>
        </pre>
      </ScrollBox>
    </section>
  )
}

function ChatTool(props: {
  name: string
  title?: string
  status: ToolStatus
  input?: unknown
  output?: unknown
  error?: string
  defaultOpen?: boolean
  /** With status "approval": Deny and Allow, each calling this with the answer. */
  onApprove?: (approved: boolean) => void
  children?: JSX.Element
}) {
  const shown = () => props.title ?? props.name
  return (
    <Collapsible class="chat-tool" data-status={props.status} defaultOpen={props.defaultOpen ?? (props.status === "approval" || props.status === "error")}>
      <CollapsibleTrigger class="chat-disclosure">
        <span class="chat-tool-name">
          <span class="chat-tool-mark" aria-hidden="true" />
          <span translate="no">{shown()}</span>
        </span>
        <span class="chat-visually-hidden">, </span>
        <span class="chat-tool-status">{toolWords[props.status]}</span>
      </CollapsibleTrigger>
      <CollapsiblePanel class="chat-tool-panel">
        <Show when={props.input !== undefined}>
          <ToolCode heading="Input" label={`${shown()} input`} value={props.input} />
        </Show>
        <Show when={props.error} fallback={<Show when={props.output !== undefined}><ToolCode heading="Output" label={`${shown()} output`} value={props.output} /></Show>}>
          <section>
            <h4>Error</h4>
            <p class="chat-tool-error">{props.error}</p>
          </section>
        </Show>
        <Show when={props.status === "approval" && props.onApprove}>
          {(approve) => (
            <div class="chat-dialog-actions">
              <Button variant="outline" onClick={() => approve()(false)}>
                Deny
              </Button>
              {/* An agent asks a person before it lets a tool run. */}
              <Button data-agent-confirm={`Runs ${shown()}`} onClick={() => approve()(true)}>
                Allow
              </Button>
            </div>
          )}
        </Show>
        {props.children}
      </CollapsiblePanel>
    </Collapsible>
  )
}

const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })

/**
 * A point the conversation can go back to: "Checkpoint, 2:14 PM" and Restore. Restoring asks
 * an agent to check with a person first.
 */
function ChatCheckpoint(props: { label?: string; time?: Date; onRestore?: () => void }) {
  const label = () => props.label ?? "Checkpoint"
  const when = () => (props.time ? clock.format(props.time) : undefined)
  return (
    <div class="chat-checkpoint" data-slot="chat-checkpoint">
      <span class="chat-checkpoint-text">
        {label()}
        <Show when={props.time}>
          {(time) => (
            <>
              , <time datetime={time().toISOString()}>{when()}</time>
            </>
          )}
        </Show>
      </span>
      <Show when={props.onRestore}>
        {(restore) => (
          <Button variant="ghost" aria-label={`Restore ${label()}${when() ? `, ${when()}` : ""}`} data-agent-confirm="Puts the conversation back to this checkpoint" onClick={() => restore()()}>
            Restore
          </Button>
        )}
      </Show>
    </div>
  )
}

type SubagentStatus = "running" | "done" | "failed"

/**
 * A run the agent handed off: its name, task and status, opening to its own steps. Working
 * while it runs, then "Done in 12s" or "Failed" (open, so the reason shows).
 */
function ChatSubagent(props: { name: string; task?: string; status: SubagentStatus; seconds?: number; defaultOpen?: boolean; children?: JSX.Element }) {
  return (
    <Collapsible class="chat-subagent" data-status={props.status} defaultOpen={props.defaultOpen ?? props.status === "failed"}>
      <CollapsibleTrigger class="chat-disclosure">
        <span class="chat-tool-name">
          <span class="chat-tool-mark" aria-hidden="true" />
          <span>{props.name}</span>
        </span>
        <Show when={props.task}>
          <span class="chat-visually-hidden">, </span>
          <span class="chat-subagent-task">{props.task}</span>
        </Show>
        <span class="chat-visually-hidden">, </span>
        <span class="chat-tool-status">
          <Show
            when={props.status === "running"}
            fallback={props.status === "failed" ? "Failed" : props.seconds ? `Done in ${Math.max(1, Math.round(props.seconds))}s` : "Done"}
          >
            <ChatShimmer>Working…</ChatShimmer>
          </Show>
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel class="chat-subagent-panel">{props.children}</CollapsiblePanel>
    </Collapsible>
  )
}

type Source = { href: string; title: string; description?: string }

function host(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return href
  }
}

function ChatSources(props: { sources: Source[] }) {
  return (
    <Show when={props.sources.length > 0}>
      <Collapsible class="chat-sources">
        <CollapsibleTrigger class="chat-disclosure">
          <span>
            Used {props.sources.length} source{props.sources.length === 1 ? "" : "s"}
          </span>
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <ol class="chat-source-list">
            <For each={props.sources} keyed={(source) => source.href}>
              {(source) => (
                <li>
                  <a href={source().href} target="_blank" rel="noopener noreferrer">
                    {source().title}
                    <span class="chat-visually-hidden"> (opens in a new tab)</span>
                  </a>
                  <span class="chat-source-host">{host(source().href)}</span>
                </li>
              )}
            </For>
          </ol>
        </CollapsiblePanel>
      </Collapsible>
    </Show>
  )
}

function ChatCitation(props: { index: number; source: Source }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        class="chat-citation"
        render={(part: JSX.HTMLAttributes<HTMLAnchorElement>) => <a {...part} href={props.source.href} target="_blank" rel="noopener noreferrer" />}
        aria-label={`Source ${props.index}: ${props.source.title}`}
      >
        {props.index}
      </HoverCardTrigger>
      <HoverCardContent class="chat-citation-card">
        <p class="chat-citation-title">{props.source.title}</p>
        <p class="chat-source-host">{host(props.source.href)}</p>
        <Show when={props.source.description}>
          <p>{props.source.description}</p>
        </Show>
      </HoverCardContent>
    </HoverCard>
  )
}

function ChatImage(props: { src: string; alt: string; width: number; height: number; caption?: string }) {
  return (
    <figure class="chat-image">
      <img src={props.src} alt={props.alt} width={props.width} height={props.height} loading="lazy" decoding="async" />
      <Show when={props.caption}>
        <figcaption>{props.caption}</figcaption>
      </Show>
    </figure>
  )
}

export { ChatCheckpoint, ChatCitation, ChatImage, ChatReasoning, ChatSources, ChatSubagent, ChatTool }
export type { Source as ChatSource, SubagentStatus as ChatSubagentStatus, ToolStatus as ChatToolStatus }
