import { keepFocus } from "@ui-sdk/core"
import { addDays, startOfWeek } from "@ui-sdk/core/date"
import { createMemo, createSignal, onSettled } from "solid-js"
import {
  createScheduleController,
  EventDialog,
  isNarrowScreen,
  MonthView,
  Schedule,
  SchedulerToolbar,
  type EventDraft,
  type ScheduleEvent,
  type ScheduleTrack,
  type SchedulerView,
} from "../../src/scheduler"
import { toast } from "../../src/toast"

// The scheduler kit's demo in Solid: React's (src/site/scheduler-demo.tsx), part for part.

const TODAY = "2026-11-16"
const NOW = new Date(Date.UTC(2026, 10, 16, 11, 20))
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
const shortDay = { format: (d: Date) => `${weekdayName.format(d)} ${d.getUTCDate()}` }
const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})
const at = (iso: string) => new Date(`${iso}T00:00:00Z`)

const seed: ScheduleEvent[] = [
  ["2026-11-16", 9 * 60, 9 * 60 + 30, "Standup", 1, "Atlas room"],
  ["2026-11-16", 10 * 60, 11 * 60 + 30, "Design review", 2, "Studio"],
  ["2026-11-16", 10 * 60 + 30, 11 * 60, "Call with Grace", 3, undefined],
  ["2026-11-17", 13 * 60, 14 * 60, "Interview: platform", 4, "Room 2"],
  ["2026-11-18", 9 * 60, 9 * 60 + 30, "Standup", 1, "Atlas room"],
  ["2026-11-18", 15 * 60, 16 * 60 + 30, "Launch rehearsal", 5, "Main stage"],
  ["2026-11-19", 11 * 60, 12 * 60, "Board prep", 7, undefined],
  ["2026-11-20", 16 * 60, 17 * 60, "Demo day", 3, "Main stage"],
].map(([track, start, end, title, color, location], i) => ({
  id: `e${i + 1}`,
  track: track as string,
  start: start as number,
  end: end as number,
  title: title as string,
  color: color as number,
  location: location as string | undefined,
}))

// Times are wall-clock minutes in a zone; the gallery shows UTC so it renders the same everywhere.
const ZONE = "UTC"

function SchedulerDemo() {
  const schedule = createScheduleController()
  const [events, setEvents] = createSignal(seed)
  const [view, setView] = createSignal<SchedulerView>("week", { ownedWrite: true })
  // A phone starts on one day: a week of columns doesn't fit.
  onSettled(() => {
    if (isNarrowScreen()) setView("day")
  })
  const [anchor, setAnchor] = createSignal(TODAY)
  const [open, setOpen] = createSignal<EventDraft | null>(null)

  const days = createMemo(() => {
    if (view() === "day") return [anchor()]
    const weekStart = startOfWeek(anchor(), 1)
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  })
  const tracks = createMemo<ScheduleTrack[]>(() =>
    days().map((d) => ({
      id: d,
      label: longDay.format(at(d)),
      short: shortDay.format(at(d)),
    })),
  )
  const title = () =>
    view() === "month"
      ? monthName.format(at(`${anchor().slice(0, 7)}-01`))
      : view() === "day"
        ? longDay.format(at(anchor()))
        : `${monthDay.format(at(days()[0]!))} – ${monthDay.format(at(days().at(-1)!))}, ${days()[0]!.slice(0, 4)}`
  const move = (dir: 1 | -1) => {
    if (view() === "month") {
      const d = at(`${anchor().slice(0, 7)}-01`)
      d.setUTCMonth(d.getUTCMonth() + dir)
      setAnchor(d.toISOString().slice(0, 10))
    } else setAnchor(addDays(anchor(), dir * (view() === "day" ? 1 : 7)))
  }

  return (
    <div class="scheduler-demo">
      <SchedulerToolbar
        title={title()}
        view={view()}
        onViewChange={setView}
        unit={view()}
        onToday={() => setAnchor(TODAY)}
        onPrevious={() => move(-1)}
        onNext={() => move(1)}
        onNewEvent={() =>
          setOpen({
            track: view() === "month" ? TODAY : days()[0]!,
            start: 14 * 60,
            end: 15 * 60,
          })
        }
      />
      {view() === "month" ? (
        <MonthView
          label="Month of events"
          month={anchor().slice(0, 7)}
          events={events()}
          today={TODAY}
          weekStartsOn={1}
          onMonthChange={(m) => setAnchor(`${m}-01`)}
          onDayChoose={(day) => {
            setAnchor(day)
            setView("day")
            // The month gives way to the day: focus goes to its first event, or the day itself.
            keepFocus(() => schedule.element())
          }}
        />
      ) : (
        <Schedule
          label="Team calendar"
          controller={schedule}
          tracks={tracks()}
          events={events()}
          onEventsChange={(next, details) => {
            const before = events()
            setEvents(next)
            if (details.action === "delete")
              toast("Event deleted", {
                action: { label: "Undo", onAction: () => setEvents(before) },
              })
          }}
          onEventOpen={setOpen}
          now={NOW}
          timeZone={ZONE}
          today={TODAY}
          startHour={8}
          endHour={19}
        />
      )}
      <EventDialog
        schedule={schedule}
        startHour={8}
        endHour={19}
        step={15}
        event={open()}
        tracks={
          view() === "month"
            ? [{ id: open()?.track ?? TODAY, label: longDay.format(at(open()?.track ?? TODAY)) }]
            : tracks()
        }
        onClose={() => setOpen(null)}
        onSave={(event) =>
          setEvents((all) =>
            all.some((e) => e.id === event.id)
              ? all.map((e) => (e.id === event.id ? event : e))
              : [...all, event],
          )
        }
        onDelete={(event) => setEvents((all) => all.filter((e) => e.id !== event.id))}
      />
    </div>
  )
}

export { SchedulerDemo }
