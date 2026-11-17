"use client"

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@ui-sdk/react/alert-dialog"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/react/menu"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover"
import { useState, type ReactNode } from "react"
import { Button } from "./button"
import { ChatIcon } from "./chat"
import "./chat/chat.css"

type Thread = { id: string; title: string; updatedAt?: Date }

const more = "M5 12h.01M12 12h.01M19 12h.01"
const bubble = "M4 5h16v11H9l-5 4z"
const close = "M6 6l12 12M18 6L6 18"

const relative = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
  style: "short",
})

function ago(date: Date) {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, "hour")
  return relative.format(Math.round(hours / 24), "day")
}

function ChatThreadList({
  threads,
  value,
  onValueChange,
  onNew,
  onRename,
  onDelete,
  label = "Chats",
}: {
  threads: Thread[]
  value?: string
  onValueChange: (id: string) => void
  onNew?: () => void
  onRename?: (id: string, title: string) => void
  onDelete?: (id: string) => void
  label?: string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Thread | null>(null)

  const finish = (thread: Thread, title: string | null) => {
    setEditing(null)
    const next = title?.trim()
    if (next && next !== thread.title) onRename?.(thread.id, next)
  }

  return (
    <nav aria-label={label} className="chat-threads">
      {onNew && (
        <Button variant="outline" className="chat-threads-new" onClick={onNew}>
          New chat
        </Button>
      )}
      {threads.length === 0 ? (
        <p className="chat-threads-empty">No chats yet.</p>
      ) : (
        <ul>
          {threads.map((thread) => (
            <li key={thread.id} data-active={thread.id === value ? "" : undefined}>
              {editing === thread.id ? (
                <Field className="chat-thread-rename">
                  <FieldLabel className="chat-visually-hidden">
                    Rename {thread.title}
                  </FieldLabel>
                  <Input
                    autoFocus
                    defaultValue={thread.title}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") finish(thread, event.currentTarget.value)
                      if (event.key === "Escape") finish(thread, null)
                    }}
                    onBlur={(event) => finish(thread, event.currentTarget.value)}
                  />
                </Field>
              ) : (
                <Button
                  variant="ghost"
                  className="chat-thread-link"
                  // A verb of its own, so neither this nor "More for …" is the bare title a step
                  // by that title would find twice.
                  aria-label={`Open ${thread.title}`}
                  aria-description={
                    thread.updatedAt ? `Updated ${ago(thread.updatedAt)}` : undefined
                  }
                  aria-current={thread.id === value ? "page" : undefined}
                  onClick={() => onValueChange(thread.id)}
                >
                  <span className="chat-thread-title">{thread.title}</span>
                  {thread.updatedAt && (
                    <time dateTime={thread.updatedAt.toISOString()} aria-hidden="true">
                      {ago(thread.updatedAt)}
                    </time>
                  )}
                </Button>
              )}
              {(onRename || onDelete) && editing !== thread.id && (
                <Menu>
                  <MenuTrigger
                    className="chat-thread-more"
                    data-variant="ghost"
                    aria-label={`More for ${thread.title}`}
                  >
                    <ChatIcon path={more} />
                  </MenuTrigger>
                  <MenuContent>
                    {onRename && (
                      <MenuItem onSelect={() => setEditing(thread.id)}>Rename</MenuItem>
                    )}
                    {onDelete && (
                      <MenuItem destructive onSelect={() => setDeleting(thread)}>
                        Delete
                      </MenuItem>
                    )}
                  </MenuContent>
                </Menu>
              )}
            </li>
          ))}
        </ul>
      )}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The chat and its messages are removed.
          </AlertDialogDescription>
          <div className="chat-dialog-actions">
            <AlertDialogClose>Keep it</AlertDialogClose>
            <AlertDialogClose
              value="confirm"
              data-variant="solid"
              data-agent-confirm={`Deletes the chat “${deleting?.title ?? ""}” and its messages`}
              onClick={() => deleting && onDelete?.(deleting.id)}
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
function ChatLauncher({
  label = "Open assistant",
  title = "Assistant",
  children,
}: {
  label?: string
  title?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(next, details) => {
        if (
          !next &&
          (details.reason === "outside-press" || details.reason === "focus-out")
        ) {
          details.cancel()
          return
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger
        className="chat-launcher"
        aria-label={open ? `Close ${title}` : label}
      >
        <ChatIcon path={open ? close : bubble} />
      </PopoverTrigger>
      <PopoverContent
        className="chat-launcher-panel"
        side="top"
        align="end"
        sideOffset={12}
      >
        <header className="chat-launcher-header">
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverClose aria-label={`Close ${title}`}>
            <ChatIcon path={close} />
          </PopoverClose>
        </header>
        {children}
      </PopoverContent>
    </Popover>
  )
}

export { ChatLauncher, ChatThreadList }
export type { Thread as ChatThreadItem }
