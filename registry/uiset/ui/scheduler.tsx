"use client"

import { pageLocale, stackSpans, type Span } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog"
import { Button } from "./button"
import { Calendar, CalendarDay, CalendarGrid, CalendarWeekday, CalendarWeekdays, CalendarWeeks } from "./calendar"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { ScrollBox } from "./scroll-area"
import { SegmentedControl, SegmentedControlItem } from "./segmented-control"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { Icon } from "./shell/icons"
import {
  clock,
  createScheduleController,
  schedulePrimitive,
  type ScheduleChange,
  type ScheduleController,
  type ScheduleEvent,
} from "./scheduler/schedule"
import "./shell/shell.css"
import "./chart/tokens.css"
import "./scheduler/scheduler.css"

type ScheduleTrack = { id: string; label: string; short?: string }

type ScheduleProps = {
  /** The schedule's name, for people and agents. */
  label: string
  tracks: ScheduleTrack[]
  /** Minutes from midnight are wall-clock time in `timeZone`. */
  events?: ScheduleEvent[]
  defaultEvents?: ScheduleEvent[]
  onEventsChange?: (events: ScheduleEvent[], details: ScheduleChange) => void
  /** "y": a week or a day, time running down. "x": a timeline, rooms down and time across. */
  axis?: "y" | "x"
  startHour?: number
  endHour?: number
  /** Minutes events snap to. */
  step?: number
  /** How long an event a click on an empty stretch makes, in minutes. */
  size?: number
  overlap?: boolean
  locked?: (event: ScheduleEvent) => boolean
  /** Enter, Space or a click on an event. Without it, events don't open. */
  onEventOpen?: (event: ScheduleEvent) => void
  onCreate?: (span: Span) => ScheduleEvent | null
  /** An event's face. Defaults to its title, times and place. */
  renderEvent?: (event: ScheduleEvent) => ReactNode
  /** How times read. Defaults to 12-hour English, like "9:30 AM". */
  timeLabel?: (minutes: number) => string
  /** Lets an event dialog, or other code, check times and return focus: `createScheduleController()`. */
  controller?: ScheduleController
  /** Now, for the current-time line on today's track. Pass the real clock in an app. */
  now?: Date
  /** The zone events' times are in, and `now` is read in. Defaults to the viewer's. */
  timeZone?: string
  /** The track that is today, like "2026-11-16". */
  today?: string
  className?: string
}

/** spanStyle gives CSS text; React wants an object. */
function styleOf(css: string): CSSProperties {
  const style: Record<string, string> = {}
  for (const rule of css.split(";")) {
    const at = rule.indexOf(":")
    if (at < 0) continue
    const key = rule.slice(0, at).trim()
    style[key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = rule
      .slice(at + 1)
      .trim()
  }
  return style as CSSProperties
}

const series = (color?: number) => `var(--chart-${Math.min(8, Math.max(1, Math.round(color ?? 1)))})`

/** Minutes past midnight of `date` on the wall clock in `timeZone` (the viewer's by default). */
function wallMinutes(date: Date, timeZone?: string) {
  if (!timeZone) return date.getHours() * 60 + date.getMinutes()
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone }).formatToParts(date)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return part("hour") * 60 + part("minute")
}

function TrackPart({ value, ...props }: { value: string } & PartProps<"div">) {
  return usePart(schedulePrimitive, "track", { value }, props, "div")
}

function EventPart({ value, ...props }: { value: string } & PartProps<"button">) {
  return usePart(schedulePrimitive, "event", { value }, props, "button")
}

/**
 * A week, a day or a timeline of events. Drag an empty stretch to draw one, or click
 * for an hour; drag an event to move it, its edge to resize it. Each event is a button:
 * arrows move it, Shift with arrows changes its end, Delete removes it, Enter opens it.
 */
function Schedule({
  label,
  tracks,
  events,
  defaultEvents,
  onEventsChange,
  axis = "y",
  startHour = 8,
  endHour = 20,
  step = 15,
  size = 60,
  overlap = true,
  locked,
  onEventOpen,
  onCreate,
  renderEvent,
  timeLabel = clock,
  controller,
  now,
  timeZone,
  today,
  className,
}: ScheduleProps) {
  const helpId = useId()
  const min = startHour * 60
  const max = endHour * 60
  const labels = new Map(tracks.map((t) => [t.id, t.label]))
  const handle = usePrimitive(schedulePrimitive, {
    events,
    defaultEvents,
    onEventsChange,
    tracks: tracks.map((t) => t.id),
    trackLabel: (id) => labels.get(id) ?? id,
    axis,
    min,
    max,
    step,
    size,
    minSize: step,
    overlap,
    locked,
    onCreate,
    timeLabel,
    controller,
    onOpen: onEventOpen
      ? (id) => {
          const event = handle.state.events.find((e) => e.id === id)
          if (event) onEventOpen(event)
        }
      : undefined,
  })
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const nowMinutes = now ? wallMinutes(now, timeZone) : null
  const nowAt = nowMinutes !== null && nowMinutes >= min && nowMinutes <= max ? (nowMinutes - min) / (max - min) : null
  const hourName = (h: number) => timeLabel(h * 60).replace(":00", "")
  // Named from this render's tracks, so a new week's names are never a render behind.
  const nameOf = (event: ScheduleEvent) =>
    `${event.title}, ${labels.get(event.track) ?? event.track}, ${timeLabel(event.start)} to ${timeLabel(event.end)}${
      event.location ? `, ${event.location}` : ""
    }`

  return usePart(
    handle,
    "root",
    {},
    {
      "aria-label": label,
      "aria-describedby": helpId,
      className: ["schedule", className].filter(Boolean).join(" "),
      "data-axis": axis,
      style: { "--schedule-tracks": tracks.length, "--schedule-hours": endHour - startHour } as CSSProperties,
      children: ({ events: drawn }: { events: ScheduleEvent[] }) => {
        const byTrack = new Map<string, ScheduleEvent[]>()
        for (const event of drawn) {
          const list = byTrack.get(event.track)
          if (list) list.push(event)
          else byTrack.set(event.track, [event])
        }
        return (
          <>
            <p id={helpId} hidden>
              Each event is a button. Arrow keys move it, Shift with arrows changes when it
              ends, Delete removes it, and Enter opens it.
            </p>
            <ScrollBox
              axis="both"
              data-frame="none"
              className="schedule-frame"
              viewport={{ className: "schedule-scroller", role: "group", "aria-label": "Hours" }}
            >
              <div className="schedule-grid">
                <div className="schedule-head" aria-hidden="true">
                  <span className="schedule-corner" />
                  {axis === "y"
                    ? tracks.map((t) => (
                        <span key={t.id} className="schedule-track-name" data-today={t.id === today ? "" : undefined}>
                          {t.short ?? t.label}
                        </span>
                      ))
                    : hours.slice(0, -1).map((h) => (
                        <span key={h} className="schedule-hour-name">
                          {hourName(h)}
                        </span>
                      ))}
                </div>
                <div className="schedule-body">
                  <div className="schedule-gutter" aria-hidden="true">
                    {axis === "y"
                      ? hours.slice(0, -1).map((h) => (
                          <span key={h} className="schedule-hour-name">
                            {hourName(h)}
                          </span>
                        ))
                      : tracks.map((t) => (
                          <span key={t.id} className="schedule-track-name">
                            {t.short ?? t.label}
                          </span>
                        ))}
                  </div>
                  <div className="schedule-tracks">
                    {tracks.map((track) => {
                      const own = (byTrack.get(track.id) ?? []).sort((a, b) => a.start - b.start)
                      const lanes = stackSpans(own)
                      return (
                        <TrackPart
                          key={track.id}
                          value={track.id}
                          className="schedule-track"
                          aria-label={track.label}
                          data-today={track.id === today ? "" : undefined}
                        >
                          {track.id === today && nowAt !== null && (
                            <span
                              className="schedule-now"
                              aria-hidden="true"
                              style={axis === "y" ? { top: `${nowAt * 100}%` } : { insetInlineStart: `${nowAt * 100}%` }}
                            />
                          )}
                          {own.map((event) => (
                            <EventPart
                              key={event.id}
                              value={event.id}
                              className="schedule-event"
                              aria-label={nameOf(event)}
                              aria-describedby={helpId}
                              data-locked={locked?.(event) ? "" : undefined}
                              style={
                                {
                                  ...styleOf(handle.api.spans.spanStyle(event, lanes.get(event.id))),
                                  "--series": series(event.color),
                                } as CSSProperties
                              }
                            >
                              {renderEvent ? (
                                renderEvent(event)
                              ) : (
                                <>
                                  <span className="schedule-event-title">{event.title}</span>
                                  <span className="schedule-event-time">
                                    {timeLabel(event.start)} – {timeLabel(event.end)}
                                  </span>
                                  {event.location && <span className="schedule-event-place">{event.location}</span>}
                                </>
                              )}
                              {!locked?.(event) && (
                                <span className="schedule-event-edge" data-span-edge="end" aria-hidden="true" />
                              )}
                            </EventPart>
                          ))}
                        </TrackPart>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollBox>
          </>
        )
      },
    } as never,
    "div",
  )
}

/** A month at a glance: each day lists its first events; choosing a day opens it. */
function MonthView({
  month,
  events,
  today,
  onDayChoose,
  onMonthChange,
  label = "Month",
  limit = 3,
  weekStartsOn,
  locale,
  timeLabel = clock,
}: {
  /** "2026-11" */
  month: string
  events: ScheduleEvent[]
  today?: string
  onDayChoose?: (day: string) => void
  onMonthChange?: (month: string) => void
  label?: string
  /** Events shown per day before "N more". */
  limit?: number
  /** 0 for Sunday, 1 for Monday. Defaults to the locale's; match your week view. */
  weekStartsOn?: number
  /** The language of day names. Defaults to the page's, read after mounting, as Calendar does. */
  locale?: string
  timeLabel?: (minutes: number) => string
}) {
  // English on the server and the first render, so both match; then the page's language.
  const [pageLang, setPageLang] = useState("en-US")
  useEffect(() => setPageLang(pageLocale() ?? "en-US"), [])
  const lang = locale ?? pageLang
  const fullDate = useMemo(
    () => new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
    [lang],
  )
  const dayName = (iso: string, list: ScheduleEvent[]) => {
    const date = fullDate.format(new Date(`${iso}T00:00:00Z`))
    if (!list.length) return date
    const what = list.map((e) => `${e.title} at ${timeLabel(e.start)}`).join(", ")
    return `${date}, ${list.length} ${list.length === 1 ? "event" : "events"}: ${what}`
  }
  const byDay = new Map<string, ScheduleEvent[]>()
  for (const e of [...events].sort((a, b) => a.start - b.start)) {
    const list = byDay.get(e.track) ?? []
    list.push(e)
    byDay.set(e.track, list)
  }
  return (
    <Calendar
      className="schedule-month"
      month={month}
      onMonthChange={(m) => onMonthChange?.(m)}
      today={today}
      weekStartsOn={weekStartsOn}
      locale={locale}
      value={null}
      onValueChange={(day) => day && onDayChoose?.(String(day))}
    >
      <CalendarGrid aria-label={label}>
        <CalendarWeekdays>{(index) => <CalendarWeekday index={index} />}</CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => (
            // The day's name carries its events: an aria-label replaces what's inside, so
            // the chips alone would be silent to screen readers.
            <CalendarDay value={cell.date} aria-label={dayName(cell.date, byDay.get(cell.date) ?? [])}>
              {() => {
                const list = byDay.get(cell.date) ?? []
                return (
                  <span className="schedule-month-day">
                    <span className="schedule-month-number">{Number(cell.date.slice(8))}</span>
                    {list.slice(0, limit).map((e) => (
                      <span key={e.id} className="schedule-month-chip" style={{ "--series": series(e.color) } as CSSProperties}>
                        {timeLabel(e.start).replace(":00", "")} {e.title}
                      </span>
                    ))}
                    {list.length > limit && <span className="schedule-month-more">{list.length - limit} more</span>}
                  </span>
                )
              }}
            </CalendarDay>
          )}
        </CalendarWeeks>
      </CalendarGrid>
    </Calendar>
  )
}

type SchedulerView = "day" | "week" | "month" | "timeline"

/** Today, previous and next, the range shown, the view, and New event. */
function SchedulerToolbar({
  title,
  view,
  views = ["day", "week", "month"],
  onViewChange,
  onToday,
  onPrevious,
  onNext,
  onNewEvent,
  unit,
}: {
  title: string
  view: SchedulerView
  views?: SchedulerView[]
  onViewChange: (view: SchedulerView) => void
  onToday: () => void
  onPrevious: () => void
  onNext: () => void
  onNewEvent?: () => void
  /** Names the arrows: "week" gives "Previous week" and "Next week". */
  unit: string
}) {
  const names: Record<SchedulerView, string> = { day: "Day", week: "Week", month: "Month", timeline: "Timeline" }
  return (
    <div className="scheduler-toolbar" role="group" aria-label="Schedule tools">
      <div className="scheduler-nav">
        <Button variant="outline" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" onClick={onPrevious} aria-label={`Previous ${unit}`}>
          <Icon name="chevron" className="scheduler-prev" />
        </Button>
        <Button variant="ghost" onClick={onNext} aria-label={`Next ${unit}`}>
          <Icon name="chevron" />
        </Button>
        <h2 className="scheduler-title" aria-live="polite">
          {title}
        </h2>
      </div>
      <div className="scheduler-actions">
        <SegmentedControl aria-label="Calendar layout" value={view} onValueChange={(v) => v && onViewChange(v as SchedulerView)}>
          {views.map((v) => (
            <SegmentedControlItem key={v} value={v}>
              {names[v]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        {onNewEvent && (
          <Button onClick={onNewEvent}>
            <Icon name="plus" />
            New event
          </Button>
        )}
      </div>
    </div>
  )
}

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
const fromTime = (text: string) => {
  const [h, m] = text.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

type EventDraft = Partial<ScheduleEvent> & Pick<ScheduleEvent, "track" | "start" | "end">

/**
 * Create or edit an event: title, day or track, start and end, where. Delete asks first.
 * With the schedule's controller it keeps the schedule's rules (hours, steps, overlaps)
 * and hands focus back to the event, or to its neighbor once it's deleted.
 */
function EventDialog({
  event,
  tracks,
  schedule,
  startHour = 0,
  endHour = 24,
  step = 5,
  timeLabel = clock,
  trackName = "When",
  onSave,
  onDelete,
  onClose,
}: {
  /** The event to edit, a draft for a new one (no id yet means "new"), or null when closed. */
  event: EventDraft | null
  tracks: ScheduleTrack[]
  /** The schedule's controller, from `createScheduleController()`, also passed to the Schedule. */
  schedule?: ScheduleController
  /** The hours an event has to fit in; match the Schedule's. */
  startHour?: number
  endHour?: number
  /** Minutes the times go in. */
  step?: number
  timeLabel?: (minutes: number) => string
  /** What the track picker is called: "When" for days, "Room" for rooms. */
  trackName?: string
  onSave: (event: ScheduleEvent) => void
  onDelete?: (event: ScheduleEvent) => void
  onClose: () => void
}) {
  // The dialog keeps showing its event while it animates closed.
  const [last, setLast] = useState(event)
  if (event && event !== last) setLast(event)
  const shown = event ?? last
  const isNew = !shown?.id
  const errorId = useId()
  const [error, setError] = useState<{ text: string; field: "start" | "end" } | null>(null)
  const startInput = useRef<HTMLInputElement>(null)
  const endInput = useRef<HTMLInputElement>(null)
  // Where focus goes on close: the saved event, or a deleted one's neighbor.
  const returnTo = useRef<{ id?: string; neighbor?: string } | null>(null)
  const finalFocus = () => {
    const target = returnTo.current
    returnTo.current = null
    // Cancel and Escape go back where the dialog was opened from.
    if (!target) return undefined
    const { id, neighbor } = target
    return (
      (id && schedule?.eventElement(id)) || (neighbor && schedule?.eventElement(neighbor)) || schedule?.element() || undefined
    )
  }
  const min = startHour * 60
  const max = Math.min(endHour * 60, 24 * 60 - 1)
  const close = () => {
    setError(null)
    onClose()
  }

  return (
    <Dialog open={event !== null} onOpenChange={(open: boolean) => !open && close()}>
      <DialogBackdrop />
      <DialogContent className="scheduler-dialog" finalFocus={finalFocus}>
        {shown && (
          <>
            <DialogTitle>{isNew ? "New event" : shown.title}</DialogTitle>
            <DialogDescription>{isNew ? "Add it to the schedule." : "Change it, or delete it."}</DialogDescription>
            <form
              key={shown.id ?? "new"}
              className="scheduler-form"
              aria-label={isNew ? "New event" : `Edit ${shown.title}`}
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                const start = fromTime(String(data.get("event-start")))
                const end = fromTime(String(data.get("event-end")))
                const next: ScheduleEvent = {
                  ...(shown as ScheduleEvent),
                  id: shown.id ?? crypto.randomUUID(),
                  title: String(data.get("event-title")),
                  track: String(data.get("event-track")),
                  start,
                  end,
                  location: String(data.get("event-location") ?? "") || undefined,
                }
                const problem =
                  end <= start
                    ? { text: "It has to end after it starts.", field: "end" as const }
                    : start < min || end > endHour * 60
                      ? { text: `It has to fit between ${timeLabel(min)} and ${timeLabel(endHour * 60)}.`, field: "start" as const }
                      : schedule?.problem(next)
                        ? { text: schedule.problem(next)!, field: "start" as const }
                        : null
                setError(problem)
                if (problem) {
                  ;(problem.field === "end" ? endInput : startInput).current?.focus()
                  return
                }
                onSave(next)
                returnTo.current = { id: next.id }
                close()
              }}
            >
              <Field name="event-title">
                <FieldLabel>Title</FieldLabel>
                <Input required defaultValue={shown.title} autoComplete="off" />
                <FieldError match="valueMissing">Name the event.</FieldError>
              </Field>
              <Field name="event-track">
                <Select name="event-track" defaultValue={shown.track}>
                  <SelectLabel>{trackName}</SelectLabel>
                  <SelectTrigger />
                  <SelectContent>
                    {tracks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="scheduler-form-row">
                <Field name="event-start">
                  <FieldLabel>Starts</FieldLabel>
                  <Input
                    ref={startInput}
                    type="time"
                    required
                    step={step * 60}
                    min={toTime(min)}
                    max={toTime(max)}
                    defaultValue={toTime(shown.start)}
                    aria-invalid={error?.field === "start" ? true : undefined}
                    aria-describedby={error?.field === "start" ? errorId : undefined}
                  />
                  <FieldError match="rangeUnderflow">Starts at {timeLabel(min)} or later.</FieldError>
                  <FieldError match="rangeOverflow">Starts by {timeLabel(max)}.</FieldError>
                  <FieldError match="stepMismatch">Times go in steps of {step} minutes.</FieldError>
                </Field>
                <Field name="event-end">
                  <FieldLabel>Ends</FieldLabel>
                  <Input
                    ref={endInput}
                    type="time"
                    required
                    step={step * 60}
                    min={toTime(min)}
                    max={toTime(max)}
                    defaultValue={toTime(shown.end)}
                    aria-invalid={error?.field === "end" ? true : undefined}
                    aria-describedby={error?.field === "end" ? errorId : undefined}
                  />
                  <FieldError match="rangeUnderflow">Ends at {timeLabel(min)} or later.</FieldError>
                  <FieldError match="rangeOverflow">Ends by {timeLabel(max)}.</FieldError>
                  <FieldError match="stepMismatch">Times go in steps of {step} minutes.</FieldError>
                </Field>
              </div>
              <p id={errorId} className="scheduler-form-error" role="alert">
                {error?.text}
              </p>
              <Field name="event-location">
                <FieldLabel>Where</FieldLabel>
                <Input defaultValue={shown.location} autoComplete="off" />
              </Field>
              <div className="scheduler-form-actions">
                {!isNew && onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger data-variant="ghost">
                      <Icon name="trash" />
                      Delete event
                    </AlertDialogTrigger>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                      <AlertDialogTitle>Delete “{shown.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>It comes off everyone’s schedule.</AlertDialogDescription>
                      <div className="scheduler-form-actions">
                        <AlertDialogClose>Keep the event</AlertDialogClose>
                        <AlertDialogClose
                          data-variant="destructive"
                          data-agent-confirm={`Deletes the event “${shown.title}”`}
                          onClick={() => {
                            returnTo.current = { neighbor: schedule?.neighbor(shown.id!) ?? undefined }
                            onDelete(shown as ScheduleEvent)
                            close()
                          }}
                        >
                          Delete for good
                        </AlertDialogClose>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <span className="scheduler-spacer" />
                <DialogClose>Cancel</DialogClose>
                <Button type="submit">{isNew ? "Add event" : "Save event"}</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { EventDialog, MonthView, Schedule, SchedulerToolbar, clock, createScheduleController }
export type { EventDraft, ScheduleChange, ScheduleController, ScheduleEvent, ScheduleProps, ScheduleTrack, SchedulerView }
