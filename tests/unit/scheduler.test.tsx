import { act, fireEvent, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { EventDialog, Schedule, type ScheduleEvent } from "@/registry/uiset/ui/scheduler"

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
  const [events, setEvents] = useState<ScheduleEvent[]>([
    { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" },
    { id: "b", track: "2026-11-16", start: 11 * 60, end: 12 * 60, title: "Review" },
    ...(props.extra ?? []),
  ])
  return (
    <Schedule
      label="Team calendar"
      tracks={props.tracks ?? tracks}
      locked={props.locked}
      events={events}
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

test("each event is a tab stop named with its day and time", () => {
  render(<Demo />)
  const standup = event(/^Standup/)
  expect(standup.getAttribute("aria-label")).toBe("Standup, Monday, November 16, 9:00 AM to 10:00 AM")
  expect(standup.getAttribute("aria-roledescription")).toBe("event")
  expect(standup.tabIndex).toBe(0)
})

test("arrows move an event by the step, Shift changes its end, across moves days", async () => {
  render(<Demo />)
  const press = async (key: string, shiftKey = false) => {
    fireEvent.keyDown(document.activeElement!, { key, shiftKey })
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  }
  event(/^Standup/).focus()
  await press("ArrowDown")
  expect(event(/^Standup/).getAttribute("aria-label")).toMatch(/9:15 AM to 10:15 AM/)
  await press("ArrowDown", true)
  expect(event(/^Standup/).getAttribute("aria-label")).toMatch(/9:15 AM to 10:30 AM/)
  await press("ArrowRight")
  expect(event(/^Standup/).getAttribute("aria-label")).toMatch(/^Standup, Tuesday/)
})

test("events are native buttons, so Enter, Space and a click open them", () => {
  const onOpen = vi.fn()
  render(<Demo onOpen={onOpen} />)
  const review = event(/^Review/)
  expect(review.tagName).toBe("BUTTON")
  expect(review.getAttribute("type")).toBe("button")
  fireEvent.click(review)
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: "Review" }))
})

test("Delete removes an event and hands focus to the next one, then to the schedule", async () => {
  render(<Demo />)
  const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  event(/^Standup/).focus()
  fireEvent.keyDown(event(/^Standup/), { key: "Delete" })
  await tick()
  await tick()
  expect(screen.queryByRole("button", { name: /^Standup/ })).toBeNull()
  expect(document.activeElement).toBe(event(/^Review/))
  fireEvent.keyDown(event(/^Review/), { key: "Delete" })
  await tick()
  await tick()
  expect(document.activeElement).toBe(screen.getByRole("group", { name: "Team calendar" }))
})

test("names follow the tracks shown now, not the last render's", () => {
  const { rerender } = render(<Demo />)
  rerender(<Demo tracks={[{ id: "2026-11-16", label: "Mon 16" }, tracks[1]!]} />)
  expect(event(/^Standup/).getAttribute("aria-label")).toBe("Standup, Mon 16, 9:00 AM to 10:00 AM")
})

test("an event's place is part of its name", () => {
  render(<Demo extra={[{ id: "c", track: "2026-11-17", start: 13 * 60, end: 14 * 60, title: "Lunch", location: "Cafe" }]} />)
  expect(event(/^Lunch/).getAttribute("aria-label")).toBe("Lunch, Tuesday, November 17, 1:00 PM to 2:00 PM, Cafe")
})

test("agents add, move and remove events by name, and hear why a time won't fit", async () => {
  const agent = createAgent()
  const onChange = vi.fn()
  render(<Demo overlap={false} onChange={onChange} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const entry = agent.snapshot().find((item) => item.label === "Team calendar")
  expect(entry?.actions).toEqual(expect.arrayContaining(["addEvent", "moveEvent", "resizeEvent", "openEvent"]))
  // Deleting goes through the dialog's confirm, never straight from an agent.
  expect(entry?.actions).not.toContain("removeEvent")
  const run = (action: string, ...args: unknown[]) =>
    act(() => agent.act({ steps: [{ ref: "Team calendar", action, args }] }))

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
})

test("agents must name which of two same-titled events, and a locked one stays", async () => {
  const agent = createAgent()
  render(
    <Demo
      extra={[{ id: "c", track: "2026-11-17", start: 9 * 60, end: 10 * 60, title: "Standup" }]}
      locked={(e) => e.id === "b"}
    />,
  )
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const run = (action: string, ...args: unknown[]) =>
    act(() => agent.act({ steps: [{ ref: "Team calendar", action, args }] }))
  let result = await run("moveEvent", "Standup", "Monday", "13:00")
  expect(result.error?.message).toMatch(/names 2 events.*id a.*id c/)
  result = await run("moveEvent", "c", "Tuesday", "13:00")
  expect(result.ok, result.error?.message).toBe(true)
  result = await run("resizeEvent", "Review", "13:00")
  expect(result.error?.message).toMatch(/locked/)
  expect(agent.snapshot().find((item) => item.label === "Team calendar")?.items).toEqual(
    expect.arrayContaining([{ value: "a", label: "Standup, Monday, November 16, 9:00 AM to 10:00 AM" }]),
  )
})

test("agents hear that a schedule without onEventOpen can't open events", async () => {
  const agent = createAgent()
  render(<Demo />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const result = await act(() => agent.act({ steps: [{ ref: "Team calendar", action: "openEvent", args: ["Standup"] }] }))
  expect(result.error?.message).toMatch(/doesn't open events/)
  expect(() => fireEvent.click(event(/^Standup/))).not.toThrow()
})

test("the dialog's form starts over for each event it opens", async () => {
  const a = { id: "a", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup" }
  const b = { id: "b", track: "2026-11-16", start: 11 * 60, end: 12 * 60, title: "Review" }
  const props = { tracks, onSave: vi.fn(), onClose: vi.fn() }
  const { rerender } = render(<EventDialog {...props} event={a} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveProperty("value", "Standup")
  // An agent opens another event while this one is open.
  rerender(<EventDialog {...props} event={b} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveProperty("value", "Review")
})
