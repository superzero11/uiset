// The Inbox page as web elements: folders, a message list you arrow through (UI SDK's
// listbox), and the message, with compose in a dialog. On narrow screens the list and the
// message take turns, with a back button. The mail is the React template's.
import "@ui-sdk/web/avatar"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/listbox"
import "@ui-sdk/web/textarea"
import "@ui-sdk/web/toast"
import "@ui-sdk/web/toggle"
import { toast } from "@ui-sdk/web"
import { createAgent } from "@ui-sdk/web/agent"
import { folders, full, initials, sampleMessages, when, type Folder, type Message } from "@/registry/uiset/ui/templates/inbox-sample"
import { h } from "../dom"
import { iconElement } from "../uiset"
import { decorateIcons } from "./common"

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
type Popup = HTMLElement & { api: { open: () => Promise<unknown>; close: () => boolean } }
const now = new Date(Date.UTC(2026, 10, 15, 12))
let messages: Message[] = [...sampleMessages]
let folder: Folder = "inbox"
let openId: string | null = messages[0]?.id ?? null
let reading = false
let query = ""
let focusNext: "heading" | "list" | null = null
decorateIcons()

const inFolder = (m: Message, f: Folder) => (f === "starred" ? m.starred && m.folder !== "trash" : m.folder === f)
const shown = () => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return messages.filter((m) => inFolder(m, folder)).filter((m) => words.every((w) => `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(w))).sort((a, b) => b.sent.getTime() - a.sent.getTime())
}
const update = (id: string, change: Partial<Message>) => (messages = messages.map((m) => (m.id === id ? { ...m, ...change } : m)))
const folderLabel = () => folders.find((f) => f.id === folder)!.label
const badge = (tone: string, text: string) => h("span", { class: "badge", "data-tone": tone }, text)
const button = (label: string, attrs: Record<string, unknown>, run: () => void, icon?: Parameters<typeof iconElement>[0]) =>
  h("ui-button", null, h("button", { type: "button", "data-variant": "ghost", ...attrs, onclick: run }, ...(icon ? [iconElement(icon)] : []), h("span", { class: "inbox-action-label" }, label)))

function moveTo(m: Message, to: Message["folder"]) {
  const list = shown()
  const index = list.findIndex((x) => x.id === m.id)
  const next = list[index + 1] ?? list[index - 1]
  update(m.id, { folder: to })
  openId = next?.id ?? null
  if (next) focusNext = "heading"
  render()
  toast(to === "trash" ? "Moved to Trash" : to === "archive" ? "Archived" : "Moved to Inbox", {
    action: { label: "Undo", onAction: () => (update(m.id, { folder: m.folder }), render()) },
  })
}

function renderFolders() {
  const unread = messages.filter((m) => m.folder === "inbox" && m.unread).length
  $("folders").replaceChildren(
    ...folders.map((f) =>
      h(
        "li",
        null,
        h(
          "a",
          { href: `#${f.id}`, class: "sidebar-link", "aria-current": folder === f.id ? "page" : null },
          h("span", { class: "sidebar-icon" }, iconElement(f.icon)),
          h("span", { class: "sidebar-label" }, f.label),
          f.id === "inbox" && unread ? h("span", { class: "sidebar-badge" }, badge("info", String(unread))) : null,
        ),
      ),
    ),
  )
}

function renderList() {
  const list = shown()
  const open = messages.find((m) => m.id === openId && list.includes(m)) ?? null
  $("folder-title").textContent = folderLabel()
  if (!list.length) {
    $("list-body").replaceChildren(h("uiset-empty-state", { icon: "inbox", level: "2", title: query ? "No messages match" : "Nothing here", description: query ? "Try other words, or search another folder." : "Messages you move here show up in this list." }))
    return
  }
  // Arrows browse; Enter, Space or a press opens, and focus moves to the message.
  const box = h(
    "ui-listbox",
    { "aria-label": `${folderLabel()} messages`, class: "inbox-messages", activation: "manual", "default-value": open?.id ?? null },
    ...list.map((m) =>
      h(
        "ui-listbox-item",
        { value: m.id, label: `${m.unread ? "Unread, " : ""}${m.from}, ${m.subject}`, class: "inbox-message", "data-unread": m.unread },
        h("span", { class: "inbox-message-top" }, h("span", { class: "inbox-from" }, m.from), h("time", { datetime: m.sent.toISOString() }, when(m.sent, now))),
        h("span", { class: "inbox-subject" }, m.unread ? h("span", { class: "inbox-dot", "aria-hidden": "true" }) : null, m.subject),
        h("span", { class: "inbox-preview" }, m.body),
      ),
    ),
  )
  box.addEventListener("valuechange", (event) => {
    const id = (event as CustomEvent<{ value: string | null }>).detail.value
    if (!id) return
    openId = String(id)
    update(openId, { unread: false })
    reading = true
    focusNext = "heading"
    render()
  })
  $("list-body").replaceChildren(box)
}

function renderReader() {
  const open = messages.find((m) => m.id === openId && shown().includes(m)) ?? null
  if (!open) return $("reader").replaceChildren(h("uiset-empty-state", { icon: "mail", level: "2", title: "No message selected", description: "Choose one from the list." }))
  const star = h("ui-toggle", { "default-pressed": open.starred }, h("button", { type: "button", "data-variant": "ghost", "aria-label": "Star this message" }, iconElement("star")))
  star.addEventListener("pressedchange", (event) => {
    update(open.id, { starred: !!(event as CustomEvent<{ value: boolean }>).detail.value })
    renderFolders()
  })
  $("reader").replaceChildren(
    h(
      "article",
      { class: "inbox-article" },
      h(
        "div",
        { class: "inbox-actions", role: "group", "aria-label": "Message actions" },
        h("ui-button", null, h("button", { type: "button", "data-variant": "ghost", class: "inbox-back", onclick: () => ((reading = false), (openId = null), (focusNext = "list"), render()) }, iconElement("chevron", "inbox-back-icon"), "Back to messages")),
        star,
        open.folder !== "inbox" && open.folder !== "sent" ? button("Move to Inbox", {}, () => moveTo(open, "inbox"), "inbox") : null,
        open.folder !== "archive" ? button("Archive message", {}, () => moveTo(open, "archive"), "archive") : null,
        open.folder !== "trash" ? button("Delete message", { "data-agent-confirm": `Moves "${open.subject}" to Trash` }, () => moveTo(open, "trash"), "trash") : null,
      ),
      h(
        "header",
        { class: "inbox-article-header" },
        h("h2", { class: "inbox-article-subject", tabindex: "-1", id: "subject" }, open.subject),
        open.label ? badge("info", open.label) : null,
        h(
          "div",
          { class: "inbox-sender" },
          h("ui-avatar", { role: "img", "aria-label": open.from }, h("ui-avatar-fallback", null, initials(open.from))),
          h("div", null, h("strong", null, open.from), h("span", { class: "inbox-email" }, open.email)),
          h("time", { datetime: open.sent.toISOString() }, full.format(open.sent)),
        ),
      ),
      h("p", { class: "inbox-body" }, open.body),
      h("ui-button", null, h("button", { type: "button", "data-variant": "outline", class: "inbox-reply", onclick: () => compose(open.email, open.subject.startsWith("Re: ") ? open.subject : `Re: ${open.subject}`) }, `Reply to ${open.from}`)),
    ),
  )
}

function render() {
  attr("inbox", "data-reading", reading)
  renderFolders()
  renderList()
  renderReader()
  // After opening a message, focus its heading; after Back, the list.
  const target = focusNext
  focusNext = null
  requestAnimationFrame(() => {
    if (target === "heading") $("subject")?.focus()
    if (target === "list") $("list").querySelector<HTMLElement>('[role=option][tabindex="0"], [role=option]')?.focus()
  })
}
const attr = (id: string, name: string, on: boolean) => $(id).toggleAttribute(name, on)

// Folder links switch the list in place, from the sidebar or its drawer on a phone.
$("shell").addEventListener(
  "click",
  (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href^='#']")
    const id = link?.getAttribute("href")?.slice(1) as Folder | undefined
    if (!id || !folders.some((f) => f.id === id)) return
    event.preventDefault()
    folder = id
    reading = false
    openId = null
    render()
  },
  { capture: true },
)

// The search field focuses itself on "/" (its shortcut), as React's does.
const search = $<HTMLElement & { value: string }>("search")
search.addEventListener("valuechange", () => ((query = search.value), render()))

/* ---------------------------------------------------------------- compose */

const composer = $<Popup>("composer")
const form = $<HTMLFormElement>("compose-form")
function compose(to = "", subject = "") {
  form.reset()
  form.querySelector<HTMLInputElement>('input[name="to"]')!.value = to
  form.querySelector<HTMLInputElement>('input[name="subject"]')!.value = subject
  $("composer-title").textContent = subject || "New message"
  void composer.api.open()
}
$("compose").addEventListener("click", () => compose())
form.addEventListener("submit", (event) => {
  event.preventDefault()
  const data = new FormData(form)
  messages = [{ id: crypto.randomUUID(), from: "You", email: String(data.get("to")), subject: String(data.get("subject")) || "(No subject)", body: String(data.get("body")), sent: new Date(), unread: false, starred: false, folder: "sent" }, ...messages]
  composer.api.close()
  render()
  toast("Message sent")
})

render()
Object.assign(window, { agent: createAgent() })
