// The Mobile demo's own script, as an app would write it: data in, events out.
import { createAgent } from "@ui-sdk/web/agent"
import { toast } from "@ui-sdk/web"
import { iconElement, type IconName } from "./uiset"
import type { SwipeItem } from "./mobile"

type Message = { id: string; from: string; subject: string; unread: boolean }

let messages: Message[] = [
  { id: "m1", from: "Grace Hopper", subject: "Compiler notes for Friday", unread: true },
  { id: "m2", from: "Ada Lovelace", subject: "The engine's second table", unread: true },
  { id: "m3", from: "Linus Pauling", subject: "Lab booking moved", unread: false },
]
const later: Message = { id: "m4", from: "Katherine Johnson", subject: "Trajectory figures attached", unread: true }

const list = document.getElementById("messages") as HTMLElement & { items: SwipeItem[] }
const tabs = document.querySelectorAll<HTMLButtonElement>("[data-tab]")

// Icons and labels for the buttons that show them.
for (const button of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  const icon = iconElement(button.dataset.icon as IconName)
  if (button.classList.contains("mobile-tab")) {
    const wrap = document.createElement("span")
    wrap.className = "mobile-tab-icon"
    wrap.append(icon)
    const label = document.createElement("span")
    label.className = "mobile-tab-label"
    label.textContent = button.dataset.label!
    button.append(wrap, label)
  } else button.append(icon)
}

function render() {
  list.items = messages.map((m) => ({
    id: m.id,
    label: `${m.unread ? "Unread, " : ""}${m.from}: ${m.subject}`,
    content: `${m.from} · ${m.subject}`,
    start: [{ id: "read", label: m.unread ? "Read" : "Unread", icon: "mail", tone: "accent" }],
    end: [
      { id: "archive", label: "Archive", icon: "archive", tone: "neutral" },
      { id: "delete", label: "Delete", icon: "trash", tone: "danger" },
    ],
  }))
  const unread = messages.filter((m) => m.unread).length
  const inbox = document.querySelector<HTMLButtonElement>('[data-tab="inbox"]')!
  inbox.setAttribute("aria-label", unread ? `Inbox, ${unread} new` : "Inbox")
  let badge = inbox.querySelector(".mobile-tab-badge")
  if (!badge) {
    badge = document.createElement("span")
    badge.className = "mobile-tab-badge"
    badge.setAttribute("aria-hidden", "true")
    inbox.querySelector(".mobile-tab-icon")!.append(badge)
  }
  badge.textContent = String(unread)
  badge.toggleAttribute("hidden", unread === 0)
}

list.addEventListener("action", (event) => {
  const { value: id, action } = (event as CustomEvent<{ value: string; action: string }>).detail
  const message = messages.find((m) => m.id === id)
  if (!message) return
  if (action === "read") messages = messages.map((m) => (m.id === id ? { ...m, unread: !m.unread } : m))
  else {
    messages = messages.filter((m) => m.id !== id)
    toast(action === "archive" ? "Archived" : "Deleted", {
      action: {
        label: "Undo",
        onAction: () => {
          messages = [...messages, message].sort((a, b) => a.id.localeCompare(b.id))
          render()
        },
      },
    })
  }
  render()
})

list.addEventListener("open", (event) => {
  const id = (event as CustomEvent<{ value: string }>).detail.value
  messages = messages.map((m) => (m.id === id ? { ...m, unread: false } : m))
  render()
  toast(`Opened “${messages.find((m) => m.id === id)?.subject}”`)
})

document.getElementById("refresh")!.addEventListener("refresh", (event) => {
  ;(event as CustomEvent<{ waitUntil: (p: Promise<unknown>) => void }>).detail.waitUntil(
    new Promise<void>((resolve) =>
      setTimeout(() => {
        if (!messages.some((m) => m.id === later.id)) messages = [later, ...messages]
        render()
        resolve()
      }, 500),
    ),
  )
})

// The action sheet: open it from code, and act on what comes back.
document.getElementById("options")!.addEventListener("click", async () => {
  const sheet = document.getElementById("inbox-actions") as HTMLElement & { api: { open: () => Promise<{ returnValue?: unknown }> } }
  const { returnValue } = await sheet.api.open()
  if (returnValue === "read-all") messages = messages.map((m) => ({ ...m, unread: false }))
  if (returnValue === "clear") {
    const before = messages
    messages = []
    toast(`Deleted ${before.length} messages`, { action: { label: "Undo", onAction: () => ((messages = before), render()) } })
  }
  render()
})

// The tab bar switches screens and marks the current one.
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      if (other === tab) other.setAttribute("aria-current", "page")
      else other.removeAttribute("aria-current")
    }
    for (const screen of document.querySelectorAll<HTMLElement>(".web-screen")) screen.hidden = screen.dataset.for !== tab.dataset.tab
  })
}

// The wheels' options, and the alarm they make.
const hour = document.getElementById("hour") as HTMLElement & { items: { value: string; label: string }[]; value: string }
const minute = document.getElementById("minute") as HTMLElement & { items: { value: string; label: string }[]; value: string }
const period = document.getElementById("period") as HTMLElement & { value: string }
for (const [el, values] of [
  [hour, Array.from({ length: 12 }, (_, i) => String(i + 1))],
  [minute, Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))],
] as const) {
  for (const value of values) {
    const option = document.createElement("ui-listbox-item")
    option.className = "wheel-option"
    option.setAttribute("value", value)
    option.textContent = value
    el.append(option)
  }
}
const timeText = () => `${hour.value}:${minute.value} ${period.value}`
const save = document.getElementById("save-alarm")!
const showTime = () => (save.textContent = `Save alarm for ${timeText()}`)
for (const el of [hour, minute, period]) el.addEventListener("valuechange", () => queueMicrotask(showTime))
customElements.whenDefined("ui-listbox").then(() => requestAnimationFrame(showTime))
// Save closes the sheet (it's a drawer close) and adds the alarm.
save.addEventListener("click", () => {
  const item = document.createElement("li")
  const time = document.createElement("span")
  time.className = "mobile-alarm-time"
  time.textContent = timeText()
  item.append(time)
  document.getElementById("alarms")!.append(item)
  toast(`Alarm set for ${timeText()}`)
})

render()
Object.assign(window, { agent: createAgent() })
