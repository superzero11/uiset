import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import SchedulerExample from "@/src/site/examples/scheduler"
import { createBridge, settle } from "./bridge"

// The gallery's scheduler (src/site/examples/scheduler.tsx), driven through the agent bridge:
// the New event form's checks, the month view, and the events' names. Moved from
// tests/e2e/scheduler.spec.ts.

const bridge = createBridge()
const calendar = () => screen.getByRole("group", { name: "Team calendar" })
const event = (name: RegExp | string) => within(calendar()).queryByRole("button", { name })
const form = () => screen.getByRole("form", { name: "New event" })

/** Opens New event and adds one with these fields, as typed. */
async function addEvent(fields: { Title?: string; Starts: string; Ends: string }) {
  if (!bridge.find("Add event")) await bridge.press("New event")
  for (const [label, value] of Object.entries(fields)) await bridge.run(label, "setValue", value)
  await bridge.press("Add event")
}

beforeEach(async () => {
  render(
    <UISet>
      <SchedulerExample />
    </UISet>,
  )
  await settle()
})

test("New event opens a form that checks its times", async () => {
  await addEvent({ Title: "Retro", Starts: "16:00", Ends: "15:00" })
  expect(form().textContent).toContain("It has to end after it starts.")
  await addEvent({ Starts: "16:00", Ends: "17:00" })
  await waitFor(() => expect(event(/^Retro, Monday, November 16, 4:00 PM to 5:00 PM/)).toBeTruthy())
})

test("the month shows each day's events; choosing a day opens it", async () => {
  await bridge.run("Calendar layout", "setValue", "Month")
  const month = screen.getByRole("grid")
  expect(month.textContent).toContain("Launch rehearsal")
  const day = within(month).getByRole("gridcell", { name: /November 18.*2 events: Standup at 9:00 AM, Launch rehearsal at 3:00 PM/ })
  await userEvent.click(day)
  await settle()
  expect(bridge.entry("Calendar layout").value).toBe("day")
  expect(event(/^Launch rehearsal, Wednesday/)).toBeTruthy()
})

test("the dialog keeps the schedule's hours and steps", async () => {
  await addEvent({ Title: "Too early", Starts: "07:00", Ends: "07:30" })
  expect(form().textContent).toContain("Starts at 8:00 AM or later.")
  await addEvent({ Starts: "09:10", Ends: "09:40" })
  expect(form().textContent).toContain("Times go in steps of 15 minutes.")
})

test("names stay current after paging weeks", async () => {
  await bridge.press("Next week")
  await bridge.press("Previous week")
  expect(event("Standup, Monday, November 16, 9:00 AM to 9:30 AM, Atlas room")).toBeTruthy()
})
