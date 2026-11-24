import type { JSX } from "@solidjs/web"
import { AlertDialog, AlertDialogBackdrop, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@ui-sdk/solid/alert-dialog"
import { Field, FieldLabel } from "@ui-sdk/solid/field"
import { Input } from "@ui-sdk/solid/input"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/solid/menu"
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/solid/popover"
import { createSignal, For, Show, untrack } from "solid-js"
import { Button } from "./button"
import { ChatIcon } from "./chat"
import "../../registry/uiset/ui/chat/chat.css"

type Thread = { id: string; title: string; updatedAt?: Date }

const more = "M5 12h.01M12 12h.01M19 12h.01"
const bubble = "M4 5h16v11H9l-5 4z"
const close = "M6 6l12 12M18 6L6 18"

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" })

function ago(date: Date) {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, "hour")
  return relative.format(Math.round(hours / 24), "day")
}

/**
 * A chat's title as a field to retype. Focus comes to it from the menu: closing with its
 * trigger gone, UI SDK's menu hands focus to the first usable part in the trigger's place.
 */
function RenameField(props: { title: string; onDone: (title: string | null, keys: boolean) => void }) {
  return (
    <Field class="chat-thread-rename">
      <FieldLabel class="chat-visually-hidden">Rename {props.title}</FieldLabel>
      <Input
        defaultValue={props.title}
        onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
          if (event.key === "Enter") props.onDone(event.currentTarget.value, true)
          if (event.key === "Escape") props.onDone(null, true)
        }}
        onBlur={(event: FocusEvent & { currentTarget: HTMLInputElement }) => props.onDone(event.currentTarget.value, false)}
      />
    </Field>
  )
}

function ChatThreadList(props: {
  threads: Thread[]
  value?: string
  onValueChange: (id: string) => void
  onNew?: () => void
  onRename?: (id: string, title: string) => void
  onDelete?: (id: string) => void
  label?: string
}) {
  const [editing, setEditing] = createSignal<string | null>(null)
  const [deleting, setDeleting] = createSignal<Thread | null>(null)

  // A rename finished with Enter or Escape gives focus back to its chat; one finished by going
  // elsewhere leaves focus where it went.
  let refocus: string | null = null
  const finish = (thread: Thread, title: string | null, keys: boolean) => {
    // Enter, then the blur that follows, both finish: only the first counts.
    if (editing() !== thread.id) return
    if (keys) refocus = thread.id
    setEditing(null)
    const next = title?.trim()
    if (next && next !== thread.title) props.onRename?.(thread.id, next)
  }

  return (
    <nav aria-label={props.label ?? "Chats"} class="chat-threads">
      <Show when={props.onNew}>
        {(onNew) => (
          <Button variant="outline" class="chat-threads-new" onClick={() => onNew()()}>
            New chat
          </Button>
        )}
      </Show>
      <Show when={props.threads.length > 0} fallback={<p class="chat-threads-empty">No chats yet.</p>}>
        <ul>
          <For each={props.threads} keyed={(thread) => thread.id}>
            {(thread) => (
              <li data-active={thread().id === props.value ? "" : undefined}>
                <Show
                  when={editing() === thread().id}
                  fallback={
                    <Button
                      variant="ghost"
                      class="chat-thread-link"
                      // A verb of its own, so neither this nor "More for …" is the bare title a step
                      // by that title would find twice.
                      aria-label={`Open ${thread().title}`}
                      aria-description={thread().updatedAt ? `Updated ${ago(thread().updatedAt!)}` : undefined}
                      aria-current={thread().id === props.value ? "page" : undefined}
                      ref={(el: HTMLButtonElement) => {
                        // A row is keyed by its chat, so its id never changes.
                        if (refocus !== untrack(() => thread().id)) return
                        refocus = null
                        queueMicrotask(() => el.focus())
                      }}
                      onClick={() => props.onValueChange(thread().id)}
                    >
                      <span class="chat-thread-title">{thread().title}</span>
                      <Show when={thread().updatedAt}>
                        {(updated) => (
                          <time datetime={updated().toISOString()} aria-hidden="true">
                            {ago(updated())}
                          </time>
                        )}
                      </Show>
                    </Button>
                  }
                >
                  <RenameField title={thread().title} onDone={(title, keys) => finish(thread(), title, keys)} />
                </Show>
                <Show when={(props.onRename || props.onDelete) && editing() !== thread().id}>
                  <Menu>
                    <MenuTrigger class="chat-thread-more" data-variant="ghost" aria-label={`More for ${thread().title}`}>
                      <ChatIcon path={more} />
                    </MenuTrigger>
                    <MenuContent>
                      <Show when={props.onRename}>
                        <MenuItem onSelect={() => setEditing(thread().id)}>Rename</MenuItem>
                      </Show>
                      <Show when={props.onDelete}>
                        <MenuItem destructive onSelect={() => setDeleting(thread())}>
                          Delete
                        </MenuItem>
                      </Show>
                    </MenuContent>
                  </Menu>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <AlertDialog open={deleting() !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogTitle>Delete “{deleting()?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>The chat and its messages are removed.</AlertDialogDescription>
          <div class="chat-dialog-actions">
            <AlertDialogClose>Keep it</AlertDialogClose>
            <AlertDialogClose
              value="confirm"
              data-variant="solid"
              data-agent-confirm={`Deletes the chat “${deleting()?.title ?? ""}” and its messages`}
              onClick={() => {
                const thread = deleting()
                if (thread) props.onDelete?.(thread.id)
              }}
            >
              Delete chat
            </AlertDialogClose>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}

// A floating assistant. It stays open while you click around the page; Escape, its
// button and Close shut it.
function ChatLauncher(props: { label?: string; title?: string; children: JSX.Element }) {
  const [open, setOpen] = createSignal(false)
  const title = () => props.title ?? "Assistant"
  return (
    <Popover
      modal={false}
      open={open()}
      onOpenChange={(next, details) => {
        if (!next && (details.reason === "outside-press" || details.reason === "focus-out")) {
          details.cancel()
          return
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger class="chat-launcher" aria-label={open() ? `Close ${title()}` : (props.label ?? "Open assistant")}>
        <ChatIcon path={open() ? close : bubble} />
      </PopoverTrigger>
      <PopoverContent class="chat-launcher-panel" side="top" align="end" sideOffset={12}>
        <header class="chat-launcher-header">
          <PopoverTitle>{title()}</PopoverTitle>
          <PopoverClose aria-label={`Close ${title()}`}>
            <ChatIcon path={close} />
          </PopoverClose>
        </header>
        {props.children}
      </PopoverContent>
    </Popover>
  )
}

export { ChatLauncher, ChatThreadList }
export type { Thread as ChatThreadItem }
