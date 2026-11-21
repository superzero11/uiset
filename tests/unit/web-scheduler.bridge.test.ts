import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/button"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/segmented-control"
import "@ui-sdk/web/select"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Scheduler as web elements (web/schedule.html), on a page with no React: a UTC team week
// (Monday, Nov 16 to Friday, Nov 20, 8 AM to 6 PM), rooms as a timeline, and the month,
// driven through the web agent bridge. Moved from tests/e2e/web/scheduler.spec.ts.

const schedule = () => screen.getByRole("group", { name: "Team week" })
const track = (name: string) => within(schedule()).getByRole("group", { name })
// The schedule on show: the week, or the rooms timeline (its own schedule).
const shown = () => document.querySelector<HTMLElement>("uiset-schedule:not([hidden])")!
const event = (name: RegExp) => within(shown()).queryByRole("button", { name })
const open = () => openWebPage("schedule.html", "schedule-demo.ts")
type Agent = { query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]> }

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("the month names each day's events; choosing a day opens it", async () => {
  const bridge = await open()
  await bridge.run("Calendar layout", "setValue", "month")
  const day = screen.getByRole("gridcell", { name: /Monday, November 16, 2026, 2 events: Standup at 9:00 AM, Design review at 1:00 PM/ })
  expect(day.querySelectorAll(".schedule-month-chip")).toHaveLength(2)
  // A new timeLabel rewrites every chip and day name.
  ;(document.querySelector("uiset-schedule-month") as HTMLElement & { timeLabel: (n: number) => string }).timeLabel = (n) => `${n / 60}h`
  await settle()
  expect(document.querySelector('ui-calendar-day[value="2026-11-16"] .schedule-month-chip')!.textContent).toBe("9h Standup")
  expect(screen.getByRole("gridcell", { name: /2 events: Standup at 9h/ })).toBeTruthy()
  screen.getByRole("gridcell", { name: /Wednesday, November 18/ }).click()
  await waitFor(() => expect(screen.getByRole("heading", { name: "Wednesday, Nov 18" })).toBeTruthy())
  expect(event(/^Customer call, Wednesday, Nov 18/)).not.toBeNull()
})

test("room bookings refuse an overlap, by keyboard and for agents", async () => {
  const bridge = await open()
  await bridge.run("Calendar layout", "setValue", "timeline")
  expect(event(/^Workshop, Atlas room/)).not.toBeNull()
  const refused = await bridge.run("Rooms", "moveEvent", "Lunch and learn", "Atlas room", "10:00")
  expect(refused.ok).toBe(false)
  const moved = await bridge.run("Rooms", "moveEvent", "Lunch and learn", "Bolt room", "10:00")
  expect(moved.ok, moved.error?.message).toBe(true)
  expect(event(/^Lunch and learn, Bolt room, 10:00 AM to 11:00 AM/)).not.toBeNull()
})

test("agents add, move and resize events by the names people see, and read the week", async () => {
  const bridge = await open()
  const added = await bridge.run("Team week", "addEvent", "Friday, Nov 20", "14:00", "15:00", "Demo")
  expect(added.ok, added.error?.message).toBe(true)
  expect(event(/^Demo, Friday, Nov 20, 2:00 PM to 3:00 PM/)).not.toBeNull()
  expect((await bridge.run("Team week", "resizeEvent", "Demo", "16:00")).ok).toBe(true)
  expect(event(/^Demo, Friday, Nov 20, 2:00 PM to 4:00 PM/)).not.toBeNull()
  const found = await (bridge.agent as unknown as Agent).query({ within: "Team week" })
  const items = found.find((c) => c.label === "Team week")?.items?.map((i) => i.label)
  expect(items?.some((label) => label.startsWith("Standup"))).toBe(true)
})

test("attributes and new functions redraw: today, hours, renderEvent; the page's description stays", async () => {
  await open()
  const el = document.getElementById("schedule") as HTMLElement & { renderEvent: (e: { title: string }) => Node }
  el.setAttribute("today", "2026-11-18")
  await settle()
  expect(track("Wednesday, Nov 18").hasAttribute("data-today")).toBe(true)
  expect(track("Monday, Nov 16").hasAttribute("data-today")).toBe(false)
  el.setAttribute("start-hour", "9")
  await settle()
  expect(el.querySelector(".schedule-gutter .schedule-hour-name")!.textContent).toBe("9 AM")
  el.renderEvent = (e) => Object.assign(document.createElement("strong"), { textContent: e.title.toUpperCase() })
  await settle()
  expect([...el.querySelectorAll("strong")].some((s) => s.textContent === "STANDUP")).toBe(true)
  // A new renderEvent replaces the last one's faces.
  el.renderEvent = (e) => Object.assign(document.createElement("em"), { textContent: `${e.title}!` })
  await settle()
  expect([...el.querySelectorAll("em")].some((s) => s.textContent === "Standup!")).toBe(true)
  expect(el.querySelectorAll("strong")).toHaveLength(0)
  el.before(Object.assign(document.createElement("p"), { id: "week-note", textContent: "All times UTC." }))
  el.setAttribute("aria-describedby", "week-note")
  await settle()
  expect(screen.getByRole("group", { name: "Team week", description: /^All times UTC\. Each event is a button/ })).toBe(schedule())
})

// Elements made in a document with no window aren't upgraded, as a page leaves them before
// the element modules load; appended here, they upgrade with what was set on them.
async function early(html: string, set: (doc: Document) => void) {
  const before = document.implementation.createHTMLDocument()
  before.body.innerHTML = html
  set(before)
  document.body.append(...before.body.childNodes)
  await settle()
}

test("properties set before the elements are defined draw once they are", async () => {
  await early(
    `<uiset-root>
      <uiset-schedule id="s" aria-label="Early week" start-hour="8" end-hour="12"></uiset-schedule>
      <uiset-schedule-month id="m" month="2026-11" label="Early month"></uiset-schedule-month>
    </uiset-root>`,
    (doc) => {
      Object.assign(doc.getElementById("s")!, {
        tracks: [{ id: "2026-11-16", label: "Monday" }],
        events: [{ id: "a", track: "2026-11-16", start: 540, end: 600, title: "Early standup" }],
      })
      Object.assign(doc.getElementById("m")!, {
        events: [{ id: "a", track: "2026-11-16", start: 540, end: 600, title: "Early standup" }],
        timeLabel: (n: number) => String(n / 60) + "h",
      })
    },
  )
  expect(screen.getByRole("button", { name: /^Early standup, Monday/ })).toBeTruthy()
  expect(screen.getByRole("gridcell", { name: /November 16, 2026, 1 event: Early standup at 9h/ })).toBeTruthy()
})
