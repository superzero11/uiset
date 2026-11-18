"use client"

import { useId, useState, type CSSProperties, type ReactNode } from "react"
import { AppShell } from "../app-shell"
import { Button } from "../button"
import { Calendar } from "../calendar"
import { Checkbox, CheckboxGroup } from "../checkbox"
import { Label } from "../label"
import {
  createScheduleController,
  EventDialog,
  MonthView,
  Schedule,
  SchedulerToolbar,
  type EventDraft,
  type ScheduleChange,
  type ScheduleEvent,
} from "../scheduler"
import { Icon } from "../shell/icons"
import { toast } from "../toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip"
import {
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
  type CalendarEvent,
  type CalendarInfo,
  type CalendarView,
} from "./calendar-app-sample"
import "./templates.css"
import { keepFocus } from "@ui-sdk/core"

// A calendar app: a day, a week or a month of events, with a small month to jump around,
// calendars to show or hide, and what's next. Events are drawn, moved and resized on the
// schedule, and created, edited and deleted in its dialog. Each event's color is its
// calendar's. Mount <Toaster /> once.

const series = (color: number) =>
  ({ "--series": `var(--chart-${color})` }) as CSSProperties

function CalendarAppTemplate({
  defaultEvents = sampleEvents,
  calendars = sampleCalendars,
  today = TODAY,
  now = NOW,
  timeZone = ZONE,
  brand = "Acme Calendar",
  contentElement = "main",
  onSave,
  onDelete,
}: {
  /** The events when the page opens; the template keeps them after that. */
  defaultEvents?: readonly CalendarEvent[]
  /** Calendars people can show or hide; each one's `color` is a chart slot, 1 to 8. */
  calendars?: readonly CalendarInfo[]
  /** Today, as an ISO date in `timeZone`. Pass the real date in an app; it's fixed for the sample. */
  today?: string
  /** Now, for the current-time line and "Upcoming". */
  now?: Date
  /** The zone event times are in. */
  timeZone?: string
  brand?: ReactNode
  contentElement?: "main" | "div"
  /** Saves a new or changed event: from the dialog, a drag or the keyboard. */
  onSave?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
}) {
  const [schedule] = useState(createScheduleController)
  const [events, setEvents] = useState<CalendarEvent[]>([...defaultEvents])
  const [shown, setShown] = useState<string[]>(() => calendars.map((c) => c.id))
  const [view, setView] = useState<CalendarView>("week")
  const [anchor, setAnchor] = useState(today)
  const [miniMonth, setMiniMonth] = useState(today.slice(0, 7))
  const [open, setOpen] = useState<EventDraft | null>(null)
  const calendarsId = useId()
  const upcomingId = useId()

  // Every jump moves the small month along with the view.
  const go = (day: string) => {
    setAnchor(day)
    setMiniMonth(day.slice(0, 7))
  }
  const days = viewDays(view, anchor)
  const tracks = viewTracks(view, anchor)
  const visible = visibleEvents(events, calendars, shown)
  // New events go on the first calendar that's shown.
  const target = calendars.find((c) => shown.includes(c.id)) ?? calendars[0]!
  const next = upcoming(visible as CalendarEvent[], now)

  const newEvent = () => {
    const inMonth = today.startsWith(anchor.slice(0, 7))
    const track =
      view === "month"
        ? inMonth
          ? today
          : anchor
        : days.includes(today)
          ? today
          : days[0]!
    setOpen({
      track,
      start: 14 * 60,
      end: 15 * 60,
      calendar: target.id,
      color: target.color,
    } as EventDraft)
  }

  const restore = (event: CalendarEvent) =>
    setEvents((all) => (all.some((e) => e.id === event.id) ? all : [...all, event]))

  // The schedule draws only the shown calendars; hidden events stay as they were.
  const change = (drawn: ScheduleEvent[], details: ScheduleChange) => {
    const ids = new Set(visible.map((e) => e.id))
    setEvents([...events.filter((e) => !ids.has(e.id)), ...(drawn as CalendarEvent[])])
    if (details.action === "delete") {
      const gone = events.find((e) => e.id === details.id)
      if (!gone) return
      onDelete?.(gone)
      toast(`Deleted “${gone.title}”`, {
        action: { label: "Undo", onAction: () => restore(gone) },
      })
      return
    }
    const changed = drawn.find((e) => e.id === details.id)
    if (changed) onSave?.(changed as CalendarEvent)
  }

  const sidebar = (
    <div className="calendar-sidebar">
      {/* Collapsed to icons, New event keeps its name in the hidden label and the tooltip. */}
      <Tooltip>
        <TooltipTrigger render={<Button className="calendar-new" onClick={newEvent} />}>
          <Icon name="plus" />
          <span className="sidebar-label">New event</span>
        </TooltipTrigger>
        {/* Hidden from agents: it repeats the button's name, which a closed tooltip takes (#604). */}
        <TooltipContent side="right" className="sidebar-tooltip" data-agent-hidden="">
          New event
        </TooltipContent>
      </Tooltip>
      <Calendar
        className="calendar-mini"
        value={anchor}
        month={miniMonth}
        onMonthChange={(month) => setMiniMonth(String(month))}
        onValueChange={(day) => day && go(String(day))}
        today={today}
        weekStartsOn={WEEK_STARTS_ON}
        locale="en-US"
      />
      <div className="calendar-side-section">
        <p id={calendarsId} className="sidebar-group-title">
          Calendars
        </p>
        <CheckboxGroup
          aria-labelledby={calendarsId}
          className="calendar-list"
          value={shown}
          onValueChange={(value) => setShown(value as string[])}
        >
          {calendars.map((c) => (
            <Label key={c.id} className="calendar-list-item" style={series(c.color)}>
              <Checkbox value={c.id} />
              {c.label}
            </Label>
          ))}
        </CheckboxGroup>
      </div>
      <div className="calendar-side-section">
        <p id={upcomingId} className="sidebar-group-title">
          Upcoming
        </p>
        {next.length ? (
          <ul className="calendar-upcoming" aria-labelledby={upcomingId}>
            {next.map((e) => (
              <li key={e.id}>
                <Button
                  variant="ghost"
                  className="calendar-upcoming-item"
                  style={series(e.color ?? 1)}
                  onClick={() => {
                    if (view === "month") setView("week")
                    go(e.track)
                    setOpen(e)
                  }}
                >
                  <span className="calendar-upcoming-title">{e.title}</span>
                  <span className="calendar-upcoming-when">{when(e, today)}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="calendar-upcoming-empty">Nothing else on the shown calendars.</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="template-shell">
      <AppShell
        label="Calendar navigation"
        brand={<span className="template-brand">{brand}</span>}
        contentElement={contentElement}
        sidebar={sidebar}
      >
        <div className="calendar-app">
          <h1 className="uiset-visually-hidden">Calendar</h1>
          <SchedulerToolbar
            title={viewTitle(view, anchor)}
            view={view}
            onViewChange={(v) => setView(v as CalendarView)}
            unit={view}
            onToday={() => go(today)}
            onPrevious={() => go(stepView(view, anchor, -1))}
            onNext={() => go(stepView(view, anchor, 1))}
            onNewEvent={newEvent}
          />
          {view === "month" ? (
            <MonthView
              label="Month of events"
              month={anchor.slice(0, 7)}
              events={visible}
              today={today}
              weekStartsOn={WEEK_STARTS_ON}
              locale="en-US"
              onMonthChange={(month) => go(`${month}-01`)}
              onDayChoose={(day) => {
                go(day)
                setView("day")
                // The month gives way to the day: focus goes to its first event, or the day itself.
                keepFocus(() => schedule.element())
              }}
            />
          ) : (
            <Schedule
              label="My calendar"
              controller={schedule}
              tracks={tracks}
              events={visible}
              onEventsChange={change}
              onEventOpen={setOpen}
              onCreate={(span) =>
                ({
                  ...span,
                  title: "New event",
                  calendar: target.id,
                  color: target.color,
                }) as ScheduleEvent
              }
              now={now}
              timeZone={timeZone}
              today={today}
              startHour={START_HOUR}
              endHour={END_HOUR}
            />
          )}
        </div>
        <EventDialog
          schedule={schedule}
          startHour={START_HOUR}
          endHour={END_HOUR}
          step={15}
          event={open}
          tracks={
            view === "month"
              ? [
                  {
                    id: open?.track ?? anchor,
                    label: longDay.format(at(open?.track ?? anchor)),
                  },
                ]
              : tracks
          }
          onClose={() => setOpen(null)}
          onSave={(event) => {
            const saved = {
              ...event,
              calendar: (event as CalendarEvent).calendar ?? target.id,
            } as CalendarEvent
            const isNew = !events.some((e) => e.id === saved.id)
            setEvents((all) =>
              isNew ? [...all, saved] : all.map((e) => (e.id === saved.id ? saved : e)),
            )
            // A saved event shows, even when its calendar was hidden.
            if (!shown.includes(saved.calendar))
              setShown((all) => [...all, saved.calendar])
            onSave?.(saved)
            toast(isNew ? `Added “${saved.title}”` : `Saved “${saved.title}”`)
          }}
          onDelete={(event) => {
            const gone = events.find((e) => e.id === event.id) ?? (event as CalendarEvent)
            setEvents((all) => all.filter((e) => e.id !== event.id))
            onDelete?.(gone)
            toast(`Deleted “${gone.title}”`, {
              action: { label: "Undo", onAction: () => restore(gone) },
            })
          }}
        />
      </AppShell>
    </div>
  )
}

export { CalendarAppTemplate, sampleEvents }
export type { CalendarEvent, CalendarInfo }
