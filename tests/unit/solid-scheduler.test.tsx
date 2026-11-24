// The scheduler in Solid, with React's assertions (tests/unit/scheduler.test.tsx). Drawing,
// moving, keys, overlaps and agents are UISet's own primitive (scheduler/schedule.ts); these
// check the Solid views over it.
import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal } from "solid-js"
import { expect, test, vi } from "vitest"
import { EventDialog, MonthView, Schedule, SchedulerToolbar, createScheduleController, type EventDraft, type ScheduleEvent } from "@/solid/src/scheduler"
import { settle } from "./solid-bridge"

const tracks = [
  { id: "2026-11-16", label: "Monday, November 16" },
  { id: "2026-11-17", label: "Tuesday, November 17" },
]

function Demo(props: {
  onOpen?: (e: ScheduleEvent) => void
  overlap?: boolean
  onChange?: (e: ScheduleEvent[]) => void
  tracks?: typeof tracks
  extra?: ScheduleEvent[]
  locked?: (e: ScheduleEvent) => boolean
}) {
  const [events, setEvents] = createSignal<ScheduleEvent[]>([
    { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" },
    { id: "b", track: "2026-11-16", start: 11 * 60, end: 12 * 60, title: "Review" },
    ...(props.extra ?? []),
  ])
  return (
    <Schedule
      label="Team calendar"
      tracks={props.tracks ?? tracks}
      locked={props.locked}
      events={events()}
      overlap={props.overlap}
      onEventsChange={(next) => {
        setEvents(next)
        props.onChange?.(next)
      }}
      onEventOpen={props.onOpen}
    />
  )
}

const event = (name: RegExp) => screen.getByRole("button", { name })
const press = async (key: string, shiftKey = false) => {
  fireEvent.keyDown(document.activeElement!, { key, shiftKey })
  await settle(0)
}

test("each event is a tab stop named with its day and time", async () => {
  render(() => <Demo />)
  await settle()
  const standup = event(/^Standup/)
  expect(standup.getAttribute("aria-label")).toBe("Standup, Monday, November 16, 9:00 AM to 10:00 AM")
  expect(standup.getAttribute("aria-roledescription")).toBe("event")
  expect(standup.tabIndex).toBe(0)
  expect(screen.getByRole("group", { name: "Team calendar" }).getAttribute("aria-roledescription")).toBe("schedule")
  expect(screen.getAllByRole("group", { name: /^(Monday|Tuesday)/ })).toHaveLength(2)
})

test("arrows move an event by the step, Shift changes its end, across moves days", async () => {
  render(() => <Demo />)
  await settle()
  event(/^Standup/).focus()
  await press("ArrowDown")
  expect(event(/^Standup/).getAttribute("aria-label")).toMatch(/9:15 AM to 10:15 AM/)
  // The same element, moved in place: focus never left it.
  expect(document.activeElement).toBe(event(/^Standup/))
  await press("ArrowDown", true)
  expect(event(/^Standup/).getAttribute("aria-label")).toMatch(/9:15 AM to 10:30 AM/)
  await press("ArrowRight")
  expect(event(/^Standup/).getAttribute("aria-label")).toMatch(/^Standup, Tuesday/)
  await waitFor(() => expect(document.activeElement).toBe(event(/^Standup/)))
})

test("a day's events stand in time order, which is their Tab order, each placed by its time", async () => {
  render(() => (
    <Schedule
      label="Team calendar"
      tracks={tracks}
      defaultEvents={[
        { id: "b", track: "2026-11-16", start: 11 * 60, end: 12 * 60, title: "Review", color: 2 },
        { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" },
      ]}
    />
  ))
  await settle()
  const monday = screen.getByRole("group", { name: "Monday, November 16" })
  expect(within(monday).getAllByRole("button").map((b) => b.textContent?.split(",")[0])).toEqual(["Standup9:00 AM – 10:00 AM", "Review11:00 AM – 12:00 PM"])
  const [standup, review] = within(monday).getAllByRole("button")
  // Its place and length come from the primitive's span style; its color from its slot.
  expect(standup!.getAttribute("style")).not.toBe(review!.getAttribute("style")!.replace("--chart-2", "--chart-1"))
  expect(review!.style.getPropertyValue("--series")).toBe("var(--chart-2)")
})

test("events are native buttons, so Enter, Space and a click open them", async () => {
  const onOpen = vi.fn()
  render(() => <Demo onOpen={onOpen} />)
  await settle()
  const review = event(/^Review/)
  expect(review.tagName).toBe("BUTTON")
  expect(review.getAttribute("type")).toBe("button")
  fireEvent.click(review)
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: "Review" }))
})

test("Delete removes an event and hands focus to the next one, then to the schedule", async () => {
  render(() => <Demo />)
  await settle()
  event(/^Standup/).focus()
  await press("Delete")
  await settle()
  expect(screen.queryByRole("button", { name: /^Standup/ })).toBeNull()
  expect(document.activeElement).toBe(event(/^Review/))
  await press("Delete")
  await settle()
  expect(document.activeElement).toBe(screen.getByRole("group", { name: "Team calendar" }))
})

test("names follow the tracks shown now, not the last draw's", async () => {
  const [shown, setShown] = createSignal(tracks)
  render(() => <Demo tracks={shown()} />)
  await settle()
  setShown([{ id: "2026-11-16", label: "Mon 16" }, tracks[1]!])
  await settle()
  expect(event(/^Standup/).getAttribute("aria-label")).toBe("Standup, Mon 16, 9:00 AM to 10:00 AM")
})

test("an event's place is part of its name, and shows on its face", async () => {
  render(() => <Demo extra={[{ id: "c", track: "2026-11-17", start: 13 * 60, end: 14 * 60, title: "Lunch", location: "Cafe" }]} />)
  await settle()
  const lunch = event(/^Lunch/)
  expect(lunch.getAttribute("aria-label")).toBe("Lunch, Tuesday, November 17, 1:00 PM to 2:00 PM, Cafe")
  expect([...lunch.querySelectorAll("span")].map((s) => s.textContent)).toEqual(["Lunch", "1:00 PM – 2:00 PM", "Cafe", ""])
})

test("agents add, move and resize events by name, and hear why a time won't fit", async () => {
  const agent = createAgent()
  const onChange = vi.fn()
  render(() => <Demo overlap={false} onChange={onChange} />)
  await settle()
  const entry = agent.snapshot().find((item) => item.label === "Team calendar")
  expect(entry?.actions).toEqual(expect.arrayContaining(["addEvent", "moveEvent", "resizeEvent", "openEvent"]))
  // Deleting goes through the dialog's confirm, never straight from an agent.
  expect(entry?.actions).not.toContain("removeEvent")
  const run = async (action: string, ...args: unknown[]) => {
    const result = await agent.act({ steps: [{ ref: "Team calendar", action, args }] })
    await settle()
    return result
  }

  let result = await run("addEvent", "Tuesday", "14:00", "15:00", "Planning")
  expect(result.ok, result.error?.message).toBe(true)
  expect(event(/^Planning, Tuesday, November 17, 2:00 PM to 3:00 PM/)).toBeTruthy()

  result = await run("moveEvent", "Planning", "Monday", "9:30")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/overlaps/)

  result = await run("moveEvent", "Planning", "Monday", "half past two")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/HH:MM/)

  // A new event keeps the same rules a drag does.
  result = await run("addEvent", "Monday", "9:30", "10:30", "Clash")
  expect(result.error?.message).toMatch(/overlaps/)
  result = await run("addEvent", "Monday", "6:00", "7:00", "Too early")
  expect(result.error?.message).toMatch(/fit between 8:00 AM and 8:00 PM/)
  result = await run("addEvent", "Monday", "15:00", "14:00", "Backwards")
  expect(result.error?.message).toMatch(/end after it starts/)
  result = await run("addEvent", "Monday", "15:05", "16:00", "Off step")
  expect(result.error?.message).toMatch(/steps of 15/)
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange.mock.calls[0]![0]).toHaveLength(3)

  result = await run("resizeEvent", "Planning", "16:00")
  expect(result.ok, result.error?.message).toBe(true)
  expect(event(/^Planning, Tuesday, November 17, 2:00 PM to 4:00 PM/)).toBeTruthy()
})

test("agents must name which of two same-titled events, and a locked one stays", async () => {
  const agent = createAgent()
  render(() => <Demo extra={[{ id: "c", track: "2026-11-17", start: 9 * 60, end: 10 * 60, title: "Standup" }]} locked={(e) => e.id === "b"} />)
  await settle()
  const run = async (action: string, ...args: unknown[]) => {
    const result = await agent.act({ steps: [{ ref: "Team calendar", action, args }] })
    await settle()
    return result
  }
  let result = await run("moveEvent", "Standup", "Monday", "13:00")
  expect(result.error?.message).toMatch(/names 2 events.*id a.*id c/)
  result = await run("moveEvent", "c", "Tuesday", "13:00")
  expect(result.ok, result.error?.message).toBe(true)
  result = await run("resizeEvent", "Review", "13:00")
  expect(result.error?.message).toMatch(/locked/)
  // A locked event shows it, and has no edge to drag.
  expect(event(/^Review/).hasAttribute("data-locked")).toBe(true)
  expect(event(/^Review/).querySelector("[data-span-edge]")).toBeNull()
  expect(agent.snapshot().find((item) => item.label === "Team calendar")?.items).toEqual(
    expect.arrayContaining([{ value: "a", label: "Standup, Monday, November 16, 9:00 AM to 10:00 AM" }]),
  )
})

test("agents hear that a schedule without onEventOpen can't open events", async () => {
  const agent = createAgent()
  render(() => <Demo />)
  await settle()
  const result = await agent.act({ steps: [{ ref: "Team calendar", action: "openEvent", args: ["Standup"] }] })
  expect(result.error?.message).toMatch(/doesn't open events/)
  expect(() => fireEvent.click(event(/^Standup/))).not.toThrow()
})

test("today's track carries the now line, placed by the time in its zone", async () => {
  render(() => (
    <Schedule label="Team calendar" tracks={tracks} defaultEvents={[]} today="2026-11-16" now={new Date(Date.UTC(2026, 10, 16, 14, 0))} timeZone="UTC" startHour={8} endHour={20} />
  ))
  await settle()
  const monday = screen.getByRole("group", { name: "Monday, November 16" })
  expect(monday.hasAttribute("data-today")).toBe(true)
  expect(monday.querySelector<HTMLElement>(".schedule-now")?.style.top).toBe("50%")
  expect(screen.getByRole("group", { name: "Tuesday, November 17" }).querySelector(".schedule-now")).toBeNull()
})

test("the dialog's form starts over for each event it opens", async () => {
  const a = { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" }
  const b = { id: "b", track: "2026-11-16", start: 11 * 60, end: 12 * 60, title: "Review" }
  const [open, setOpen] = createSignal<EventDraft | null>(a)
  render(() => <EventDialog tracks={tracks} onSave={vi.fn()} onClose={vi.fn()} event={open()} />)
  await settle()
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveProperty("value", "Standup")
  // An agent opens another event while this one is open.
  setOpen(b)
  await settle()
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveProperty("value", "Review")
})

test("the dialog checks times, ties the problem to its field, and saves through the schedule", async () => {
  const schedule = createScheduleController()
  const [events, setEvents] = createSignal<ScheduleEvent[]>([
    { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" },
    { id: "b", track: "2026-11-17", start: 9 * 60, end: 10 * 60, title: "Review" },
  ])
  const [open, setOpen] = createSignal<EventDraft | null>(null)
  const onSave = vi.fn((next: ScheduleEvent) => setEvents(events().map((e) => (e.id === next.id ? next : e))))
  render(() => (
    <>
      <Schedule label="Team calendar" tracks={tracks} events={events()} onEventsChange={setEvents} controller={schedule} overlap={false} onEventOpen={setOpen} />
      <EventDialog schedule={schedule} tracks={tracks} startHour={8} endHour={20} step={15} event={open()} onSave={onSave} onClose={() => setOpen(null)} />
    </>
  ))
  await settle()
  event(/^Standup/).focus()
  fireEvent.click(event(/^Standup/))
  const dialog = await screen.findByRole("dialog", { name: "Standup" })
  const form = within(dialog).getByRole("form", { name: "Edit Standup" }) as HTMLFormElement
  const [start, end] = [...form.querySelectorAll<HTMLInputElement>("input[type=time]")]
  end!.value = "08:30"
  fireEvent.submit(form)
  await settle()
  expect(within(dialog).getByRole("alert").textContent).toBe("It has to end after it starts.")
  expect(end!.getAttribute("aria-invalid")).toBe("true")
  expect(document.getElementById(end!.getAttribute("aria-describedby")!)?.textContent).toBe("It has to end after it starts.")
  expect(document.activeElement).toBe(end)
  // Tuesday at 9 overlaps Review: the schedule's own rule, said on the Starts field.
  end!.value = "10:00"
  form.querySelector<HTMLInputElement | HTMLSelectElement>("[name='event-track']")!.value = "2026-11-17"
  fireEvent.submit(form)
  await settle()
  expect(within(dialog).getByRole("alert").textContent).toBe("That time overlaps another event.")
  expect(document.activeElement).toBe(start)
  start!.value = "11:00"
  end!.value = "12:00"
  fireEvent.submit(form)
  await settle()
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "a", track: "2026-11-17", start: 11 * 60, end: 12 * 60 }))
  // Focus followed the event to Tuesday.
  await waitFor(() => expect(document.activeElement).toBe(event(/^Standup, Tuesday/)))
})

test("the dialog deletes after asking, beside its form, and focus goes to the neighbor", async () => {
  const schedule = createScheduleController()
  const [events, setEvents] = createSignal<ScheduleEvent[]>([
    { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" },
    { id: "b", track: "2026-11-16", start: 11 * 60, end: 12 * 60, title: "Review" },
    { id: "c", track: "2026-11-16", start: 13 * 60, end: 14 * 60, title: "Retro" },
  ])
  const [open, setOpen] = createSignal<EventDraft | null>(null)
  render(() => (
    <>
      <Schedule label="Team calendar" tracks={tracks} events={events()} onEventsChange={setEvents} controller={schedule} onEventOpen={setOpen} />
      <EventDialog
        schedule={schedule}
        tracks={tracks}
        event={open()}
        onSave={() => {}}
        onDelete={(gone) => setEvents(events().filter((e) => e.id !== gone.id))}
        onClose={() => setOpen(null)}
      />
    </>
  ))
  await settle()
  event(/^Review/).focus()
  fireEvent.click(event(/^Review/))
  const dialog = await screen.findByRole("dialog", { name: "Review" })
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete event" }))
  const alert = await screen.findByRole("alertdialog", { name: "Delete “Review”?" })
  expect(alert.closest("form")).toBeNull()
  fireEvent.click(within(alert).getByRole("button", { name: "Delete for good" }))
  await settle()
  expect(screen.queryByRole("button", { name: /^Review/ })).toBeNull()
  // The next event on its day, not the schedule's first.
  await waitFor(() => expect(document.activeElement).toBe(event(/^Retro/)))
})

test("the month names each day with its events, and choosing one says which", async () => {
  const onDayChoose = vi.fn()
  render(() => (
    <MonthView
      label="Month of events"
      month="2026-11"
      today="2026-11-16"
      weekStartsOn={1}
      onDayChoose={onDayChoose}
      events={[
        { id: "a", track: "2026-11-18", start: 15 * 60, end: 16 * 60, title: "Launch rehearsal" },
        { id: "b", track: "2026-11-18", start: 9 * 60, end: 10 * 60, title: "Standup" },
        ...["One", "Two", "Three", "Four"].map((title, i) => ({ id: `x${i}`, track: "2026-11-20", start: (9 + i) * 60, end: (10 + i) * 60, title })),
      ]}
    />
  ))
  await settle()
  const day = screen.getByRole("gridcell", { name: /November 18.*2 events: Standup at 9:00 AM, Launch rehearsal at 3:00 PM/ })
  expect(day.textContent).toBe("189 AM Standup3 PM Launch rehearsal")
  const busy = screen.getByRole("gridcell", { name: /November 20/ })
  expect([...busy.querySelectorAll(".schedule-month-chip")].map((chip) => chip.textContent)).toEqual(["9 AM One", "10 AM Two", "11 AM Three"])
  expect(busy.querySelector(".schedule-month-more")?.textContent).toBe("1 more")
  fireEvent.click(day)
  await settle()
  expect(onDayChoose).toHaveBeenCalledWith("2026-11-18")
})

test("the toolbar names its arrows by the unit, and switches the layout", async () => {
  const onViewChange = vi.fn()
  const onNewEvent = vi.fn()
  render(() => (
    <SchedulerToolbar title="Nov 16 – 22, 2026" view="week" unit="week" onViewChange={onViewChange} onToday={() => {}} onPrevious={() => {}} onNext={() => {}} onNewEvent={onNewEvent} />
  ))
  await settle()
  expect(screen.getByRole("button", { name: "Previous week" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Next week" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Go to today" })).toBeTruthy()
  fireEvent.click(screen.getByRole("radio", { name: "Month" }))
  await settle()
  expect(onViewChange).toHaveBeenCalledWith("month")
  fireEvent.click(screen.getByRole("button", { name: "New event" }))
  expect(onNewEvent).toHaveBeenCalled()
})
