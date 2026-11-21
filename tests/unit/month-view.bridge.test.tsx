import { cleanup, render } from "@testing-library/react"
import { createAgent as createWebAgent } from "@ui-sdk/web/agent"
import { afterEach, beforeAll, expect, test } from "vitest"
import { MonthView } from "@/registry/uiset/ui/scheduler"
import { UISet } from "@/registry/uiset/ui/uiset"
import { createBridge, settle } from "./bridge"

// A month of events is a calendar an agent finds by the name people see ("Month of events"),
// in React and as a web element. Its name sat on the grid inside, and the bridge names the
// calendar from its root, so agents saw a nameless calendar (2026-11-21).

const events = [{ id: "e1", title: "Standup", track: "2026-11-16", start: 9 * 60, end: 9 * 60 + 15 }]

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

test("React: an agent finds the month view by its name", async () => {
  const bridge = createBridge()
  render(
    <UISet>
      <MonthView month="2026-11" today="2026-11-16" events={events} label="Month of events" locale="en-US" weekStartsOn={1} />
    </UISet>,
  )
  await settle()
  expect(bridge.entry("Month of events").component).toBe("calendar")
})

beforeAll(async () => {
  await import("@/web/src/uiset")
  await import("@/web/src/schedule")
}, 60_000)

test("web: an agent finds the month view by its name", async () => {
  const bridge = createBridge(createWebAgent)
  document.body.innerHTML = `<uiset-root skin="base"><uiset-schedule-month month="2026-11" today="2026-11-16" label="Month of events" locale="en-US" week-starts-on="1"></uiset-schedule-month></uiset-root>`
  await settle(100)
  expect(bridge.entry("Month of events").component).toBe("calendar")
})
