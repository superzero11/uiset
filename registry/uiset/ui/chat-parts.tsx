"use client"

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@ui-sdk/react/collapsible"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@ui-sdk/react/hover-card"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "./button"
import { ChatShimmer } from "./chat"
import { ScrollBox } from "./scroll-area"
import "./chat/chat.css"

// Opens while the model thinks, closes when it's done, unless the person chose.
function ChatReasoning({
  streaming = false,
  seconds,
  children,
}: {
  streaming?: boolean
  seconds?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(streaming)
  const chosen = useRef(false)

  useEffect(() => {
    if (!chosen.current) setOpen(streaming)
  }, [streaming])

  return (
    <Collapsible
      className="chat-reasoning"
      open={open}
      onOpenChange={(next) => {
        // Only people and agents call this; the streaming effect sets `open` directly.
        chosen.current = true
        setOpen(next)
      }}
    >
      <CollapsibleTrigger className="chat-disclosure">
        {streaming ? (
          <ChatShimmer>Thinking…</ChatShimmer>
        ) : (
          <span>
            {seconds ? `Thought for ${Math.max(1, Math.round(seconds))}s` : "Reasoning"}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsiblePanel className="chat-reasoning-panel">{children}</CollapsiblePanel>
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

function ChatTool({
  name,
  title,
  status,
  input,
  output,
  error,
  defaultOpen,
  onApprove,
  children,
}: {
  name: string
  title?: string
  status: ToolStatus
  input?: unknown
  output?: unknown
  error?: string
  defaultOpen?: boolean
  /** With status "approval": Deny and Allow, each calling this with the answer. */
  onApprove?: (approved: boolean) => void
  children?: ReactNode
}) {
  return (
    <Collapsible
      className="chat-tool"
      data-status={status}
      defaultOpen={defaultOpen ?? (status === "approval" || status === "error")}
    >
      <CollapsibleTrigger className="chat-disclosure">
        <span className="chat-tool-name">
          <span className="chat-tool-mark" aria-hidden="true" />
          <span translate="no">{title ?? name}</span>
        </span>
        <span className="chat-visually-hidden">, </span>
        <span className="chat-tool-status">{toolWords[status]}</span>
      </CollapsibleTrigger>
      <CollapsiblePanel className="chat-tool-panel">
        {input !== undefined && (
          <section>
            <h4>Input</h4>
            <ScrollBox
              axis="both"
              data-frame="none"
              dir="ltr"
              className="chat-tool-code"
              viewport={{ role: "region", "aria-label": `${title ?? name} input` }}
            >
              <pre>
                <code translate="no">{json(input)}</code>
              </pre>
            </ScrollBox>
          </section>
        )}
        {error ? (
          <section>
            <h4>Error</h4>
            <p className="chat-tool-error">{error}</p>
          </section>
        ) : (
          output !== undefined && (
            <section>
              <h4>Output</h4>
              <ScrollBox
                axis="both"
                data-frame="none"
                dir="ltr"
                className="chat-tool-code"
                viewport={{ role: "region", "aria-label": `${title ?? name} output` }}
              >
                <pre>
                  <code translate="no">{json(output)}</code>
                </pre>
              </ScrollBox>
            </section>
          )
        )}
        {status === "approval" && onApprove && (
          <div className="chat-dialog-actions">
            <Button variant="outline" onClick={() => onApprove(false)}>
              Deny
            </Button>
            {/* An agent asks a person before it lets a tool run. */}
            <Button data-agent-confirm={`Runs ${title ?? name}`} onClick={() => onApprove(true)}>
              Allow
            </Button>
          </div>
        )}
        {children}
      </CollapsiblePanel>
    </Collapsible>
  )
}

const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })

/**
 * A point the conversation can go back to: "Checkpoint, 2:14 PM" and Restore. Restoring asks
 * an agent to check with a person first.
 */
function ChatCheckpoint({ label = "Checkpoint", time, onRestore }: { label?: string; time?: Date; onRestore?: () => void }) {
  const when = time ? clock.format(time) : undefined
  return (
    <div className="chat-checkpoint" data-slot="chat-checkpoint">
      <span className="chat-checkpoint-text">
        {label}
        {time && (
          <>
            , <time dateTime={time.toISOString()}>{when}</time>
          </>
        )}
      </span>
      {onRestore && (
        <Button
          variant="ghost"
          aria-label={`Restore ${label}${when ? `, ${when}` : ""}`}
          data-agent-confirm="Puts the conversation back to this checkpoint"
          onClick={onRestore}
        >
          Restore
        </Button>
      )}
    </div>
  )
}

type SubagentStatus = "running" | "done" | "failed"

/**
 * A run the agent handed off: its name, task and status, opening to its own steps. Working
 * while it runs, then "Done in 12s" or "Failed" (open, so the reason shows).
 */
function ChatSubagent({
  name,
  task,
  status,
  seconds,
  defaultOpen,
  children,
}: {
  name: string
  task?: string
  status: SubagentStatus
  seconds?: number
  defaultOpen?: boolean
  children?: ReactNode
}) {
  return (
    <Collapsible className="chat-subagent" data-status={status} defaultOpen={defaultOpen ?? status === "failed"}>
      <CollapsibleTrigger className="chat-disclosure">
        <span className="chat-tool-name">
          <span className="chat-tool-mark" aria-hidden="true" />
          <span>{name}</span>
        </span>
        {task && (
          <>
            <span className="chat-visually-hidden">, </span>
            <span className="chat-subagent-task">{task}</span>
          </>
        )}
        <span className="chat-visually-hidden">, </span>
        <span className="chat-tool-status">
          {status === "running" ? <ChatShimmer>Working…</ChatShimmer> : status === "failed" ? "Failed" : seconds ? `Done in ${Math.max(1, Math.round(seconds))}s` : "Done"}
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel className="chat-subagent-panel">{children}</CollapsiblePanel>
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

function ChatSources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null
  return (
    <Collapsible className="chat-sources">
      <CollapsibleTrigger className="chat-disclosure">
        <span>
          Used {sources.length} source{sources.length === 1 ? "" : "s"}
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ol className="chat-source-list">
          {sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noopener noreferrer">
                {source.title}
                <span className="chat-visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="chat-source-host">{host(source.href)}</span>
            </li>
          ))}
        </ol>
      </CollapsiblePanel>
    </Collapsible>
  )
}

function ChatCitation({ index, source }: { index: number; source: Source }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        className="chat-citation"
        render={<a href={source.href} target="_blank" rel="noopener noreferrer" />}
        aria-label={`Source ${index}: ${source.title}`}
      >
        {index}
      </HoverCardTrigger>
      <HoverCardContent className="chat-citation-card">
        <p className="chat-citation-title">{source.title}</p>
        <p className="chat-source-host">{host(source.href)}</p>
        {source.description && <p>{source.description}</p>}
      </HoverCardContent>
    </HoverCard>
  )
}

function ChatImage({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
}) {
  return (
    <figure className="chat-image">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

export { ChatCheckpoint, ChatCitation, ChatImage, ChatReasoning, ChatSources, ChatSubagent, ChatTool }
export type { Source as ChatSource, SubagentStatus as ChatSubagentStatus, ToolStatus as ChatToolStatus }
