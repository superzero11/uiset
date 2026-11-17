// The Calendar page as web elements: a day or a week (uiset-schedule) or a month
// (uiset-schedule-month), a small month that jumps the view to a day (UI SDK's calendar),
// calendars to show or hide, and what's next. The toolbar and the event dialog are the
// page's own, on UI SDK's buttons, segmented control and dialogs. The events and the date
// math are the React template's (templates/calendar-app-sample.ts).
import "@ui-sdk/web/alert-dialog"
import "@ui-sdk/web/calendar"
import "@ui-sdk/web/checkbox"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/segmented-control"
import "@ui-sdk/web/select"
import "@ui-sdk/web/toast"
import "@ui-sdk/web/tooltip"
import { toast } from "@ui-sdk/web"
import { createAgent } from "@ui-sdk/web/agent"
import { clock, type ScheduleEvent } from "@/registry/uiset/ui/scheduler/schedule"
import {
  END_HOUR,
  NOW,
  START_HOUR,
  TODAY,
  at,
  longDay,
  sampleCalendars,
  sampleEvents,
  stepView,
  upcoming,
  viewDays,
  viewTitle,
  viewTracks,
  visibleEvents,
  when,
  type CalendarEvent,
  type CalendarView,
} from "@/registry/uiset/ui/templates/calendar-app-sample"
import { h } from "../dom"
import type { ScheduleTrack } from "../schedule"
import { iconElement } from "../uiset"
import { decorateIcons } from "./common"

type Schedule = HTMLElement & {
  tracks: ScheduleTrack[]
  events: ScheduleEvent[]
  now: Date
  create: (span: { id: string; track: string; start: number; end: number }) => ScheduleEvent | null
  api: { problem: (e: ScheduleEvent) => string | undefined; eventElement: (id: string) => HTMLElement | undefined; neighbor: (id: string) => string | undefined; element: () => HTMLElement | undefined }
}
type Popup = HTMLElement & { open: boolean; api: { open: () => Promise<unknown>; close: () => boolean } }
type Valued = HTMLElement & { value: string | null }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const calendars = sampleCalendars
const today = TODAY
let events: CalendarEvent[] = [...sampleEvents]
let shown = calendars.map((c) => c.id)
let view: CalendarView = "week"
let anchor = today

const schedule = $<Schedule>("schedule")
const month = $<HTMLElement & { events: ScheduleEvent[] }>("month")
const mini = $<Valued & { month: string }>("mini")
const viewSwitch = $<Valued>("view")
const series = (color: number) => `var(--chart-${color})`
// New events go on the first calendar that's shown.
const target = () => calendars.find((c) => shown.includes(c.id)) ?? calendars[0]!
const visible = () => visibleEvents(events, calendars, shown)

decorateIcons()
const previousIcon = iconElement("chevron", "scheduler-prev")
$("previous").append(previousIcon)
$("next").append(iconElement("chevron"))
schedule.now = NOW
schedule.create = (span) => ({ ...span, title: "New event", calendar: target().id, color: target().color }) as ScheduleEvent

/* ------------------------------------------------------------- sidebar */

const calendarGroup = $<HTMLElement & { value: string[] }>("calendars")
calendarGroup.replaceChildren(
  ...calendars.map((c) => {
    const label = h("label", { "data-slot": "label", class: "calendar-list-item" }, h("ui-checkbox", { value: c.id }, h("ui-checkbox-indicator")), c.label)
    label.style.setProperty("--series", series(c.color))
    return label
  }),
)
calendarGroup.value = shown
calendarGroup.addEventListener("valuechange", (event) => {
  shown = [...((event as CustomEvent<{ value: string[] }>).detail.value ?? [])]
  render()
})

function renderUpcoming() {
  const next = upcoming(visible() as CalendarEvent[], NOW)
  if (!next.length) {
    $("upcoming").replaceChildren(h("p", { class: "calendar-upcoming-empty" }, "Nothing else on the shown calendars."))
    return
  }
  $("upcoming").replaceChildren(
    h(
      "ul",
      { class: "calendar-upcoming", "aria-labelledby": "upcoming-title" },
      ...next.map((e) => {
        const button = h(
          "button",
          {
            type: "button",
            class: "calendar-upcoming-item",
            "data-variant": "ghost",
            onclick: () => {
              if (view === "month") setView("week")
              go(e.track)
              openDialog(e)
            },
          },
          h("span", { class: "calendar-upcoming-title" }, e.title),
          h("span", { class: "calendar-upcoming-when" }, when(e, today)),
        )
        button.style.setProperty("--series", series(e.color ?? 1))
        // In UI SDK's button, so agents can open the event as people do.
        return h("li", null, h("ui-button", null, button))
      }),
    ),
  )
}

// The small month jumps the view to the day chosen; every jump moves it along.
mini.addEventListener("valuechange", (event) => {
  const day = (event as CustomEvent<{ value: string | null }>).detail.value
  if (day && day !== anchor) go(String(day))
})

/* ---------------------------------------------------------------- views */

function go(day: string) {
  anchor = day
  render()
}

function setView(next: CalendarView) {
  view = next
  viewSwitch.value = next
}

function render() {
  const list = visible()
  schedule.hidden = view === "month"
  month.hidden = view !== "month"
  if (view !== "month") schedule.tracks = viewTracks(view, anchor)
  schedule.events = list
  month.setAttribute("month", anchor.slice(0, 7))
  month.events = list
  for (const id of ["previous", "next"]) $(id).setAttribute("aria-label", `${id === "previous" ? "Previous" : "Next"} ${view}`)
  $("title").textContent = viewTitle(view, anchor)
  if (mini.value !== anchor) mini.value = anchor
  if (mini.month !== anchor.slice(0, 7)) mini.month = anchor.slice(0, 7)
  renderUpcoming()
}

viewSwitch.addEventListener("valuechange", (event) => {
  const value = (event as CustomEvent<{ value: string | null }>).detail.value
  if (value === "day" || value === "week" || value === "month") view = value
  render()
})
$("today").addEventListener("click", () => go(today))
$("previous").addEventListener("click", () => go(stepView(view, anchor, -1)))
$("next").addEventListener("click", () => go(stepView(view, anchor, 1)))
month.addEventListener("monthchange", (event) => go(`${(event as CustomEvent<{ value: string }>).detail.value}-01`))
month.addEventListener("daychoose", (event) => {
  setView("day")
  go((event as CustomEvent<{ value: string }>).detail.value)
  // The month gives way to the day: focus goes to its first event, or the day itself.
  requestAnimationFrame(() => requestAnimationFrame(() => schedule.api.element()?.focus()))
})

const restore = (event: CalendarEvent) => {
  if (!events.some((e) => e.id === event.id)) events = [...events, event]
  render()
}

// The schedule draws only the shown calendars; hidden events stay as they were.
schedule.addEventListener("eventschange", (event) => {
  const { value, action, id } = (event as CustomEvent<{ value: ScheduleEvent[]; action?: string; id?: string }>).detail
  const drawn = new Set(visible().map((e) => e.id))
  const gone = action === "delete" ? events.find((e) => e.id === id) : undefined
  events = [...events.filter((e) => !drawn.has(e.id)), ...(value as CalendarEvent[])]
  render()
  if (gone) toast(`Deleted “${gone.title}”`, { action: { label: "Undo", onAction: () => restore(gone) } })
})

/* -------------------------------------------------------------- dialog */

const dialog = $<Popup>("event-dialog")
const content = dialog.querySelector("ui-dialog-content")!
const form = $<HTMLFormElement>("event-form")
const error = $("event-error")
const trackSelect = $<Valued>("event-track")
const startInput = $<HTMLInputElement>("event-start")
const endInput = $<HTMLInputElement>("event-end")
const confirm = $<Popup>("confirm-delete")
let editing: CalendarEvent | null = null
let draft: CalendarEvent | null = null
let focusAfter: string | undefined
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
const fromTime = (text: string) => {
  const [hours, minutes] = text.split(":").map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function showError(text: string | null, field?: "start" | "end") {
  error.textContent = text ?? ""
  for (const [input, name] of [[startInput, "start"], [endInput, "end"]] as const) {
    if (text && field === name) {
      input.setAttribute("aria-invalid", "true")
      input.setAttribute("aria-describedby", "event-error")
    } else {
      input.removeAttribute("aria-invalid")
      input.removeAttribute("aria-describedby")
    }
  }
}

function openDialog(event: CalendarEvent | null) {
  editing = event
  const days = viewDays(view, anchor)
  const track = view === "month" ? (today.startsWith(anchor.slice(0, 7)) ? today : anchor) : days.includes(today) ? today : days[0]!
  draft = event ?? { id: "", track, start: 14 * 60, end: 15 * 60, title: "", calendar: target().id, color: target().color }
  const shownEvent = draft
  $("event-dialog-title").textContent = event ? event.title : "New event"
  $("event-dialog-description").textContent = event ? "Change it, or delete it." : "Add it to the schedule."
  form.setAttribute("aria-label", event ? `Edit ${event.title}` : "New event")
  $("event-submit").textContent = event ? "Save event" : "Add event"
  $<HTMLInputElement>("event-title").value = shownEvent.title
  startInput.value = toTime(shownEvent.start)
  endInput.value = toTime(shownEvent.end)
  $<HTMLInputElement>("event-location").value = shownEvent.location ?? ""
  const tracks = view === "month" ? [{ id: shownEvent.track, label: longDay.format(at(shownEvent.track)) }] : viewTracks(view, anchor)
  $("event-track-list").replaceChildren(...tracks.map((t) => h("ui-select-item", { value: t.id }, t.label)))
  trackSelect.value = shownEvent.track
  $("event-delete-wrap").hidden = !event
  showError(null)
  focusAfter = undefined
  // Focus goes back to the event, or to a saved or deleted one's neighbor, once it closes.
  if (event && view !== "month") content.setAttribute("final-focus", `uiset-schedule-event[value="${CSS.escape(event.id)}"] button`)
  else content.removeAttribute("final-focus")
  void dialog.api.open().then(() => {
    const element = focusAfter && view !== "month" ? schedule.api.eventElement(focusAfter) : undefined
    element?.focus()
  })
}

for (const id of ["new-event", "toolbar-new-event"]) $(id).addEventListener("click", () => openDialog(null))
schedule.addEventListener("open", (event) => {
  const id = (event as CustomEvent<{ value: string }>).detail.value
  openDialog(visible().find((e) => e.id === id) ?? null)
})

form.addEventListener("submit", (event) => {
  event.preventDefault()
  if (!draft) return
  const data = new FormData(form)
  const start = fromTime(String(data.get("event-start")))
  const end = fromTime(String(data.get("event-end")))
  const next: CalendarEvent = {
    ...draft,
    id: editing?.id ?? crypto.randomUUID(),
    title: String(data.get("event-title")),
    track: String(trackSelect.value ?? draft.track),
    start,
    end,
    location: String(data.get("event-location") ?? "") || undefined,
  }
  // The schedule's own rules: hours, steps and overlaps. A month has no schedule to ask.
  const scheduled = view === "month" ? undefined : schedule.api.problem(next)
  const problem =
    end <= start
      ? { text: "It has to end after it starts.", field: "end" as const }
      : start < START_HOUR * 60 || end > END_HOUR * 60
        ? { text: `It has to fit between ${clock(START_HOUR * 60)} and ${clock(END_HOUR * 60)}.`, field: "start" as const }
        : scheduled
          ? { text: scheduled, field: "start" as const }
          : null
  if (problem) {
    showError(problem.text, problem.field)
    ;(problem.field === "end" ? endInput : startInput).focus()
    return
  }
  const isNew = !editing
  events = isNew ? [...events, next] : events.map((e) => (e.id === next.id ? next : e))
  // A saved event shows, even when its calendar was hidden.
  if (!shown.includes(next.calendar)) {
    shown = [...shown, next.calendar]
    calendarGroup.value = shown
  }
  focusAfter = next.id
  render()
  dialog.open = false
  toast(isNew ? `Added “${next.title}”` : `Saved “${next.title}”`)
})

$("event-delete").addEventListener("click", () => {
  if (!editing) return
  $("confirm-title").textContent = `Delete “${editing.title}”?`
  $("confirm-delete-event").setAttribute("data-agent-confirm", `Deletes the event “${editing.title}”`)
  void confirm.api.open()
})

$("confirm-delete-event").addEventListener("click", () => {
  if (!editing) return
  const gone = events.find((e) => e.id === editing!.id) ?? editing
  focusAfter = view === "month" ? undefined : schedule.api.neighbor(gone.id)
  content.removeAttribute("final-focus")
  events = events.filter((e) => e.id !== gone.id)
  render()
  dialog.open = false
  toast(`Deleted “${gone.title}”`, { action: { label: "Undo", onAction: () => restore(gone) } })
})

render()
Object.assign(window, { agent: createAgent() })
