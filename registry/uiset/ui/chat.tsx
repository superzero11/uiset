"use client"

import { announce } from "@ui-sdk/core"
import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/react/avatar"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@ui-sdk/react/collapsible"
import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle"
import { Toolbar, ToolbarButton } from "@ui-sdk/react/toolbar"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "./button"
import { actionName } from "./chat/opening"
import { createScrollAreaController, ScrollBox } from "./scroll-area"
import "./chat/chat.css"

type Role = "user" | "assistant" | "system"

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="chat-icon">
      <path d={path} />
    </svg>
  )
}

const icons = {
  copy: "M8 8h11v11H8zM5 16V5h11",
  check: "M5 12.5l4.5 4.5L19 7.5",
  retry: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  up: "M7 11v9H4v-9zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.5 20H7",
  down: "M7 13V4H4v9zM7 13l4 8a2.5 2.5 0 0 0 2.5-2.5V15h5.2a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 17.5 4H7",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
}

function ChatThread({
  label = "Conversation",
  children,
}: {
  label?: string
  children: ReactNode
}) {
  // The scroll area follows new text until you scroll up (stickToEnd); away from the end,
  // Jump to latest brings you back.
  const [area] = useState(createScrollAreaController)
  const [away, setAway] = useState(false)

  return (
    <div className="chat-thread">
      <ScrollBox
        data-frame="none"
        className="chat-thread-frame"
        stickToEnd
        controller={area}
        viewport={{
          className: "chat-thread-scroller",
          role: "region",
          "aria-label": label,
          onScroll: () => setAway(!area.isAtEnd()),
        }}
      >
        <div role="log" className="chat-thread-log">
          {children}
        </div>
      </ScrollBox>
      {away && (
        <Button
          variant="outline"
          className="chat-thread-jump"
          onClick={() => area.scrollToEnd({ behavior: "smooth" })}
        >
          Jump to latest
        </Button>
      )}
    </div>
  )
}

function ChatEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="chat-empty">
      <p className="chat-empty-title">{title}</p>
      {children}
    </div>
  )
}

function ChatMessage({
  from,
  name,
  avatar,
  time,
  streaming = false,
  actions,
  children,
}: {
  from: Role
  name?: string
  avatar?: { src?: string; fallback: string }
  time?: Date
  streaming?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  const who =
    name ?? (from === "user" ? "You" : from === "assistant" ? "Assistant" : "System")
  return (
    <div
      className="chat-message"
      data-from={from}
      data-streaming={streaming ? "" : undefined}
      aria-busy={streaming || undefined}
    >
      {avatar && (
        <Avatar className="chat-message-avatar" role="img" aria-label={who}>
          {avatar.src && <AvatarImage src={avatar.src} alt="" />}
          <AvatarFallback>{avatar.fallback}</AvatarFallback>
        </Avatar>
      )}
      <div className="chat-message-body">
        <div className="chat-message-meta">
          <span className="chat-message-name">{who}</span>
          {time && (
            <time dateTime={time.toISOString()}>
              {new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(time)}
            </time>
          )}
        </div>
        <div className="chat-message-content">{children}</div>
        {actions}
      </div>
    </div>
  )
}

type Feedback = "good" | "bad" | null

function ChatMessageActions({
  text,
  onRetry,
  onEdit,
  feedback,
  onFeedbackChange,
  label,
}: {
  text?: string
  onRetry?: () => void
  onEdit?: () => void
  feedback?: Feedback
  onFeedbackChange?: (feedback: Feedback) => void
  /** The toolbar's name. By default, "Actions" and the message's first words. */
  label?: string
}) {
  const copy = async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    announce("Copied")
  }
  // Every message has these actions, so each is named with its message's first words, from
  // `text` or else from the message on screen: an agent can tell which reply it presses. The
  // toolbar and the feedback group too, and without "message", which the composer is named.
  const toolbar = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState("")
  useEffect(() => {
    if (text !== undefined) return
    setShown(toolbar.current?.closest(".chat-message")?.querySelector(".chat-message-content")?.textContent ?? "")
  })
  const named = (action: string) => actionName(action, text ?? shown)
  return (
    <Toolbar ref={toolbar} aria-label={label ?? named("Actions")} className="chat-actions">
      {text !== undefined && (
        <ToolbarButton aria-label={named("Copy message")} onClick={copy}>
          <Icon path={icons.copy} />
        </ToolbarButton>
      )}
      {onRetry && (
        <ToolbarButton aria-label={named("Retry message")} onClick={onRetry}>
          <Icon path={icons.retry} />
        </ToolbarButton>
      )}
      {onEdit && (
        <ToolbarButton aria-label={named("Edit message")} onClick={onEdit}>
          <Icon path={icons.edit} />
        </ToolbarButton>
      )}
      {onFeedbackChange && (
        <ToggleGroup
          aria-label={named("Feedback")}
          value={feedback ? [feedback] : []}
          onValueChange={(value) => onFeedbackChange((value[0] as Feedback) ?? null)}
        >
          <Toggle value="good" aria-label={named("Good response")}>
            <Icon path={icons.up} />
          </Toggle>
          <Toggle value="bad" aria-label={named("Bad response")}>
            <Icon path={icons.down} />
          </Toggle>
        </ToggleGroup>
      )}
    </Toolbar>
  )
}

function ChatBranch({
  index,
  count,
  onIndexChange,
}: {
  index: number
  count: number
  onIndexChange: (index: number) => void
}) {
  if (count < 2) return null
  return (
    <div className="chat-branch" role="group" aria-label="Versions">
      <Button
        variant="ghost"
        aria-label="Previous version"
        disabled={index === 0}
        onClick={() => onIndexChange(index - 1)}
      >
        <Icon path={icons.left} />
      </Button>
      <span aria-live="polite">
        {index + 1} of {count}
      </span>
      <Button
        variant="ghost"
        aria-label="Next version"
        disabled={index === count - 1}
        onClick={() => onIndexChange(index + 1)}
      >
        <Icon path={icons.right} />
      </Button>
    </div>
  )
}

function ChatSuggestions({
  suggestions,
  onSelect,
  label = "Suggestions",
}: {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  label?: string
}) {
  return (
    <Toolbar aria-label={label} className="chat-suggestions">
      {suggestions.map((suggestion) => (
        <ToolbarButton key={suggestion} onClick={() => onSelect(suggestion)}>
          {suggestion}
        </ToolbarButton>
      ))}
    </Toolbar>
  )
}

function ChatShimmer({ children = "Thinking…" }: { children?: ReactNode }) {
  return <span className="chat-shimmer">{children}</span>
}

type TaskStatus = "pending" | "running" | "done" | "failed"
type Task = { id: string; title: string; status: TaskStatus; detail?: string }

const taskWords: Record<TaskStatus, string> = {
  pending: "To do",
  running: "In progress",
  done: "Done",
  failed: "Failed",
}

function ChatTasks({
  title = "Plan",
  tasks,
  defaultOpen = true,
}: {
  title?: string
  tasks: Task[]
  defaultOpen?: boolean
}) {
  const done = tasks.filter((task) => task.status === "done").length
  return (
    <Collapsible className="chat-tasks" defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="chat-disclosure">
        <span>{title}</span>
        <span className="chat-visually-hidden">, </span>
        <span className="chat-disclosure-meta">
          {done} of {tasks.length} done
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ol className="chat-task-list">
          {tasks.map((task) => (
            <li key={task.id} data-status={task.status}>
              <span className="chat-task-mark" aria-hidden="true" />
              <span className="chat-task-title">{task.title}</span>
              <span className="chat-task-status">{taskWords[task.status]}</span>
              {task.detail && <span className="chat-task-detail">{task.detail}</span>}
            </li>
          ))}
        </ol>
      </CollapsiblePanel>
    </Collapsible>
  )
}

export {
  ChatBranch,
  ChatEmpty,
  ChatMessage,
  ChatMessageActions,
  ChatShimmer,
  ChatSuggestions,
  ChatTasks,
  ChatThread,
  Icon as ChatIcon,
  icons as chatIcons,
}
export type {
  Feedback as ChatFeedback,
  Role as ChatRole,
  Task as ChatTask,
  TaskStatus as ChatTaskStatus,
}
