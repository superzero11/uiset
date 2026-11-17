"use client"

import { inputHints } from "@ui-sdk/core"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { AppShell, SidebarGroup, SidebarItem, SidebarNav } from "../app-shell"
import { Avatar, AvatarFallback } from "../avatar"
import { Badge } from "../badge"
import { Button } from "../button"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog"
import { EmptyState } from "../empty-state"
import { Field, FieldError, FieldLabel, Input } from "../field"
import { Listbox, ListboxItem } from "../listbox"
import { SearchField } from "../search-field"
import { Icon } from "../shell/icons"
import { Textarea } from "../textarea"
import { Toggle } from "../toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip"
import { toast } from "../toast"
import { folders, full, initials, sampleMessages, when, type Folder, type Message } from "./inbox-sample"
import "./templates.css"

// Mail, three panes: folders, a message list you arrow through (a Listbox), and the
// message. Compose opens a dialog. On narrow screens the list and the message take turns,
// with a back button. Archive, delete and star are one keypress-reachable button each.

function InboxTemplate({
  defaultMessages: initial = sampleMessages,
  brand = "Acme Mail",
  now = new Date(Date.UTC(2026, 10, 15, 12)),
  contentElement = "main",
  onSend,
  onMove,
}: {
  /** The mailbox when the page opens; the template keeps it after that. */
  defaultMessages?: readonly Message[]
  brand?: ReactNode
  /** "Now", for relative times; pass the real clock in an app. */
  now?: Date
  contentElement?: "main" | "div"
  /** Sends a message; the template adds it to Sent. */
  onSend?: (message: { to: string; subject: string; body: string }) => void | Promise<void>
  /** Saves a move to another folder (archive, trash, back to the inbox). */
  onMove?: (id: string, folder: Message["folder"]) => void
}) {
  const [messages, setMessages] = useState<Message[]>([...initial])
  const [folder, setFolder] = useState<Folder>("inbox")
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null)
  const [reading, setReading] = useState(false)
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState<{ to: string; subject: string } | null>(null)
  const listRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusNext = useRef<"heading" | "list" | null>(null)
  // After opening a message, focus its heading; after Back, the list.
  useEffect(() => {
    const target = focusNext.current
    focusNext.current = null
    if (target === "heading") headingRef.current?.focus()
    if (target === "list")
      listRef.current?.querySelector<HTMLElement>('[role=option][tabindex="0"], [role=option]')?.focus()
  })

  const inFolder = (m: Message, f: Folder) => (f === "starred" ? m.starred && m.folder !== "trash" : m.folder === f)
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return messages
      .filter((m) => inFolder(m, folder))
      .filter((m) => words.every((w) => `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(w)))
      .sort((a, b) => b.sent.getTime() - a.sent.getTime())
  }, [messages, folder, query])
  const open = messages.find((m) => m.id === openId && shown.includes(m)) ?? null
  const unread = messages.filter((m) => m.folder === "inbox" && m.unread).length

  const update = (id: string, change: Partial<Message>) =>
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...change } : m)))
  const moveTo = (m: Message, to: Message["folder"]) => {
    const index = shown.findIndex((x) => x.id === m.id)
    const next = shown[index + 1] ?? shown[index - 1]
    update(m.id, { folder: to })
    onMove?.(m.id, to)
    setOpenId(next?.id ?? null)
    if (next) focusNext.current = "heading"
    toast(to === "trash" ? "Moved to Trash" : to === "archive" ? "Archived" : "Moved to Inbox", {
      action: {
        label: "Undo",
        onAction: () => {
          update(m.id, { folder: m.folder })
          onMove?.(m.id, m.folder)
        },
      },
    })
  }
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const message = {
      to: String(data.get("to")),
      subject: String(data.get("subject")) || "(No subject)",
      body: String(data.get("body")),
    }
    try {
      await onSend?.(message)
    } catch {
      toast("Couldn't send. Your message is still here.")
      return
    }
    setMessages((all) => [
      {
        id: crypto.randomUUID(),
        from: "You",
        email: message.to,
        subject: message.subject,
        body: message.body,
        sent: new Date(),
        unread: false,
        starred: false,
        folder: "sent",
      },
      ...all,
    ])
    setDraft(null)
    toast("Message sent")
  }

  return (
    // Folder links switch the list in place. The handler wraps the whole shell, since the
    // sidebar (and its drawer on phones) sits beside the list, not inside it.
    <div
      className="inbox-shell"
      onClickCapture={(event) => {
        const link = (event.target as Element).closest<HTMLAnchorElement>("a[href^='#']")
        const id = link?.getAttribute("href")?.slice(1) as Folder | undefined
        if (id && folders.some((f) => f.id === id)) {
          event.preventDefault()
          setFolder(id)
          setReading(false)
          setOpenId(null)
        }
      }}
    >
    <AppShell
      label="Mail navigation"
      brand={<span className="template-brand">{brand}</span>}
      contentElement={contentElement}
      sidebar={
        <>
          {/* Collapsed to icons, Compose keeps its name in the hidden label and the tooltip. */}
          <Tooltip>
            <TooltipTrigger render={<Button className="inbox-compose" onClick={() => setDraft({ to: "", subject: "" })} />}>
              <Icon name="edit" />
              <span className="sidebar-label">Compose</span>
            </TooltipTrigger>
            {/* Hidden from agents: it repeats the button's name, which a closed tooltip takes (#604). */}
            <TooltipContent side="right" className="sidebar-tooltip" data-agent-hidden="">
              Compose
            </TooltipContent>
          </Tooltip>
          <SidebarNav label="Mail folders">
            <SidebarGroup>
              {folders.map((f) => (
                <SidebarItem
                  key={f.id}
                  href={`#${f.id}`}
                  current={folder === f.id}
                  icon={<Icon name={f.icon} />}
                  badge={f.id === "inbox" && unread ? <Badge tone="info">{unread}</Badge> : undefined}
                >
                  {f.label}
                </SidebarItem>
              ))}
            </SidebarGroup>
          </SidebarNav>
        </>
      }
    >
      <div className="inbox" data-reading={reading ? "" : undefined}>
        <section className="inbox-list" aria-label="Messages" ref={listRef}>
          <div className="inbox-list-header">
            <h1 className="inbox-title">{folders.find((f) => f.id === folder)!.label}</h1>
            <SearchField label="Search mail" placeholder="Search mail…" value={query} onValueChange={(v) => setQuery(v)} shortcut="/" />
          </div>
          {shown.length ? (
            // Arrows browse; Enter, Space or a press opens, and focus moves to the message.
            <Listbox
              aria-label={`${folders.find((f) => f.id === folder)!.label} messages`}
              className="inbox-messages"
              activation="manual"
              value={open?.id ?? null}
              onValueChange={(id) => {
                if (!id) return
                setOpenId(String(id))
                update(String(id), { unread: false })
                setReading(true)
                focusNext.current = "heading"
              }}
            >
              {shown.map((m) => (
                <ListboxItem
                  key={m.id}
                  value={m.id}
                  label={`${m.unread ? "Unread, " : ""}${m.from}, ${m.subject}`}
                  className="inbox-message"
                  data-unread={m.unread ? "" : undefined}
                >
                  <span className="inbox-message-top">
                    <span className="inbox-from">{m.from}</span>
                    <time dateTime={m.sent.toISOString()}>{when(m.sent, now)}</time>
                  </span>
                  <span className="inbox-subject">
                    {m.unread && <span className="inbox-dot" aria-hidden="true" />}
                    {m.subject}
                  </span>
                  <span className="inbox-preview">{m.body}</span>
                </ListboxItem>
              ))}
            </Listbox>
          ) : (
            <EmptyState
              icon="inbox"
              level={2}
              title={query ? "No messages match" : "Nothing here"}
              description={query ? "Try other words, or search another folder." : "Messages you move here show up in this list."}
            />
          )}
        </section>
        <section className="inbox-reader" aria-label="Message">
          {open ? (
            <article className="inbox-article">
              <div className="inbox-actions" role="group" aria-label="Message actions">
                <Button
                  variant="ghost"
                  className="inbox-back"
                  onClick={() => {
                    setReading(false)
                    setOpenId(null)
                    focusNext.current = "list"
                  }}
                >
                  <Icon name="chevron" className="inbox-back-icon" />
                  Back to messages
                </Button>
                <Toggle
                  pressed={open.starred}
                  onPressedChange={(starred: boolean) => update(open.id, { starred })}
                  aria-label="Star this message"
                  data-variant="ghost"
                >
                  <Icon name="star" />
                </Toggle>
                {open.folder !== "inbox" && open.folder !== "sent" && (
                  <Button variant="ghost" onClick={() => moveTo(open, "inbox")}>
                    <Icon name="inbox" />
                    <span className="inbox-action-label">Move to Inbox</span>
                  </Button>
                )}
                {open.folder !== "archive" && (
                  <Button variant="ghost" onClick={() => moveTo(open, "archive")}>
                    <Icon name="archive" />
                    <span className="inbox-action-label">Archive message</span>
                  </Button>
                )}
                {open.folder !== "trash" && (
                  <Button variant="ghost" onClick={() => moveTo(open, "trash")} data-agent-confirm={`Moves "${open.subject}" to Trash`}>
                    <Icon name="trash" />
                    <span className="inbox-action-label">Delete message</span>
                  </Button>
                )}
              </div>
              <header className="inbox-article-header">
                <h2 className="inbox-article-subject" ref={headingRef} tabIndex={-1}>
                  {open.subject}
                </h2>
                {open.label && <Badge tone="info">{open.label}</Badge>}
                <div className="inbox-sender">
                  <Avatar role="img" aria-label={open.from}>
                    <AvatarFallback>{initials(open.from)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <strong>{open.from}</strong>
                    <span className="inbox-email">{open.email}</span>
                  </div>
                  <time dateTime={open.sent.toISOString()}>{full.format(open.sent)}</time>
                </div>
              </header>
              <p className="inbox-body">{open.body}</p>
              <Button
                variant="outline"
                onClick={() =>
                  setDraft({ to: open.email, subject: open.subject.startsWith("Re: ") ? open.subject : `Re: ${open.subject}` })
                }
                className="inbox-reply"
              >
                Reply to {open.from}
              </Button>
            </article>
          ) : (
            <EmptyState icon="mail" level={2} title="No message selected" description="Choose one from the list." />
          )}
        </section>
      </div>
      <Dialog open={draft !== null} onOpenChange={(isOpen: boolean) => !isOpen && setDraft(null)}>
        <DialogBackdrop />
        <DialogContent className="inbox-composer">
          <DialogTitle>{draft?.subject ? draft.subject : "New message"}</DialogTitle>
          <DialogDescription>Separate several addresses with commas.</DialogDescription>
          <form className="admin-form" onSubmit={send} aria-label="New message">
            <Field name="to">
              <FieldLabel>To</FieldLabel>
              <Input type="email" multiple required defaultValue={draft?.to} {...inputHints("email", { enter: "next" })} />
              <FieldError match="valueMissing">Add someone to send to.</FieldError>
              <FieldError match="typeMismatch">Use addresses like grace@example.com, separated by commas.</FieldError>
            </Field>
            <Field name="subject">
              <FieldLabel>Subject</FieldLabel>
              <Input autoComplete="off" defaultValue={draft?.subject} />
            </Field>
            <Field name="body">
              <FieldLabel>Message</FieldLabel>
              <Textarea required autoResize {...inputHints("message")} />
              <FieldError match="valueMissing">Write something first.</FieldError>
            </Field>
            <div className="admin-form-actions">
              <DialogClose>Discard</DialogClose>
              <Button type="submit">
                <Icon name="send" />
                Send
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
    </div>
  )
}

export { InboxTemplate, sampleMessages }
export type { Message as InboxMessage }
