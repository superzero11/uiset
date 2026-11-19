"use client"

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@ui-sdk/react/collapsible"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@ui-sdk/react/hover-card"
import { useEffect, useRef, useState, type ReactNode } from "react"
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
  children,
}: {
  name: string
  title?: string
  status: ToolStatus
  input?: unknown
  output?: unknown
  error?: string
  defaultOpen?: boolean
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
        {children}
      </CollapsiblePanel>
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

export { ChatCitation, ChatImage, ChatReasoning, ChatSources, ChatTool }
export type { Source as ChatSource, ToolStatus as ChatToolStatus }
