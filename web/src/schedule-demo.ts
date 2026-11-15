// The Scheduler demo's own script: a team's week in UTC, rooms as a timeline, a month, and
// an event dialog on UI SDK's dialog, as an app would wire them.
import { createAgent } from "@ui-sdk/web/agent"
import type { ScheduleEvent } from "@/registry/uiset/ui/scheduler/schedule"
import { iconElement } from "./uiset"
import type { ScheduleTrack } from "./schedule"

type Schedule = HTMLElement & {
  tracks: ScheduleTrack[]
  events: ScheduleEvent[]
  create: (span: { id: string; track: string; start: number; end: number }) => ScheduleEvent | null
  api: { problem: (e: ScheduleEvent) => string | undefined; eventElement: (id: string) => HTMLElement | undefined; neighbor: (id: string) => string | undefined; element: () => HTMLElement | undefined }
}

// People's days, and rooms as a timeline: two schedules, since a schedule's axis is set when it starts.
const week = document.getElementById("schedule") as Schedule
const roomSchedule = document.getElementById("rooms") as Schedule
let schedule = week
const month = document.getElementById("month") as HTMLElement & { events: ScheduleEvent[] }
const title = document.getElementById("title")!

const day = (iso: string) => new Date(`${iso}T00:00:00Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (date: Date, n: number) => new Date(date.getTime() + n * 86400000)
const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
const short = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" })
const range = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" })

const rooms: ScheduleTrack[] = [
  { id: "atlas", label: "Atlas room" },
  { id: "bolt", label: "Bolt room" },
  { id: "comet", label: "Comet room" },
]

let view = "week"
let start = day("2026-11-16") // A Monday.
let events: ScheduleEvent[] = [
  { id: "e1", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup", color: 1 },
  { id: "e2", track: "2026-11-16", start: 13 * 60, end: 14 * 60 + 30, title: "Design review", color: 2, location: "Atlas room" },
  { id: "e3", track: "2026-11-18", start: 10 * 60, end: 11 * 60, title: "Customer call", color: 3 },
  { id: "e4", track: "2026-11-19", start: 15 * 60, end: 16 * 60, title: "Retro", color: 4 },
  { id: "r1", track: "atlas", start: 9 * 60, end: 11 * 60, title: "Workshop", color: 5 },
  { id: "r2", track: "comet", start: 12 * 60, end: 13 * 60, title: "Lunch and learn", color: 6 },
]

// Icons on the toolbar's buttons.
for (const button of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  const name = button.dataset.icon!
  const icon = iconElement(name === "previous" || name === "next" ? "chevron" : (name as "plus"))
  if (name === "previous") icon.style.scale = "-1 1"
  button.prepend(icon)
}

function tracks(): ScheduleTrack[] {
  if (view === "timeline") return rooms
  const count = view === "day" ? 1 : 5
  return Array.from({ length: count }, (_, i) => {
    const d = addDays(start, i)
    return { id: iso(d), label: label.format(d), short: short.format(d) }
  })
}

function render() {
  const list = tracks()
  schedule = view === "timeline" ? roomSchedule : week
  week.hidden = view === "month" || view === "timeline"
  roomSchedule.hidden = view !== "timeline"
  month.hidden = view !== "month"
  // A room holds one booking at a time (overlap="false"); a person's day can overlap.
  schedule.tracks = list
  schedule.events = events
  month.events = events.filter((e) => /^\d{4}-/.test(e.track))
  const unit = view === "day" ? "day" : view === "month" ? "month" : "week"
  document.getElementById("previous")!.setAttribute("aria-label", `Previous ${unit}`)
  document.getElementById("next")!.setAttribute("aria-label", `Next ${unit}`)
  title.textContent =
    view === "timeline" ? `Rooms, ${range.format(start)}` : view === "month" ? "November 2026" : view === "day" ? label.format(start) : `${range.format(start)} – ${range.format(addDays(start, 4))}`
}

for (const s of [week, roomSchedule]) s.addEventListener("eventschange", (e) => {
  events = (e as CustomEvent<{ value: ScheduleEvent[] }>).detail.value
  render()
})

document.getElementById("view")!.addEventListener("valuechange", (e) => {
  view = String((e as CustomEvent<{ value: string }>).detail.value)
  render()
})
document.getElementById("today")!.addEventListener("click", () => ((start = day("2026-11-16")), render()))
document.getElementById("previous")!.addEventListener("click", () => ((start = addDays(start, view === "day" ? -1 : -7)), render()))
document.getElementById("next")!.addEventListener("click", () => ((start = addDays(start, view === "day" ? 1 : 7)), render()))
month.addEventListener("daychoose", (e) => {
  start = day((e as CustomEvent<{ value: string }>).detail.value)
  view = "day"
  ;(document.getElementById("view") as HTMLElement & { value: string }).value = "day"
  render()
})

/* -------------------------------------------------------------------- Dialog */

const dialog = document.getElementById("event-dialog") as HTMLElement & { api: { open: () => Promise<unknown> } }
const content = dialog.querySelector("ui-dialog-content")!
const form = document.getElementById("event-form") as HTMLFormElement
const error = document.getElementById("event-error")!
const trackSelect = document.getElementById("event-track") as HTMLElement & { value: string }
let editing: ScheduleEvent | null = null
let focusAfter: string | undefined
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
const fromTime = (text: string) => {
  const [h, m] = text.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function openDialog(event: ScheduleEvent | null, draft?: Partial<ScheduleEvent>) {
  editing = event
  const shown = event ?? { id: "", title: "", track: tracks()[0]!.id, start: 9 * 60, end: 10 * 60, ...draft }
  document.getElementById("event-dialog-title")!.textContent = event ? event.title : "New event"
  document.getElementById("event-dialog-description")!.textContent = event ? "Change it, or delete it." : "Add it to the schedule."
  ;(document.getElementById("event-title") as HTMLInputElement).value = shown.title
  ;(document.getElementById("event-start") as HTMLInputElement).value = toTime(shown.start)
  ;(document.getElementById("event-end") as HTMLInputElement).value = toTime(shown.end)
  document.getElementById("event-track-list")!.replaceChildren(
    ...tracks().map((t) => {
      const item = document.createElement("ui-select-item")
      item.setAttribute("value", t.id)
      item.textContent = t.label
      return item
    }),
  )
  trackSelect.value = shown.track
  document.getElementById("event-delete")!.parentElement!.hidden = !event
  error.hidden = true
  focusAfter = undefined
  // Focus goes back to the event, or to a deleted one's neighbor, once the dialog closes.
  if (event) content.setAttribute("final-focus", `uiset-schedule-event[value="${CSS.escape(event.id)}"] button`)
  else content.removeAttribute("final-focus")
  void dialog.api.open().then(() => {
    const target = focusAfter && schedule.api.eventElement(focusAfter)
    if (target) target.focus()
  })
}

for (const s of [week, roomSchedule]) s.addEventListener("open", (e) => {
  const id = (e as CustomEvent<{ value: string }>).detail.value
  openDialog(events.find((ev) => ev.id === id) ?? null)
})
document.getElementById("new-event")!.addEventListener("click", () => openDialog(null))

form.addEventListener("submit", (e) => {
  e.preventDefault()
  const data = new FormData(form)
  const next: ScheduleEvent = {
    ...(editing ?? {}),
    id: editing?.id ?? crypto.randomUUID(),
    title: String(data.get("event-title")),
    track: trackSelect.value,
    start: fromTime(String(data.get("event-start"))),
    end: fromTime(String(data.get("event-end"))),
  }
  // The schedule's own rules: hours, steps and overlaps.
  const problem = next.end <= next.start ? "It has to end after it starts." : schedule.api.problem(next)
  if (problem) {
    error.textContent = problem
    error.hidden = false
    ;(document.getElementById("event-start") as HTMLInputElement).focus()
    return
  }
  events = editing ? events.map((ev) => (ev.id === next.id ? next : ev)) : [...events, next]
  focusAfter = next.id
  render()
  ;(dialog as unknown as { open: boolean }).open = false
})

document.getElementById("event-delete")!.addEventListener("click", () => {
  if (!editing) return
  focusAfter = schedule.api.neighbor(editing.id)
  content.removeAttribute("final-focus")
  events = events.filter((ev) => ev.id !== editing!.id)
  render()
  ;(dialog as unknown as { open: boolean }).open = false
})

// A click on an empty stretch, or a drag, makes an event the schedule adds; the dialog names it.
week.create = (span) => ({ ...span, title: "New event", color: 7 })
roomSchedule.create = (span) => ({ ...span, title: "New booking", color: 7 })

render()
Object.assign(window, { agent: createAgent() })
