import type { JSX } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/solid/avatar"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/solid/collapsible"
import { Toggle, ToggleGroup, createToggleGroupController } from "@ui-sdk/solid/toggle"
import { Toolbar, ToolbarButton } from "@ui-sdk/solid/toolbar"
import { createEffect, createSignal, For, onSettled, Show, untrack } from "solid-js"
import { Button } from "./button"
import { createScrollAreaController, ScrollBox } from "./scroll-area"
import { actionName } from "../../registry/uiset/ui/chat/opening"
import "../../registry/uiset/ui/chat/chat.css"

type Role = "user" | "assistant" | "system"

function Icon(props: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" class="chat-icon">
      <path d={props.path} />
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

function ChatThread(props: { label?: string; children: JSX.Element }) {
  // The scroll area follows new text until you scroll up (stickToEnd); away from the end,
  // Jump to latest brings you back.
  const area = createScrollAreaController()
  const [away, setAway] = createSignal(false)
  return (
    <div class="chat-thread">
      <ScrollBox
        data-frame="none"
        class="chat-thread-frame"
        stickToEnd
        controller={area}
        viewport={{
          class: "chat-thread-scroller",
          role: "region",
          "aria-label": props.label ?? "Conversation",
          onScroll: () => setAway(!area.isAtEnd()),
        }}
      >
        <div role="log" class="chat-thread-log">
          {props.children}
        </div>
      </ScrollBox>
      <Show when={away()}>
        <Button variant="outline" class="chat-thread-jump" onClick={() => area.scrollToEnd({ behavior: "smooth" })}>
          Jump to latest
        </Button>
      </Show>
    </div>
  )
}

function ChatEmpty(props: { title: string; children?: JSX.Element }) {
  return (
    <div class="chat-empty">
      <p class="chat-empty-title">{props.title}</p>
      {props.children}
    </div>
  )
}

function ChatMessage(props: {
  from: Role
  name?: string
  avatar?: { src?: string; fallback: string }
  time?: Date
  streaming?: boolean
  actions?: JSX.Element
  children: JSX.Element
}) {
  const who = () => props.name ?? (props.from === "user" ? "You" : props.from === "assistant" ? "Assistant" : "System")
  return (
    <div class="chat-message" data-from={props.from} data-streaming={props.streaming ? "" : undefined} aria-busy={props.streaming ? "true" : undefined}>
      <Show when={props.avatar}>
        {(avatar) => (
          <Avatar class="chat-message-avatar" role="img" aria-label={who()}>
            <Show when={avatar().src}>{(src) => <AvatarImage src={src()} alt="" />}</Show>
            <AvatarFallback>{avatar().fallback}</AvatarFallback>
          </Avatar>
        )}
      </Show>
      <div class="chat-message-body">
        <div class="chat-message-meta">
          <span class="chat-message-name">{who()}</span>
          <Show when={props.time}>{(time) => <time datetime={time().toISOString()}>{new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(time())}</time>}</Show>
        </div>
        <div class="chat-message-content">{props.children}</div>
        {props.actions}
      </div>
    </div>
  )
}

type Feedback = "good" | "bad" | null

function ChatMessageActions(props: {
  text?: string
  onRetry?: () => void
  onEdit?: () => void
  feedback?: Feedback
  onFeedbackChange?: (feedback: Feedback) => void
  /** The toolbar's name. By default, "Actions" and the message's first words. */
  label?: string
}) {
  const copy = async () => {
    if (!props.text) return
    await navigator.clipboard.writeText(props.text)
    announce("Copied")
  }
  // Every message has these actions, so each is named with its message's first words, from
  // `text` or else from the message on screen: an agent can tell which reply it presses. The
  // toolbar and the feedback group too, and without "message", which the composer is named.
  let toolbar: HTMLDivElement | undefined
  const [shown, setShown] = createSignal("", { ownedWrite: true })
  onSettled(() => {
    if (props.text !== undefined) return
    const content = toolbar?.closest(".chat-message")?.querySelector(".chat-message-content")
    if (!content) return
    const read = () => setShown(content.textContent ?? "")
    read()
    // The message's words can still be arriving: the names follow them.
    const watch = new MutationObserver(read)
    watch.observe(content, { childList: true, subtree: true, characterData: true })
    return () => watch.disconnect()
  })
  const named = (action: string) => actionName(action, props.text ?? shown())
  // UI SDK beta.16's Solid ToggleGroup tears (EFFECT_RELAY_TEAR) when a controlled `value`
  // changes, so the group keeps its own value and the page's `feedback` reaches it through its
  // controller, only when the two differ.
  const group = createToggleGroupController<string>()
  // A change the page made isn't reported back to it.
  let applying = false
  createEffect(
    () => props.feedback ?? null,
    (feedback) => {
      // Untracked: this follows the page's value, not the group's own.
      untrack(() => {
        // No group on the page (no onFeedbackChange) has nothing to show.
        const now = group.getValue() as string[] | undefined
        if (!now || (now[0] ?? null) === feedback) return
        applying = true
        group.setValue(feedback ? [feedback] : [])
        applying = false
      })
    },
  )
  return (
    <Toolbar ref={(el: HTMLDivElement) => (toolbar = el)} aria-label={props.label ?? named("Actions")} class="chat-actions">
      <Show when={props.text !== undefined}>
        <ToolbarButton aria-label={named("Copy message")} onClick={copy}>
          <Icon path={icons.copy} />
        </ToolbarButton>
      </Show>
      <Show when={props.onRetry}>
        {(retry) => (
          <ToolbarButton aria-label={named("Retry message")} onClick={() => retry()()}>
            <Icon path={icons.retry} />
          </ToolbarButton>
        )}
      </Show>
      <Show when={props.onEdit}>
        {(edit) => (
          <ToolbarButton aria-label={named("Edit message")} onClick={() => edit()()}>
            <Icon path={icons.edit} />
          </ToolbarButton>
        )}
      </Show>
      <Show when={props.onFeedbackChange}>
        {(change) => (
          <ToggleGroup
            aria-label={named("Feedback")}
            controller={group}
            defaultValue={props.feedback ? [props.feedback] : []}
            onValueChange={(value) => {
              if (!applying) change()((value[0] as Feedback) ?? null)
            }}
          >
            <Toggle value="good" aria-label={named("Good response")}>
              <Icon path={icons.up} />
            </Toggle>
            <Toggle value="bad" aria-label={named("Bad response")}>
              <Icon path={icons.down} />
            </Toggle>
          </ToggleGroup>
        )}
      </Show>
    </Toolbar>
  )
}

function ChatBranch(props: { index: number; count: number; onIndexChange: (index: number) => void }) {
  return (
    <Show when={props.count >= 2}>
      <div class="chat-branch" role="group" aria-label="Versions">
        <Button variant="ghost" aria-label="Previous version" disabled={props.index === 0} onClick={() => props.onIndexChange(props.index - 1)}>
          <Icon path={icons.left} />
        </Button>
        <span aria-live="polite">
          {props.index + 1} of {props.count}
        </span>
        <Button variant="ghost" aria-label="Next version" disabled={props.index === props.count - 1} onClick={() => props.onIndexChange(props.index + 1)}>
          <Icon path={icons.right} />
        </Button>
      </div>
    </Show>
  )
}

function ChatSuggestions(props: { suggestions: string[]; onSelect: (suggestion: string) => void; label?: string }) {
  return (
    <Toolbar aria-label={props.label ?? "Suggestions"} class="chat-suggestions">
      <For each={props.suggestions}>{(suggestion) => <ToolbarButton onClick={() => props.onSelect(suggestion)}>{suggestion}</ToolbarButton>}</For>
    </Toolbar>
  )
}

function ChatShimmer(props: { children?: JSX.Element }) {
  return <span class="chat-shimmer">{props.children ?? "Thinking…"}</span>
}

type TaskStatus = "pending" | "running" | "done" | "failed"
type Task = { id: string; title: string; status: TaskStatus; detail?: string }

const taskWords: Record<TaskStatus, string> = {
  pending: "To do",
  running: "In progress",
  done: "Done",
  failed: "Failed",
}

function ChatTasks(props: { title?: string; tasks: Task[]; defaultOpen?: boolean }) {
  const done = () => props.tasks.filter((task) => task.status === "done").length
  return (
    <Collapsible class="chat-tasks" defaultOpen={props.defaultOpen ?? true}>
      <CollapsibleTrigger class="chat-disclosure">
        <span>{props.title ?? "Plan"}</span>
        <span class="chat-visually-hidden">, </span>
        <span class="chat-disclosure-meta">
          {done()} of {props.tasks.length} done
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ol class="chat-task-list">
          <For each={props.tasks} keyed={(task) => task.id}>
            {(task) => (
              <li data-status={task().status}>
                <span class="chat-task-mark" aria-hidden="true" />
                <span class="chat-task-title">{task().title}</span>
                <span class="chat-task-status">{taskWords[task().status]}</span>
                <Show when={task().detail}>
                  <span class="chat-task-detail">{task().detail}</span>
                </Show>
              </li>
            )}
          </For>
        </ol>
      </CollapsiblePanel>
    </Collapsible>
  )
}

export { ChatBranch, ChatEmpty, ChatMessage, ChatMessageActions, ChatShimmer, ChatSuggestions, ChatTasks, ChatThread, Icon as ChatIcon, icons as chatIcons }
export type { Feedback as ChatFeedback, Role as ChatRole, Task as ChatTask, TaskStatus as ChatTaskStatus }
