// The calendar app template's sample calendars and events, and the date math both pages share
// (which days a view shows, its title, stepping, what's next), framework-free, so the
// React template and the web page show the same weeks. Times are wall-clock minutes in
// UTC, with a fixed "today", so the sample renders the same everywhere.
import { addDays, addMonths, startOfWeek } from "@ui-sdk/core/date"
import { clock, type ScheduleEvent } from "../scheduler/schedule"

type CalendarView = "day" | "week" | "month"
/** A calendar people can show or hide; `color` is a chart slot, 1 to 8. */
type CalendarInfo = { id: string; label: string; color: number }
/** An event on a calendar. Its color comes from the calendar. */
type CalendarEvent = ScheduleEvent & { calendar: string }
type CalendarTrack = { id: string; label: string; short?: string }

const TODAY = "2026-11-16"
const NOW = new Date(Date.UTC(2026, 10, 16, 11, 20))
const ZONE = "UTC"
const START_HOUR = 8
const END_HOUR = 20
const WEEK_STARTS_ON = 1

// Chart slots in their fixed order, so the three read apart in every skin.
const sampleCalendars: CalendarInfo[] = [
  { id: "work", label: "Work", color: 1 },
  { id: "team", label: "Team", color: 2 },
  { id: "personal", label: "Personal", color: 3 },
]

const h = (hour: number, minute = 0) => hour * 60 + minute
const sampleEvents: CalendarEvent[] = (
  [
    ["2026-11-04", h(15), h(16), "Retro", "team", undefined],
    ["2026-11-10", h(9), h(17), "Team offsite", "team", "Harbor house"],
    ["2026-11-12", h(18), h(19, 30), "Book club", "personal", undefined],
    ["2026-11-16", h(9), h(9, 30), "Standup", "team", "Atlas room"],
    ["2026-11-16", h(10), h(11, 30), "Design review", "work", "Studio"],
    ["2026-11-16", h(12, 30), h(13, 30), "Lunch with Ada", "personal", undefined],
    ["2026-11-16", h(15), h(16), "Roadmap planning", "work", "Atlas room"],
    ["2026-11-17", h(9), h(9, 30), "Standup", "team", "Atlas room"],
    ["2026-11-17", h(13), h(14), "Interview: platform", "work", "Room 2"],
    ["2026-11-17", h(18), h(19, 30), "Climbing", "personal", undefined],
    ["2026-11-18", h(9), h(9, 30), "Standup", "team", "Atlas room"],
    ["2026-11-18", h(11), h(12), "1:1 with Grace", "work", undefined],
    ["2026-11-18", h(15), h(16, 30), "Launch rehearsal", "team", "Main stage"],
    ["2026-11-19", h(9), h(9, 30), "Standup", "team", "Atlas room"],
    ["2026-11-19", h(11), h(12), "Board prep", "work", undefined],
    ["2026-11-19", h(17, 30), h(18, 30), "Dentist", "personal", undefined],
    ["2026-11-20", h(9), h(9, 30), "Standup", "team", "Atlas room"],
    ["2026-11-20", h(12), h(13), "Lunch and learn", "team", "Studio"],
    ["2026-11-20", h(16), h(17), "Demo day", "team", "Main stage"],
    ["2026-11-21", h(10), h(12), "Farmers market", "personal", undefined],
    ["2026-11-23", h(9), h(9, 30), "Standup", "team", "Atlas room"],
    ["2026-11-23", h(14), h(15, 30), "Quarterly review", "work", "Atlas room"],
    ["2026-11-25", h(10), h(11), "Design critique", "work", "Studio"],
    ["2026-11-26", h(12), h(15), "Thanksgiving lunch", "personal", undefined],
    ["2026-12-02", h(16), h(17), "Year-end planning", "work", undefined],
  ] as const
).map(([track, start, end, title, calendar, location], i) => ({
  id: `ev${i + 1}`,
  track,
  start,
  end,
  title,
  calendar,
  location,
}))

const at = (iso: string) => new Date(`${iso}T00:00:00Z`)
const longDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})
const weekdayName = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
})
const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})
const shortDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

/** The days a day or week view shows. A week starts on Monday. */
function viewDays(view: CalendarView, anchor: string) {
  if (view === "day") return [anchor]
  const start = startOfWeek(anchor, WEEK_STARTS_ON)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** The schedule's tracks for a day or week: "Monday, November 16", short "Mon 16". */
const viewTracks = (view: CalendarView, anchor: string): CalendarTrack[] =>
  viewDays(view, anchor).map((d) => ({
    id: d,
    label: longDay.format(at(d)),
    short: `${weekdayName.format(at(d))} ${Number(d.slice(8))}`,
  }))

/** The toolbar's title: "Monday, November 16", "Nov 16 – 22, 2026" or "November 2026". */
function viewTitle(view: CalendarView, anchor: string) {
  if (view === "month") return monthName.format(at(`${anchor.slice(0, 7)}-01`))
  if (view === "day") return longDay.format(at(anchor))
  const days = viewDays(view, anchor)
  const first = at(days[0]!)
  const last = at(days.at(-1)!)
  const end =
    first.getUTCMonth() === last.getUTCMonth()
      ? String(last.getUTCDate())
      : monthDay.format(last)
  return `${monthDay.format(first)} – ${end}, ${days.at(-1)!.slice(0, 4)}`
}

/** Previous or next: a day, a week or a month. */
function stepView(view: CalendarView, anchor: string, direction: 1 | -1) {
  if (view === "month") return addMonths(`${anchor.slice(0, 7)}-01`, direction)
  return addDays(anchor, direction * (view === "day" ? 1 : 7))
}

/** Events on the calendars that are shown, colored by their calendar. */
function visibleEvents(
  events: readonly CalendarEvent[],
  calendars: readonly CalendarInfo[],
  shown: readonly string[],
) {
  const colors = new Map(calendars.map((c) => [c.id, c.color]))
  return events
    .filter((e) => shown.includes(e.calendar))
    .map((e) => ({ ...e, color: colors.get(e.calendar) ?? 1 }))
}

/** The next few events that haven't started yet, soonest first. */
function upcoming(events: readonly CalendarEvent[], now: Date, limit = 4) {
  const today = now.toISOString().slice(0, 10)
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return events
    .filter((e) => e.track > today || (e.track === today && e.start >= minutes))
    .sort((a, b) => a.track.localeCompare(b.track) || a.start - b.start)
    .slice(0, limit)
}

/** "Today at 12:30 PM", "Tomorrow at 9:00 AM", "Wed, Nov 18 at 3:00 PM". */
function when(event: CalendarEvent, today: string) {
  const day =
    event.track === today
      ? "Today"
      : event.track === addDays(today, 1)
        ? "Tomorrow"
        : shortDate.format(at(event.track))
  return `${day} at ${clock(event.start)}`
}

export {
  END_HOUR,
  NOW,
  START_HOUR,
  TODAY,
  WEEK_STARTS_ON,
  ZONE,
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
}
export type { CalendarEvent, CalendarInfo, CalendarTrack, CalendarView }
