import type { JSX } from "@solidjs/web"
import { pageLocale, stackSpans, type Span } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import { createMemo, createSignal, createUniqueId, flush, For, omit, onSettled, Show, untrack } from "solid-js"
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
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./dialog"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { ScrollBox } from "./scroll-area"
import { SegmentedControl, SegmentedControlItem } from "./segmented-control"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { Icon } from "./shell/icons"
import {
  clock,
  createScheduleController,
  isNarrowScreen,
  schedulePrimitive,
  type ScheduleChange,
  type ScheduleController,
  type ScheduleEvent,
} from "../../registry/uiset/ui/scheduler/schedule"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/chart/tokens.css"
import "../../registry/uiset/ui/scheduler/scheduler.css"

// The scheduler in Solid, as React's: drawing, moving, resizing, keys, overlaps and agents are
// the shared primitive (scheduler/schedule.ts). This file holds the week or timeline, the
// month, the toolbar and the event dialog.

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
  renderEvent?: (event: ScheduleEvent) => JSX.Element
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
  class?: string
}

/** spanStyle gives CSS text; Solid takes it as an object of the same property names. */
function styleOf(css: string) {
  const style: Record<string, string> = {}
  for (const rule of css.split(";")) {
    const at = rule.indexOf(":")
    if (at < 0) continue
    style[rule.slice(0, at).trim()] = rule.slice(at + 1).trim()
  }
  return style
}

const series = (color?: number) => `var(--chart-${Math.min(8, Math.max(1, Math.round(color ?? 1)))})`

/** Minutes past midnight of `date` on the wall clock in `timeZone` (the viewer's by default). */
function wallMinutes(date: Date, timeZone?: string) {
  if (!timeZone) return date.getHours() * 60 + date.getMinutes()
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone }).formatToParts(date)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return part("hour") * 60 + part("minute")
}

function TrackPart(props: { value: string } & PartProps<"div">) {
  return usePart(schedulePrimitive, "track", () => ({ value: props.value }), omit(props, "value") as PartProps<"div">, "div")
}

function EventPart(props: { value: string } & PartProps<"button">) {
  return usePart(schedulePrimitive, "event", () => ({ value: props.value }), omit(props, "value") as PartProps<"button">, "button")
}

/**
 * A week, a day or a timeline of events. Drag an empty stretch to draw one, or click
 * for an hour; drag an event to move it, its edge to resize it. Each event is a button:
 * arrows move it, Shift with arrows changes its end, Delete removes it, Enter opens it.
 */
function Schedule(props: ScheduleProps) {
  const helpId = createUniqueId()
  const axis = () => props.axis ?? "y"
  const startHour = () => props.startHour ?? 8
  const endHour = () => props.endHour ?? 20
  const step = () => props.step ?? 15
  const timeLabel = (minutes: number) => (props.timeLabel ?? clock)(minutes)
  const labels = createMemo(() => new Map(props.tracks.map((t) => [t.id, t.label])))
  const trackIds = createMemo(() => props.tracks.map((t) => t.id))
  const handle = usePrimitive(schedulePrimitive, () => ({
    events: props.events,
    defaultEvents: props.defaultEvents,
    onEventsChange: props.onEventsChange,
    tracks: trackIds(),
    trackLabel: (id: string) => labels().get(id) ?? id,
    axis: axis(),
    min: startHour() * 60,
    max: endHour() * 60,
    step: step(),
    size: props.size ?? 60,
    minSize: step(),
    overlap: props.overlap ?? true,
    locked: props.locked,
    onCreate: props.onCreate,
    timeLabel,
    controller: props.controller,
    onOpen: props.onEventOpen
      ? (id: string) => {
          const event = handle.state.events.find((e) => e.id === id)
          if (event) props.onEventOpen?.(event)
        }
      : undefined,
  }))
  const hours = createMemo(() => Array.from({ length: endHour() - startHour() + 1 }, (_, i) => startHour() + i))
  const nowAt = createMemo(() => {
    if (!props.now) return null
    const minutes = wallMinutes(props.now, props.timeZone)
    const min = startHour() * 60
    const max = endHour() * 60
    return minutes >= min && minutes <= max ? (minutes - min) / (max - min) : null
  })
  const hourName = (h: number) => timeLabel(h * 60).replace(":00", "")
  // Named from the tracks shown now, so a new week's names are never a step behind.
  const nameOf = (event: ScheduleEvent) =>
    `${event.title}, ${labels().get(event.track) ?? event.track}, ${timeLabel(event.start)} to ${timeLabel(event.end)}${
      event.location ? `, ${event.location}` : ""
    }`

  return usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.label
      },
      "aria-describedby": helpId,
      get class() {
        return ["schedule", props.class].filter(Boolean).join(" ")
      },
      get "data-axis"() {
        return axis()
      },
      get style() {
        return { "--schedule-tracks": String(props.tracks.length), "--schedule-hours": String(endHour() - startHour()) }
      },
      children: (state: { events: ScheduleEvent[] }) => {
        const byTrack = createMemo(() => {
          const map = new Map<string, ScheduleEvent[]>()
          for (const event of state.events) {
            const list = map.get(event.track)
            if (list) list.push(event)
            else map.set(event.track, [event])
          }
          return map
        })
        return (
          <>
            <p id={helpId} hidden>
              Each event is a button. Arrow keys move it, Shift with arrows changes when it ends, Delete removes it, and Enter opens it.
            </p>
            <ScrollBox axis="both" data-frame="none" class="schedule-frame" viewport={{ class: "schedule-scroller", role: "group", "aria-label": "Hours" }}>
              <div class="schedule-grid">
                <div class="schedule-head" aria-hidden="true">
                  <span class="schedule-corner" />
                  <Show
                    when={axis() === "y"}
                    fallback={<For each={hours().slice(0, -1)}>{(h) => <span class="schedule-hour-name">{hourName(h)}</span>}</For>}
                  >
                    <For each={props.tracks} keyed={(t) => t.id}>
                      {(t) => (
                        <span class="schedule-track-name" data-today={t().id === props.today ? "" : undefined}>
                          {t().short ?? t().label}
                        </span>
                      )}
                    </For>
                  </Show>
                </div>
                <div class="schedule-body">
                  <div class="schedule-gutter" aria-hidden="true">
                    <Show
                      when={axis() === "y"}
                      fallback={
                        <For each={props.tracks} keyed={(t) => t.id}>
                          {(t) => <span class="schedule-track-name">{t().short ?? t().label}</span>}
                        </For>
                      }
                    >
                      <For each={hours().slice(0, -1)}>{(h) => <span class="schedule-hour-name">{hourName(h)}</span>}</For>
                    </Show>
                  </div>
                  <div class="schedule-tracks">
                    <For each={props.tracks} keyed={(t) => t.id}>
                      {(track) => {
                        const own = createMemo(() => [...(byTrack().get(track().id) ?? [])].sort((a, b) => a.start - b.start))
                        const lanes = createMemo(() => stackSpans(own()))
                        return (
                          <TrackPart value={track().id} class="schedule-track" aria-label={track().label} data-today={track().id === props.today ? "" : undefined}>
                            <Show when={track().id === props.today && nowAt() !== null}>
                              <span
                                class="schedule-now"
                                aria-hidden="true"
                                style={axis() === "y" ? { top: `${nowAt()! * 100}%` } : { "inset-inline-start": `${nowAt()! * 100}%` }}
                              />
                            </Show>
                            <For each={own()} keyed={(event) => event.id}>
                              {(event) => (
                                <EventPart
                                  value={event().id}
                                  class="schedule-event"
                                  aria-label={nameOf(event())}
                                  aria-describedby={helpId}
                                  data-locked={props.locked?.(event()) ? "" : undefined}
                                  style={{ ...styleOf(handle.api.spans.spanStyle(event(), lanes().get(event().id))), "--series": series(event().color) }}
                                >
                                  {props.renderEvent ? (
                                    props.renderEvent(event())
                                  ) : (
                                    <>
                                      <span class="schedule-event-title">{event().title}</span>
                                      <span class="schedule-event-time">
                                        {timeLabel(event().start)} – {timeLabel(event().end)}
                                      </span>
                                      <Show when={event().location}>
                                        <span class="schedule-event-place">{event().location}</span>
                                      </Show>
                                    </>
                                  )}
                                  <Show when={!props.locked?.(event())}>
                                    <span class="schedule-event-edge" data-span-edge="end" aria-hidden="true" />
                                  </Show>
                                </EventPart>
                              )}
                            </For>
                          </TrackPart>
                        )
                      }}
                    </For>
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
function MonthView(props: {
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
  // English on the server and in the first draw, so both match; then the page's language.
  const [pageLang, setPageLang] = createSignal("en-US", { ownedWrite: true })
  onSettled(() => {
    setPageLang(pageLocale() ?? "en-US")
  })
  const label = () => props.label ?? "Month"
  const limit = () => props.limit ?? 3
  const timeLabel = (minutes: number) => (props.timeLabel ?? clock)(minutes)
  const fullDate = createMemo(
    () => new Intl.DateTimeFormat(props.locale ?? pageLang(), { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
  )
  const byDay = createMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    for (const e of [...props.events].sort((a, b) => a.start - b.start)) {
      const list = map.get(e.track) ?? []
      list.push(e)
      map.set(e.track, list)
    }
    return map
  })
  const dayName = (iso: string, list: ScheduleEvent[]) => {
    const date = fullDate().format(new Date(`${iso}T00:00:00Z`))
    if (!list.length) return date
    const what = list.map((e) => `${e.title} at ${timeLabel(e.start)}`).join(", ")
    return `${date}, ${list.length} ${list.length === 1 ? "event" : "events"}: ${what}`
  }
  return (
    // Named on its root too, as a group: the agent bridge names a calendar there, not by its
    // grid, and a name on a plain div isn't allowed.
    <Calendar
      class="schedule-month"
      role="group"
      aria-label={label()}
      month={props.month}
      onMonthChange={(m: string) => {
        props.onMonthChange?.(m)
      }}
      today={props.today}
      weekStartsOn={props.weekStartsOn}
      locale={props.locale}
      value={null}
      onValueChange={(day: unknown) => {
        if (day) props.onDayChoose?.(String(day))
      }}
    >
      <CalendarGrid aria-label={label()}>
        <CalendarWeekdays>{(index: number) => <CalendarWeekday index={index} />}</CalendarWeekdays>
        <CalendarWeeks>
          {(cell: { date: string }) => (
            // The day's name carries its events: an aria-label replaces what's inside, so
            // the chips alone would be silent to screen readers.
            <CalendarDay value={cell.date} aria-label={dayName(cell.date, byDay().get(cell.date) ?? [])}>
              <span class="schedule-month-day">
                <span class="schedule-month-number">{Number(cell.date.slice(8))}</span>
                <For each={(byDay().get(cell.date) ?? []).slice(0, limit())} keyed={(e) => e.id}>
                  {(e) => (
                    <span class="schedule-month-chip" style={{ "--series": series(e().color) }}>
                      {timeLabel(e().start).replace(":00", "")} {e().title}
                    </span>
                  )}
                </For>
                <Show when={(byDay().get(cell.date)?.length ?? 0) > limit()}>
                  <span class="schedule-month-more">{(byDay().get(cell.date)?.length ?? 0) - limit()} more</span>
                </Show>
              </span>
            </CalendarDay>
          )}
        </CalendarWeeks>
      </CalendarGrid>
    </Calendar>
  )
}

type SchedulerView = "day" | "week" | "month" | "timeline"

const viewNames: Record<SchedulerView, string> = { day: "Day", week: "Week", month: "Month", timeline: "Timeline" }

/** Today, previous and next, the range shown, the view, and New event. */
function SchedulerToolbar(props: {
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
  return (
    <div class="scheduler-toolbar" role="group" aria-label="Schedule tools">
      <div class="scheduler-nav">
        {/* Not just "Today": events read "Today at 12:30 PM" too, and an agent's step by a name
            that other names hold as a word is refused as ambiguous. */}
        <Button variant="outline" onClick={() => props.onToday()} aria-label="Go to today">
          Today
        </Button>
        <Button variant="ghost" onClick={() => props.onPrevious()} aria-label={`Previous ${props.unit}`}>
          <Icon name="chevron" class="scheduler-prev" />
        </Button>
        <Button variant="ghost" onClick={() => props.onNext()} aria-label={`Next ${props.unit}`}>
          <Icon name="chevron" />
        </Button>
        <h2 class="scheduler-title" aria-live="polite">
          {props.title}
        </h2>
      </div>
      <div class="scheduler-actions">
        <SegmentedControl
          aria-label="Calendar layout"
          value={props.view}
          onValueChange={(v) => {
            if (v) props.onViewChange(v as SchedulerView)
          }}
        >
          <For each={props.views ?? (["day", "week", "month"] as SchedulerView[])}>{(v) => <SegmentedControlItem value={v}>{viewNames[v]}</SegmentedControlItem>}</For>
        </SegmentedControl>
        <Show when={props.onNewEvent}>
          {(onNewEvent) => (
            <Button onClick={() => onNewEvent()()}>
              <Icon name="plus" />
              New event
            </Button>
          )}
        </Show>
      </div>
    </div>
  )
}

const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
const fromTime = (text: string) => {
  const [h, m] = text.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

type EventDraft = Partial<ScheduleEvent> & Pick<ScheduleEvent, "track" | "start" | "end">

type EventDialogProps = {
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
}

/**
 * Create or edit an event: title, day or track, start and end, where. Delete asks first.
 * With the schedule's controller it keeps the schedule's rules (hours, steps, overlaps)
 * and hands focus back to the event, or to its neighbor once it's deleted.
 */
function EventDialog(props: EventDialogProps) {
  // The dialog keeps showing its event while it animates closed.
  const shown = createMemo<EventDraft | null>((last) => props.event ?? last ?? null)
  const isNew = () => !shown()?.id
  const errorId = createUniqueId()
  const [error, setError] = createSignal<{ text: string; field: "start" | "end" } | null>(null)
  let startInput: HTMLInputElement | undefined
  let endInput: HTMLInputElement | undefined
  // The delete alert renders beside the form, not in it: forms don't nest.
  const [content, setContent] = createSignal<HTMLElement | undefined>(undefined, { ownedWrite: true })
  // Where focus goes on close: the saved event, or a deleted one's neighbor.
  let returnTo: { id?: string; neighbor?: string } | null = null
  const finalFocus = () => {
    const target = returnTo
    returnTo = null
    // Cancel and Escape go back where the dialog was opened from.
    if (!target) return undefined
    const { id, neighbor } = target
    return (id && props.schedule?.eventElement(id)) || (neighbor && props.schedule?.eventElement(neighbor)) || props.schedule?.element() || undefined
  }
  const startHour = () => props.startHour ?? 0
  const endHour = () => props.endHour ?? 24
  const step = () => props.step ?? 5
  const timeLabel = (minutes: number) => (props.timeLabel ?? clock)(minutes)
  const min = () => startHour() * 60
  const max = () => Math.min(endHour() * 60, 24 * 60 - 1)
  const close = () => {
    setError(null)
    props.onClose()
  }
  // The form starts over for each event it opens, not for each save of the same one.
  const formKey = createMemo(() => (shown() ? (shown()!.id ?? "new") : null))

  const submit = (e: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    e.preventDefault()
    const draft = shown()
    if (!draft) return
    const data = new FormData(e.currentTarget)
    const start = fromTime(String(data.get("event-start")))
    const end = fromTime(String(data.get("event-end")))
    const next: ScheduleEvent = {
      ...(draft as ScheduleEvent),
      id: draft.id ?? crypto.randomUUID(),
      title: String(data.get("event-title")),
      track: String(data.get("event-track")),
      start,
      end,
      location: String(data.get("event-location") ?? "") || undefined,
    }
    const problem =
      end <= start
        ? { text: "It has to end after it starts.", field: "end" as const }
        : start < min() || end > endHour() * 60
          ? { text: `It has to fit between ${timeLabel(min())} and ${timeLabel(endHour() * 60)}.`, field: "start" as const }
          : props.schedule?.problem(next)
            ? { text: props.schedule.problem(next)!, field: "start" as const }
            : null
    setError(problem)
    if (problem) {
      // The field is named by the error once Solid draws it: focus after that.
      flush()
      ;(problem.field === "end" ? endInput : startInput)?.focus()
      return
    }
    props.onSave(next)
    // The schedule draws the event where it now is before the dialog closes, so focus can go
    // back to it there, on another day too.
    flush()
    returnTo = { id: next.id }
    close()
  }

  return (
    <Dialog
      open={props.event !== null}
      onOpenChange={(open: boolean) => {
        if (!open) close()
      }}
    >
      <DialogBackdrop />
      <DialogContent
        ref={(el: HTMLElement) => {
          setContent(el)
        }}
        class="scheduler-dialog"
        finalFocus={finalFocus}
      >
        <Show when={shown()}>
          {(draft) => (
            <>
              <DialogTitle>{isNew() ? "New event" : draft().title}</DialogTitle>
              <DialogDescription>{isNew() ? "Add it to the schedule." : "Change it, or delete it."}</DialogDescription>
              <Show when={formKey()} keyed>
                {(_key: string) => (
                  <form class="scheduler-form" aria-label={isNew() ? "New event" : `Edit ${draft().title}`} onSubmit={submit}>
                    <Field name="event-title">
                      <FieldLabel>Title</FieldLabel>
                      <Input required defaultValue={untrack(() => draft().title)} autocomplete="off" />
                      <FieldError match="valueMissing">Name the event.</FieldError>
                    </Field>
                    <Field name="event-track">
                      <Select name="event-track" defaultValue={untrack(() => draft().track)}>
                        <SelectLabel>{props.trackName ?? "When"}</SelectLabel>
                        <SelectTrigger />
                        <SelectContent>
                          <For each={props.tracks} keyed={(t) => t.id}>
                            {(t) => <SelectItem value={t().id}>{t().label}</SelectItem>}
                          </For>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div class="scheduler-form-row">
                      <Field name="event-start">
                        <FieldLabel>Starts</FieldLabel>
                        <Input
                          ref={(el: HTMLInputElement) => {
                            startInput = el
                          }}
                          type="time"
                          required
                          step={step() * 60}
                          min={toTime(min())}
                          max={toTime(max())}
                          defaultValue={untrack(() => toTime(draft().start))}
                          aria-invalid={error()?.field === "start" ? "true" : undefined}
                          aria-describedby={error()?.field === "start" ? errorId : undefined}
                        />
                        <FieldError match="rangeUnderflow">Starts at {timeLabel(min())} or later.</FieldError>
                        <FieldError match="rangeOverflow">Starts by {timeLabel(max())}.</FieldError>
                        <FieldError match="stepMismatch">Times go in steps of {step()} minutes.</FieldError>
                      </Field>
                      <Field name="event-end">
                        <FieldLabel>Ends</FieldLabel>
                        <Input
                          ref={(el: HTMLInputElement) => {
                            endInput = el
                          }}
                          type="time"
                          required
                          step={step() * 60}
                          min={toTime(min())}
                          max={toTime(max())}
                          defaultValue={untrack(() => toTime(draft().end))}
                          aria-invalid={error()?.field === "end" ? "true" : undefined}
                          aria-describedby={error()?.field === "end" ? errorId : undefined}
                        />
                        <FieldError match="rangeUnderflow">Ends at {timeLabel(min())} or later.</FieldError>
                        <FieldError match="rangeOverflow">Ends by {timeLabel(max())}.</FieldError>
                        <FieldError match="stepMismatch">Times go in steps of {step()} minutes.</FieldError>
                      </Field>
                    </div>
                    <p id={errorId} class="scheduler-form-error" role="alert">
                      {error()?.text}
                    </p>
                    <Field name="event-location">
                      <FieldLabel>Where</FieldLabel>
                      <Input defaultValue={untrack(() => draft().location)} autocomplete="off" />
                    </Field>
                    <div class="scheduler-form-actions">
                      <Show when={!isNew() && props.onDelete}>
                        <AlertDialog container={content()}>
                          <AlertDialogTrigger data-variant="ghost">
                            <Icon name="trash" />
                            Delete event
                          </AlertDialogTrigger>
                          <AlertDialogBackdrop />
                          <AlertDialogContent>
                            <AlertDialogTitle>Delete “{draft().title}”?</AlertDialogTitle>
                            <AlertDialogDescription>It comes off everyone’s schedule.</AlertDialogDescription>
                            <div class="scheduler-form-actions">
                              <AlertDialogClose>Keep the event</AlertDialogClose>
                              <AlertDialogClose
                                data-variant="destructive"
                                data-agent-confirm={`Deletes the event “${draft().title}”`}
                                onClick={() => {
                                  const gone = draft() as ScheduleEvent
                                  returnTo = { neighbor: props.schedule?.neighbor(gone.id) ?? undefined }
                                  props.onDelete?.(gone)
                                  close()
                                }}
                              >
                                Delete for good
                              </AlertDialogClose>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </Show>
                      <span class="scheduler-spacer" />
                      <DialogClose>Cancel</DialogClose>
                      <Button type="submit">{isNew() ? "Add event" : "Save event"}</Button>
                    </div>
                  </form>
                )}
              </Show>
            </>
          )}
        </Show>
      </DialogContent>
    </Dialog>
  )
}

export { EventDialog, MonthView, Schedule, SchedulerToolbar, clock, createScheduleController, isNarrowScreen }
export type { EventDraft, ScheduleChange, ScheduleController, ScheduleEvent, ScheduleProps, ScheduleTrack, SchedulerView }
