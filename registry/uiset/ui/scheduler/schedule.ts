import {
  createChange,
  createController,
  createSpans,
  definePrimitive,
  isSpanFree,
  keepFocus,
  live,
  type ChangeDetails,
  type Span,
  type SpanAction,
  type SpansDraft,
  type SpansReason,
} from "@ui-sdk/core"

// A schedule's behavior: tracks (days down a week, or rooms across a timeline) holding
// events. UI SDK's createSpans draws, moves and resizes them with the pointer, moves them
// with arrows (Shift for the end), deletes with Delete, snaps to a step, keeps sizes in
// bounds, refuses overlaps when asked and announces every change. Each event is a
// button: a tab stop that Enter, Space or a click opens.

type ScheduleEvent = Span & {
  title: string
  /** A chart slot, 1 to 8, for its color. */
  color?: number
  location?: string
}

type ScheduleChange = ChangeDetails<SpansReason> & { id: string; action: SpanAction }

/** What code outside the schedule can do: an event dialog checking times and returning focus. */
type ScheduleControllerApi = {
  /** Why an event can't go where it says, or undefined if it fits: hours, length, step, overlaps. */
  problem(event: ScheduleEvent): string | undefined
  /** The event's element, if it's shown. */
  eventElement(id: string): HTMLElement | undefined
  /** Where focus should go when an event leaves: the next on its track, else the one before, else the nearest track's. */
  neighbor(id: string): string | undefined
  /** Somewhere to put focus: the first event, else the schedule itself. */
  element(): HTMLElement | undefined
}

/** Connects an event dialog, or any code, to a schedule. Create it once and pass it to both. */
const createScheduleController = () => createController<ScheduleControllerApi>()
type ScheduleController = ReturnType<typeof createScheduleController>

type ScheduleOptions = {
  events?: ScheduleEvent[]
  defaultEvents?: ScheduleEvent[]
  onEventsChange?: (events: ScheduleEvent[], details: ScheduleChange) => void
  /** Track ids in order: ISO dates for days, or resource ids for a timeline. */
  tracks: string[]
  trackLabel?: (track: string) => string
  /** "y": time runs down (a week); "x": time runs across (a timeline of rooms). */
  axis?: "x" | "y"
  /** Minutes from midnight, wall-clock time in the zone the schedule shows. */
  min?: number
  max?: number
  step?: number
  minSize?: number
  maxSize?: number
  /** What a click on an empty stretch creates, in minutes. */
  size?: number
  overlap?: boolean
  locked?: (event: ScheduleEvent) => boolean
  /** Makes the event a draw or click creates; return null to refuse. */
  onCreate?: (span: Span) => ScheduleEvent | null
  /** Enter, a click, or an agent opens an event. Without it, events don't open. */
  onOpen?: (id: string) => void
  /** How times read, like "9:30 AM". */
  timeLabel?: (minutes: number) => string
  controller?: ScheduleController
}

/** 12-hour English times, like "9:30 AM". Pass `timeLabel` for other clocks and languages. */
const clock = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const schedulePrimitive = definePrimitive({
  name: "schedule",
  options: {
    events: "value",
    defaultEvents: "value",
    onEventsChange: "callback",
    tracks: "value",
    trackLabel: "value",
    axis: "string",
    min: "number",
    max: "number",
    step: "number",
    minSize: "number",
    maxSize: "number",
    size: "number",
    overlap: "boolean",
    locked: "value",
    onCreate: "action",
    onOpen: "callback",
    timeLabel: "value",
    controller: "value",
  },
  controlled: ["events"],
  live: ["draft"],
  state: (options: ScheduleOptions) => ({
    events: options.events ?? options.defaultEvents ?? ([] as ScheduleEvent[]),
    draft: null as SpansDraft<ScheduleEvent> | null,
  }),
  sync: (options) => (options.events === undefined ? {} : { events: options.events }),
  api: (context) => {
    const opts = () => context.options()
    const change = createChange(context)
    const time = (minutes: number) => (opts().timeLabel ?? clock)(minutes)
    const trackName = (track: string) => opts().trackLabel?.(track) ?? track
    const describe = (event: ScheduleEvent) =>
      `${event.title}, ${trackName(event.track)}, ${time(event.start)} to ${time(event.end)}${
        event.location ? `, ${event.location}` : ""
      }`
    const min = () => opts().min ?? 8 * 60
    const max = () => opts().max ?? 20 * 60
    const step = () => opts().step ?? 15
    const minSize = () => opts().minSize ?? step()
    const maxSize = () => opts().maxSize ?? 24 * 60
    const isLocked = (event: ScheduleEvent) => opts().locked?.(event) ?? false

    const spans = createSpans<{ events: ScheduleEvent[]; draft: SpansDraft<ScheduleEvent> | null }, ScheduleEvent>(
      context,
      {
        key: "events",
        draft: "draft",
        set: (value, details) => change("events", value, details),
        axis: opts().axis ?? "y",
        min,
        max,
        step,
        minSize,
        maxSize,
        size: () => opts().size ?? 60,
        tracks: () => opts().tracks,
        overlap: opts().overlap ?? true,
        create: (span) =>
          opts().onCreate ? opts().onCreate!(span) : { ...span, id: crypto.randomUUID(), title: "New event" },
        disabled: isLocked,
        label: describe,
        createAutoScroll: { edge: 32 },
      },
    )

    const all = () => context.store.get().events
    /** The same rules a drag keeps, for a form or an agent. */
    const problem = (event: ScheduleEvent) => {
      if (!opts().tracks.includes(event.track)) return `${trackName(event.track)} isn't on this schedule.`
      if (event.end <= event.start) return "It has to end after it starts."
      if (event.start < min() || event.end > max())
        return `It has to fit between ${time(min())} and ${time(max())}.`
      if (event.start % step() || event.end % step()) return `Times go in steps of ${step()} minutes.`
      if (event.end - event.start < minSize()) return `It has to last at least ${minSize()} minutes.`
      if (event.end - event.start > maxSize()) return `It can last at most ${maxSize()} minutes.`
      if (!(opts().overlap ?? true) && !isSpanFree(all().filter((e) => e.id !== event.id), event))
        return "That time overlaps another event."
      return undefined
    }

    const findEvent = (name: string) => {
      const byId = all().find((e) => e.id === name)
      if (byId) return byId
      const matches = all().filter((e) => e.title.toLowerCase() === String(name).toLowerCase())
      if (!matches.length) throw new Error(`No event "${name}" on this schedule.`)
      if (matches.length > 1)
        throw new Error(
          `"${name}" names ${matches.length} events: ${matches
            .map((e) => `${trackName(e.track)} at ${time(e.start)} (id ${e.id})`)
            .join("; ")}. Give the id.`,
        )
      return matches[0]!
    }
    const unlocked = (event: ScheduleEvent) => {
      if (isLocked(event)) throw new Error(`${event.title} is locked: it can't change.`)
      return event
    }
    const findTrack = (name: string) => {
      const track = opts().tracks.find(
        (t) => t === name || trackName(t).toLowerCase().startsWith(String(name).toLowerCase()),
      )
      if (!track)
        throw new Error(`No day or track "${name}". Showing: ${opts().tracks.map(trackName).join(", ")}.`)
      return track
    }
    // Agents give times as "14:30" or minutes from midnight.
    const minutes = (value: string | number) => {
      if (typeof value === "number") return value
      const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim())
      if (!match) throw new Error(`Give times as HH:MM, like 14:30, not "${value}".`)
      return Number(match[1]) * 60 + Number(match[2])
    }
    const refuse = (event: ScheduleEvent) => {
      const why = problem(event)
      if (why) throw new Error(`${event.title} doesn't fit: ${why}`)
    }

    const eventElement = (id: string) => context.element("event", id) ?? undefined
    const rootElement = () => context.element("root") ?? undefined
    // The events shown, track by track and by time. (Events on days not shown stay in state.)
    const ordered = () => {
      const order = opts().tracks
      return all()
        .filter((e) => order.includes(e.track))
        .sort((a, b) => order.indexOf(a.track) - order.indexOf(b.track) || a.start - b.start)
    }
    const neighbor = (id: string) => {
      const event = all().find((e) => e.id === id)
      if (!event) return undefined
      const own = ordered().filter((e) => e.track === event.track)
      const at = own.findIndex((e) => e.id === id)
      const near = own[at + 1] ?? own[at - 1]
      if (near) return near.id
      const order = opts().tracks
      const index = order.indexOf(event.track)
      for (let distance = 1; distance < order.length; distance++) {
        for (const track of [order[index + distance], order[index - distance]]) {
          const first = track ? ordered().find((e) => e.track === track) : undefined
          if (first) return first.id
        }
      }
      return undefined
    }

    return {
      spans,
      describe,
      time,
      problem,
      eventElement,
      neighbor,
      element: () => {
        const first = ordered()[0]
        return (first && eventElement(first.id)) || rootElement()
      },
      rootElement,
      /** The events now, and a way to set them from code (a web element's live `events`). */
      events: () => all(),
      setEvents: (next: ScheduleEvent[]) => change("events", next, { reason: "imperative", id: "", action: "move" }),
      /** Opens an event from a press; a schedule without `onOpen` ignores it. */
      open: (id: string) => opts().onOpen?.(id),
      /**
       * Every event for agents, as `{ value, label }`: the id, which tells same-named events
       * apart, and the event as a person reads it.
       */
      list: () => all().map((e) => ({ value: e.id, label: describe(e) })),
      /** Opens an event's details, by its title or id. */
      openEvent(event: string) {
        const open = opts().onOpen
        if (!open) throw new Error("This schedule doesn't open events.")
        open(findEvent(event).id)
        return true
      },
      /** Adds an event: a day or track, start and end as HH:MM, and a title. */
      addEvent(track: string, start: string, end: string, title: string) {
        const proposed = { id: crypto.randomUUID(), track: findTrack(track), start: minutes(start), end: minutes(end) }
        const made = opts().onCreate ? opts().onCreate!(proposed) : { ...proposed, title: "New event" }
        if (!made) throw new Error("This schedule doesn't take new events.")
        const event: ScheduleEvent = { ...made, ...proposed, id: made.id, title: String(title || made.title) }
        refuse(event)
        if (!change("events", [...all(), event], { reason: "imperative", id: event.id, action: "draw" }))
          throw new Error(`${event.title} wasn't added.`)
        return event.id
      },
      /** Moves an event to another day or track and start time, keeping its length. */
      moveEvent(event: string, track: string, start: string) {
        const found = unlocked(findEvent(event))
        const from = minutes(start)
        const next = { ...found, track: findTrack(track), start: from, end: from + (found.end - found.start) }
        refuse(next)
        if (!spans.update(found.id, { track: next.track, start: next.start, end: next.end }))
          throw new Error(`${found.title} didn't move.`)
        return true
      },
      /** Changes when an event ends. */
      resizeEvent(event: string, end: string) {
        const found = unlocked(findEvent(event))
        const next = { ...found, end: minutes(end) }
        refuse(next)
        if (!spans.update(found.id, { end: next.end })) throw new Error(`${found.title} didn't change.`)
        return true
      },
      /** Deletes an event. Not offered to agents: they delete through the dialog's confirm. */
      removeEvent(event: string) {
        return spans.remove(unlocked(findEvent(event)).id)
      },
    }
  },
  slots: (slot) => ({
    // The root hands its render function the events as drawn: the draft during a drag.
    // It takes focus when the last event goes, so focus never falls to the page.
    root: slot<{}, { events: ScheduleEvent[] }>({
      role: "group",
      state: (state, { api }) => ({ events: api.spans.spans(state) }),
      attrs: () => ({ "aria-roledescription": "schedule", tabindex: "-1" }),
    }),
    track: slot<{ value: string }>({
      props: { value: "string" },
      role: "group",
      on: {
        pointerdown: (event, { api, props }) => {
          if ((event.target as Element).closest?.("[data-span-id]")) return
          api.spans.trackPointerdown(event as PointerEvent, props.value)
        },
      },
      bind: (el, { api, props }) => api.spans.bindTrack(el, props.value),
    }),
    // A native button: Enter, Space and a click open it.
    event: slot<{ value: string }>({
      props: { value: "string" },
      role: "button",
      focus: "native",
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Delete", "Backspace"],
      press: ({ api, key }) => api.open(key),
      attrs: () => ({ type: "button", "aria-roledescription": "event" }),
      // Drag states are live: written straight to the element as a drag goes.
      live: live((state, { api, key }) => api.spans.spanAttrs(state, key)),
      on: {
        keydown: (event, { api, key }) => {
          const e = event as KeyboardEvent
          if (e.key === "Enter" || e.key === " ") return
          const deleting = e.key === "Delete" || e.key === "Backspace"
          const next = deleting ? api.neighbor(key) : undefined
          // A deleted event takes its focus with it: hand it to the next event, or the schedule.
          if (api.spans.keydown(e, key) && deleting)
            keepFocus(() => (next && api.eventElement(next)) || api.rootElement())
        },
        pointerdown: (event, { api, key }) => api.spans.spanPointerdown(event as PointerEvent, key),
      },
      bind: (el, { api, key }) => api.spans.bindSpan(el, key),
    }),
  }),
  agent: {
    actions: ["addEvent", "moveEvent", "resizeEvent", "openEvent"],
    items: (api) => api.list(),
  },
})

export { clock, createScheduleController, schedulePrimitive }
export type { ScheduleChange, ScheduleController, ScheduleControllerApi, ScheduleEvent, ScheduleOptions }
