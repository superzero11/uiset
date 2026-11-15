// The Scheduler for Web Components: <uiset-schedule> draws a week, a day or a timeline from
// `tracks` and `events`, on the same primitive as the React Schedule (scheduler/schedule.ts):
// drag to draw, move and resize, arrows to move, Shift with arrows to change the end, Delete
// to remove, Enter to open. <uiset-schedule-month> is the month at a glance, on UI SDK's
// calendar. The toolbar and the event dialog are the page's own (UI SDK's buttons, segmented
// control and dialog), as docs/web-components.md shows.
import { pageLocale, stackSpans, type Span } from "@ui-sdk/core"
import { createParts, wrappedButton } from "@ui-sdk/web"
import "@ui-sdk/web/calendar"
import { clock, schedulePrimitive, type ScheduleEvent } from "@/registry/uiset/ui/scheduler/schedule"
import "@/registry/uiset/ui/chart/tokens.css"
import "@/registry/uiset/ui/scheduler/scheduler.css"
import { attr, h, place, uid, upgradeProperties } from "./dom"

type ScheduleTrack = { id: string; label: string; short?: string }

type ScheduleElement = HTMLElement & {
  tracks?: ScheduleTrack[]
  events?: ScheduleEvent[]
  /** Events that can't change, like ones from another calendar. */
  locked?: (event: ScheduleEvent) => boolean
  /** Makes the event a draw or click creates; return null to refuse. Defaults to "New event". */
  create?: (span: Span) => ScheduleEvent | null
  /** How times read. Defaults to 12-hour English, like "9:30 AM". */
  timeLabel?: (minutes: number) => string
  /** An event's face, instead of its title, times and place. */
  renderEvent?: (event: ScheduleEvent) => Node
  /** Now, for the current-time line on today's track. */
  now?: Date
}

type ScheduleInstance = {
  get: () => object
  subscribe: (run: () => void) => () => void
  api: { spans: { spans: (state: object) => ScheduleEvent[]; spanStyle: (event: ScheduleEvent, lane?: unknown) => string } }
}

/** A boolean attribute, as UI SDK reads them: on when present, unless it says "false". */
const isOn = (el: Element, name: string) => el.hasAttribute(name) && el.getAttribute(name) !== "false"

// A function's identity, so a new renderEvent or timeLabel draws events again.
const fnIds = new WeakMap<object, number>()
let nextFn = 1
const fnId = (fn?: object) => (fn ? (fnIds.get(fn) ?? (fnIds.set(fn, nextFn++), nextFn - 1)) : 0)

const series = (color?: number) => `var(--chart-${Math.min(8, Math.max(1, Math.round(color ?? 1)))})`
const hourAttr = (el: Element, name: string, fallback: number) => {
  const value = Number(el.getAttribute(name))
  return Number.isFinite(value) && el.hasAttribute(name) ? value : fallback
}

/** Minutes past midnight of `date` on the wall clock in `timeZone` (the viewer's by default). */
function wallMinutes(date: Date, timeZone?: string | null) {
  if (!timeZone) return date.getHours() * 60 + date.getMinutes()
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone }).formatToParts(date)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return part("hour") * 60 + part("minute")
}

// Each schedule keeps its tracks and event buttons across renders: a drag holds the pointer
// on its button, so that button must stay the same element while it moves.
const views = new WeakMap<ScheduleElement, ScheduleView>()

class ScheduleView {
  private help = h("p", { id: uid("schedule-help"), hidden: true }, "Each event is a button. Arrow keys move it, Shift with arrows changes when it ends, Delete removes it, and Enter opens it.")
  private head = h("div", { class: "schedule-head", "aria-hidden": "true" })
  private gutter = h("div", { class: "schedule-gutter", "aria-hidden": "true" })
  private tracksBox = h("div", { class: "schedule-tracks" })
  private trackEls = new Map<string, HTMLElement>()
  private eventEls = new Map<string, { part: HTMLElement; button: HTMLButtonElement; sig: string }>()
  private instance?: ScheduleInstance

  private queued = false

  constructor(private el: ScheduleElement) {
    el.classList.add("schedule")
    el.replaceChildren(this.help, this.head, h("div", { class: "schedule-body" }, this.gutter, this.tracksBox))
    // These attributes change what's drawn: they draw again here.
    // Options read from attributes (axis, hours, step) go back into the primitive, so a switch
    // to a timeline lays events out across and drags them across too.
    new MutationObserver(() => {
      ;(el as HTMLElement & { reconfigure?: () => void }).reconfigure?.()
      this.schedule()
    }).observe(el, { attributes: true, attributeFilter: ["axis", "start-hour", "end-hour", "today", "time-zone", "step", "size", "aria-describedby"] })
  }

  private schedule() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      this.draw()
    })
  }

  attach(instance: ScheduleInstance) {
    this.instance = instance
    // Properties set together draw once.
    this.schedule()
    // While an event is dragged the drawn events follow the draft.
    let last = instance.api.spans.spans(instance.get())
    return instance.subscribe(() => {
      const now = instance.api.spans.spans(instance.get())
      if (now === last) return
      last = now
      this.drawEvents()
    })
  }

  private get axis() {
    return this.el.getAttribute("axis") === "x" ? "x" : "y"
  }

  draw() {
    const el = this.el
    const tracks = el.tracks ?? []
    const startHour = hourAttr(el, "start-hour", 8)
    const endHour = hourAttr(el, "end-hour", 20)
    const time = el.timeLabel ?? clock
    const today = el.getAttribute("today")
    const axis = this.axis
    el.dataset.axis = axis
    // The page's own description stays; the schedule's help goes after it.
    const described = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== this.help.id)
    attr(el, "aria-describedby", [...described, this.help.id].join(" "))
    el.style.setProperty("--schedule-tracks", String(tracks.length))
    el.style.setProperty("--schedule-hours", String(endHour - startHour))
    const hours = Array.from({ length: Math.max(0, endHour - startHour) }, (_, i) => startHour + i)
    const hourName = (hour: number) => time(hour * 60).replace(":00", "")
    const trackName = (t: ScheduleTrack, className: string) => h("span", { class: className, "data-today": t.id === today }, t.short ?? t.label)
    this.head.replaceChildren(
      h("span", { class: "schedule-corner" }),
      ...(axis === "y" ? tracks.map((t) => trackName(t, "schedule-track-name")) : hours.map((hr) => h("span", { class: "schedule-hour-name" }, hourName(hr)))),
    )
    this.gutter.replaceChildren(
      ...(axis === "y" ? hours.map((hr) => h("span", { class: "schedule-hour-name" }, hourName(hr))) : tracks.map((t) => trackName(t, "schedule-track-name"))),
    )
    // Tracks are kept by id, so a track's events and focus stay as days change around it.
    const shown = new Set(tracks.map((t) => t.id))
    for (const [id, track] of this.trackEls) if (!shown.has(id)) (track.remove(), this.trackEls.delete(id))
    place(
      this.tracksBox,
      tracks.map((t) => {
        let track = this.trackEls.get(t.id)
        if (!track) this.trackEls.set(t.id, (track = h("uiset-schedule-track", { value: t.id, class: "schedule-track" })))
        track.setAttribute("aria-label", t.label)
        attr(track, "data-today", t.id === today)
        return track
      }),
      (child) => child.localName === "uiset-schedule-track",
    )
    this.drawEvents()
  }

  drawEvents() {
    const instance = this.instance
    if (!instance) return
    const el = this.el
    const tracks = el.tracks ?? []
    const time = el.timeLabel ?? clock
    const labels = new Map(tracks.map((t) => [t.id, t.label]))
    const startHour = hourAttr(el, "start-hour", 8)
    const endHour = hourAttr(el, "end-hour", 20)
    const min = startHour * 60
    const max = endHour * 60
    const drawn = instance.api.spans.spans(instance.get())
    const byTrack = new Map<string, ScheduleEvent[]>()
    for (const event of drawn) (byTrack.get(event.track) ?? byTrack.set(event.track, []).get(event.track)!).push(event)
    const nowMinutes = el.now ? wallMinutes(el.now, el.getAttribute("time-zone")) : null
    const nowAt = nowMinutes !== null && nowMinutes >= min && nowMinutes <= max ? (nowMinutes - min) / (max - min) : null
    const today = el.getAttribute("today")
    const kept = new Set<string>()
    for (const t of tracks) {
      const track = this.trackEls.get(t.id)
      if (!track) continue
      const own = (byTrack.get(t.id) ?? []).sort((a, b) => a.start - b.start)
      const lanes = stackSpans(own)
      const parts: HTMLElement[] = []
      for (const event of own) {
        kept.add(event.id)
        const locked = el.locked?.(event) ?? false
        // Named from this render's tracks, so a new week's names are never a render behind.
        const name = `${event.title}, ${labels.get(event.track) ?? event.track}, ${time(event.start)} to ${time(event.end)}${event.location ? `, ${event.location}` : ""}`
        const sig = JSON.stringify([event.title, event.location, event.start, event.end, locked, fnId(el.renderEvent), fnId(el.timeLabel)])
        let view = this.eventEls.get(event.id)
        if (!view) {
          const button = h("button", { type: "button", class: "schedule-event" }) as HTMLButtonElement
          const part = h("uiset-schedule-event", { value: event.id }, button)
          this.eventEls.set(event.id, (view = { part, button, sig: "" }))
        }
        const { button } = view
        attr(button, "aria-label", name)
        attr(button, "aria-describedby", this.help.id)
        attr(button, "data-locked", locked)
        attr(button, "style", `${instance.api.spans.spanStyle(event, lanes.get(event.id))};--series:${series(event.color)}`)
        if (view.sig !== sig) {
          view.sig = sig
          button.replaceChildren(
            ...(el.renderEvent
              ? [el.renderEvent(event)]
              : [
                  h("span", { class: "schedule-event-title" }, event.title),
                  h("span", { class: "schedule-event-time" }, `${time(event.start)} – ${time(event.end)}`),
                  ...(event.location ? [h("span", { class: "schedule-event-place" }, event.location)] : []),
                ]),
            ...(locked ? [] : [h("span", { class: "schedule-event-edge", "data-span-edge": "end", "aria-hidden": "true" })]),
          )
        }
        parts.push(view.part)
      }
      // A moved event changes track: its part moves with it, staying the same element.
      const line = t.id === today && nowAt !== null ? h("span", { class: "schedule-now", "aria-hidden": "true" }) : null
      if (line) line.style[this.axis === "y" ? "top" : "insetInlineStart"] = `${nowAt! * 100}%`
      track.querySelector(":scope > .schedule-now")?.remove()
      if (line) track.prepend(line)
      place(track, parts, (child) => child.localName === "uiset-schedule-event")
    }
    for (const [id, view] of this.eventEls) if (!kept.has(id)) (view.part.remove(), this.eventEls.delete(id))
  }
}

/* --------------------------------------------------------------------- Month */

/**
 * <uiset-schedule-month month="2026-11" today="2026-11-15" label="November"> lists each day's
 * first events (`events`); choosing a day fires `daychoose` with its ISO date, and the month
 * buttons fire `monthchange`. Day names carry their events for screen readers.
 */
class UISetScheduleMonth extends HTMLElement {
  static observedAttributes = ["month", "today", "label", "limit", "locale", "week-starts-on"]
  #list: ScheduleEvent[] = []
  #timeLabel?: (minutes: number) => string
  private calendar?: HTMLElement & { month?: string }
  private observer?: MutationObserver

  get events() {
    return this.#list
  }
  set events(v: ScheduleEvent[]) {
    this.#list = v ?? []
    this.decorate()
  }
  /** How times read on the chips and in each day's name. */
  get timeLabel() {
    return this.#timeLabel
  }
  set timeLabel(v: ((minutes: number) => string) | undefined) {
    this.#timeLabel = v
    this.redecorate()
  }

  connectedCallback() {
    // Properties a page set before this element was defined go through the accessors.
    upgradeProperties(this, ["events", "timeLabel"])
    if (!this.calendar) this.build()
    this.sync()
  }

  // Every day is decorated again (a new timeLabel changes every chip).
  private redecorate() {
    for (const button of this.calendar?.querySelectorAll<HTMLElement>("[data-decorated]") ?? []) delete button.dataset.decorated
    this.decorate()
  }
  disconnectedCallback() {
    this.observer?.disconnect()
    this.observer = undefined
  }
  attributeChangedCallback() {
    if (this.calendar) this.sync()
  }

  private build() {
    const weekdays = h("ui-calendar-weekdays")
    weekdays.innerHTML = "<template><ui-calendar-weekday></ui-calendar-weekday></template>"
    const weeks = h("ui-calendar-weeks")
    weeks.innerHTML = "<template><ui-calendar-day></ui-calendar-day></template>"
    // The same parts as the React month: just the grid. The page's toolbar moves between
    // months and names the one shown.
    this.calendar = h("ui-calendar", { class: "schedule-month" }, h("ui-calendar-grid", null, weekdays, weeks)) as HTMLElement & { month?: string }
    this.calendar.addEventListener("valuechange", (event) => {
      const day = (event as CustomEvent<{ value: string | null }>).detail.value
      if (day) this.dispatchEvent(new CustomEvent("daychoose", { detail: { value: String(day) } }))
    })
    this.calendar.addEventListener("monthchange", (event) => {
      this.dispatchEvent(new CustomEvent("monthchange", { detail: { value: (event as CustomEvent<{ value: string }>).detail.value } }))
      queueMicrotask(() => this.decorate())
    })
    this.replaceChildren(this.calendar)
  }

  private sync() {
    const cal = this.calendar!
    for (const name of ["month", "today", "locale", "week-starts-on"]) {
      const value = this.getAttribute(name)
      if (value === null) cal.removeAttribute(name === "month" ? "default-month" : name)
      else cal.setAttribute(name === "month" ? "default-month" : name, value)
    }
    if (this.getAttribute("month") && cal.month !== undefined && cal.month !== this.getAttribute("month")) cal.month = this.getAttribute("month")!
    cal.querySelector("ui-calendar-grid")?.setAttribute("aria-label", this.getAttribute("label") ?? "Month")
    // The calendar draws its days from its template: each is decorated once it's there.
    this.observer?.disconnect()
    this.observer = new MutationObserver(() => this.decorate())
    this.observer.observe(cal, { childList: true, subtree: true })
    this.decorate()
  }

  private decorating = false
  private decorate() {
    if (!this.calendar || this.decorating) return
    this.decorating = true
    const time = this.#timeLabel ?? clock
    const limit = Number(this.getAttribute("limit")) || 3
    const lang = this.getAttribute("locale") ?? pageLocale() ?? "en-US"
    const full = new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    const byDay = new Map<string, ScheduleEvent[]>()
    for (const e of [...this.#list].sort((a, b) => a.start - b.start)) (byDay.get(e.track) ?? byDay.set(e.track, []).get(e.track)!).push(e)
    for (const day of this.calendar.querySelectorAll<HTMLElement>("ui-calendar-day")) {
      const button = day.querySelector<HTMLElement>("button") ?? day
      const iso = day.getAttribute("value") ?? button.getAttribute("data-value")
      if (!iso) continue
      const list = byDay.get(iso) ?? []
      const sig = JSON.stringify([iso, list.map((e) => [e.id, e.title, e.start, e.color]), limit])
      // The calendar writes a day's number again when it redraws that day: decorated days
      // whose chips it wrote over are decorated again.
      if (button.dataset.decorated === sig && button.querySelector(":scope > .schedule-month-day")) continue
      button.dataset.decorated = sig
      // The day's name carries its events: the chips alone would be silent to screen readers.
      const date = full.format(new Date(`${iso}T00:00:00Z`))
      button.setAttribute("aria-label", list.length ? `${date}, ${list.length} ${list.length === 1 ? "event" : "events"}: ${list.map((e) => `${e.title} at ${time(e.start)}`).join(", ")}` : date)
      const box = h("span", { class: "schedule-month-day" }, h("span", { class: "schedule-month-number" }, String(Number(iso.slice(8)))))
      for (const e of list.slice(0, limit)) {
        const chip = h("span", { class: "schedule-month-chip" }, `${time(e.start).replace(":00", "")} ${e.title}`)
        chip.style.setProperty("--series", series(e.color))
        box.append(chip)
      }
      if (list.length > limit) box.append(h("span", { class: "schedule-month-more" }, `${list.length - limit} more`))
      button.replaceChildren(box)
    }
    this.decorating = false
  }
}

function defineSchedule() {
  createParts(schedulePrimitive, {
    root: {
      tag: "uiset-schedule",
      properties: ["tracks", "create", "renderEvent", "now"],
      // Hours, today and the time zone are attributes; `openable` lets Enter, clicks and
      // agents open events (without it the schedule doesn't, and agents are told).
      kinds: { startHour: "number", endHour: "number", today: "string", timeZone: "string", openable: "boolean" },
      state: {
        events: { get: (api) => api.events(), set: (api, events: ScheduleEvent[]) => api.setEvents(events) },
      },
      api: ["openEvent", "addEvent", "moveEvent", "resizeEvent", "removeEvent", "problem", "eventElement", "neighbor", "element"],
      // Tracks come as objects here, like React's; hours as `start-hour` and `end-hour`.
      options: (el) => {
        const s = el as ScheduleElement
        const tracks = s.tracks ?? []
        const labels = new Map(tracks.map((t) => [t.id, t.label]))
        const step = hourAttr(el, "step", 15)
        return {
          tracks: tracks.map((t) => t.id),
          trackLabel: (id: string) => labels.get(id) ?? id,
          axis: el.getAttribute("axis") === "x" ? "x" : "y",
          min: hourAttr(el, "start-hour", 8) * 60,
          max: hourAttr(el, "end-hour", 20) * 60,
          step,
          minSize: step,
          size: hourAttr(el, "size", 60),
          overlap: el.getAttribute("overlap") !== "false",
          ...(s.create ? { onCreate: s.create } : {}),
          ...(s.timeLabel ? { timeLabel: s.timeLabel } : {}),
          ...(isOn(el, "openable") ? {} : { onOpen: undefined }),
        }
      },
      render: (el, instance) => {
        const s = el as ScheduleElement
        let view = views.get(s)
        if (!view) views.set(s, (view = new ScheduleView(s)))
        return view.attach(instance as unknown as ScheduleInstance)
      },
    },
    track: "uiset-schedule-track",
    event: { tag: "uiset-schedule-event", target: wrappedButton, display: "contents" },
  })
  customElements.define("uiset-schedule-month", UISetScheduleMonth)
}

export { defineSchedule, UISetScheduleMonth }
export type { ScheduleElement, ScheduleTrack }
