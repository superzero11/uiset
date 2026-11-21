import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The Scheduler as web elements, on a page with no React: a UTC team week (Monday, Nov 16
// to Friday, Nov 20, 8 AM to 6 PM), rooms as a timeline, and the month.
const schedule = (page: Page) => page.getByRole("group", { name: "Team week", exact: true })
const track = (page: Page, name: string) => schedule(page).getByRole("group", { name, exact: true })
// The schedule on show: the week, or the rooms timeline (its own schedule).
const event = (page: Page, name: RegExp) => page.locator("uiset-schedule:not([hidden])").getByRole("button", { name })
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)
const view = (page: Page, name: string) => page.getByRole("radio", { name }).click()

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/schedule.html")
  await expect(event(page, /^Standup/)).toBeVisible()
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Scheduler page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      const run = () => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      const format = (r: Awaited<ReturnType<typeof run>>) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)
      expect(format(await run())).toEqual([])
      await view(page, "Month")
      await expect(page.locator("uiset-schedule-month")).toBeVisible()
      expect(format(await run())).toEqual([])
    })
  }
}

test("drag down an empty stretch to draw an event", { tag: "@engine" }, async ({ page }) => {
  const friday = (await track(page, "Friday, Nov 20").boundingBox())!
  const hour = friday.height / 10
  await page.mouse.move(friday.x + friday.width / 2, friday.y + hour * 1 + 2)
  await page.mouse.down()
  await page.mouse.move(friday.x + friday.width / 2, friday.y + hour * 2.5, { steps: 8 })
  await page.mouse.up()
  await expect(event(page, /^New event, Friday, Nov 20, 9:00 AM to 10:30 AM/)).toBeVisible()
})

test("drag an event to move it, and its end edge to resize it", { tag: "@engine" }, async ({ page }) => {
  const call = event(page, /^Customer call/)
  const box = (await call.boundingBox())!
  const hour = (await track(page, "Wednesday, Nov 18").boundingBox())!.height / 10
  await page.mouse.move(box.x + box.width / 2, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 8 + hour, { steps: 8 })
  await page.mouse.up()
  await expect(event(page, /^Customer call, Wednesday, Nov 18, 11:00 AM to 12:00 PM/)).toBeVisible()
  const moved = (await event(page, /^Customer call/).boundingBox())!
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height - 2)
  await page.mouse.down()
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height - 2 + hour, { steps: 8 })
  await page.mouse.up()
  await expect(event(page, /^Customer call, Wednesday, Nov 18, 11:00 AM to 1:00 PM/)).toBeVisible()
})

test("arrows move an event, Shift with arrows changes its end, Delete removes it and hands focus on", { tag: "@engine" }, async ({ page }) => {
  await event(page, /^Standup/).focus()
  await page.keyboard.press("ArrowDown")
  await expect(event(page, /^Standup, Monday, Nov 16, 9:15 AM to 10:15 AM/)).toBeFocused()
  await page.keyboard.press("Shift+ArrowDown")
  await expect(event(page, /^Standup, Monday, Nov 16, 9:15 AM to 10:30 AM/)).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(event(page, /^Standup, Tuesday, Nov 17, 9:15 AM to 10:30 AM/)).toBeFocused()
  await page.keyboard.press("Delete")
  await expect(event(page, /^Standup/)).toHaveCount(0)
  await expect(page.locator("#schedule").getByRole("button").and(page.locator(":focus"))).toHaveCount(1)
})

test("Enter opens an event in the page's dialog, and Cancel returns focus to it", { tag: "@engine" }, async ({ page }) => {
  await event(page, /^Retro/).focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Retro" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(event(page, /^Retro/)).toBeFocused()
  // Without `openable` the schedule doesn't open events, and agents are told.
  await page.locator("#schedule").evaluate((el) => el.removeAttribute("openable"))
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const opened = await act(page, [{ ref: "Team week", action: "openEvent", args: ["Retro"] }])
  expect(opened.ok).toBe(false)
})

test("New event opens a form that checks its times", { tag: "@engine" }, async ({ page }) => {
  await page.getByRole("button", { name: "New event" }).click()
  const dialog = page.getByRole("dialog", { name: "New event" })
  await dialog.getByRole("textbox", { name: "Title" }).fill("Pairing")
  await dialog.getByLabel("Starts").fill("11:00")
  await dialog.getByLabel("Ends").fill("10:00")
  await dialog.getByRole("button", { name: "Save" }).click()
  await expect(dialog.getByRole("alert")).toHaveText("It has to end after it starts.")
  await dialog.getByLabel("Ends").fill("12:00")
  await dialog.getByRole("button", { name: "Save" }).click()
  await expect(event(page, /^Pairing, Monday, Nov 16, 11:00 AM to 12:00 PM/)).toBeFocused()
})

test("the month names each day's events; choosing a day opens it", async ({ page }) => {
  await view(page, "Month")
  const day = page.getByRole("gridcell", { name: /Monday, November 16, 2026, 2 events: Standup at 9:00 AM, Design review at 1:00 PM/ })
  await expect(day).toBeVisible()
  await expect(day.locator(".schedule-month-chip")).toHaveCount(2)
  // A new timeLabel rewrites every chip and day name.
  await page.locator("uiset-schedule-month").evaluate((m) => ((m as unknown as { timeLabel: (n: number) => string }).timeLabel = (n) => `${n / 60}h`))
  await expect(page.locator('ui-calendar-day[value="2026-11-16"] .schedule-month-chip').first()).toHaveText("9h Standup")
  await expect(page.getByRole("gridcell", { name: /2 events: Standup at 9h/ })).toBeVisible()
  await page.getByRole("gridcell", { name: /Wednesday, November 18/ }).click()
  await expect(page.getByRole("heading", { name: "Wednesday, Nov 18" })).toBeVisible()
  await expect(event(page, /^Customer call, Wednesday, Nov 18/)).toBeVisible()
})

test("room bookings refuse an overlap, by keyboard and for agents", async ({ page }) => {
  await view(page, "Rooms")
  await expect(event(page, /^Workshop, Atlas room/)).toBeVisible()
  const refused = await act(page, [{ ref: "Rooms", action: "moveEvent", args: ["Lunch and learn", "Atlas room", "10:00"] }])
  expect(refused.ok).toBe(false)
  const moved = await act(page, [{ ref: "Rooms", action: "moveEvent", args: ["Lunch and learn", "Bolt room", "10:00"] }])
  expect(moved.ok, moved.error?.message).toBe(true)
  await expect(event(page, /^Lunch and learn, Bolt room, 10:00 AM to 11:00 AM/)).toBeVisible()
})

test("agents add, move and resize events by the names people see, and read the week", async ({ page }) => {
  const added = await act(page, [{ ref: "Team week", action: "addEvent", args: ["Friday, Nov 20", "14:00", "15:00", "Demo"] }])
  expect(added.ok, added.error?.message).toBe(true)
  await expect(event(page, /^Demo, Friday, Nov 20, 2:00 PM to 3:00 PM/)).toBeVisible()
  expect((await act(page, [{ ref: "Team week", action: "resizeEvent", args: ["Demo", "16:00"] }])).ok).toBe(true)
  await expect(event(page, /^Demo, Friday, Nov 20, 2:00 PM to 4:00 PM/)).toBeVisible()
  const items = await page.evaluate(async () => {
    const found = await (window as unknown as { agent: Agent }).agent.query({ within: "Team week" })
    return found.find((c) => c.label === "Team week")?.items?.map((i) => i.label)
  })
  expect(items?.some((label) => label.startsWith("Standup"))).toBe(true)
})

test("attributes and new functions redraw: today, hours, renderEvent; the page's description stays", async ({ page }) => {
  const el = page.locator("#schedule")
  await el.evaluate((s) => s.setAttribute("today", "2026-11-18"))
  await expect(track(page, "Wednesday, Nov 18")).toHaveAttribute("data-today", "")
  await expect(track(page, "Monday, Nov 16")).not.toHaveAttribute("data-today", "")
  await el.evaluate((s) => s.setAttribute("start-hour", "9"))
  await expect(el.locator(".schedule-gutter .schedule-hour-name").first()).toHaveText("9 AM")
  await el.evaluate((s) => ((s as unknown as { renderEvent: (e: { title: string }) => Node }).renderEvent = (e) => Object.assign(document.createElement("strong"), { textContent: e.title.toUpperCase() })))
  await expect(el.locator("strong", { hasText: "STANDUP" })).toBeVisible()
  // A new renderEvent replaces the last one's faces.
  await el.evaluate((s) => ((s as unknown as { renderEvent: (e: { title: string }) => Node }).renderEvent = (e) => Object.assign(document.createElement("em"), { textContent: `${e.title}!` })))
  await expect(el.locator("em", { hasText: "Standup!" })).toBeVisible()
  await expect(el.locator("strong")).toHaveCount(0)
  await el.evaluate((s) => {
    s.before(Object.assign(document.createElement("p"), { id: "week-note", textContent: "All times UTC." }))
    s.setAttribute("aria-describedby", "week-note")
  })
  await expect(schedule(page)).toHaveAccessibleDescription(/^All times UTC\. Each event is a button/)
})

test("properties set before the elements are defined draw once they are", async ({ page }) => {
  await page.route("**/early-schedule.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root>
          <uiset-schedule id="s" aria-label="Early week" start-hour="8" end-hour="12"></uiset-schedule>
          <uiset-schedule-month id="m" month="2026-11" label="Early month"></uiset-schedule-month>
        </uiset-root>
        <script>
          const s = document.getElementById("s")
          s.tracks = [{ id: "2026-11-16", label: "Monday" }]
          s.events = [{ id: "a", track: "2026-11-16", start: 540, end: 600, title: "Early standup" }]
          const m = document.getElementById("m")
          m.events = [{ id: "a", track: "2026-11-16", start: 540, end: 600, title: "Early standup" }]
          m.timeLabel = (n) => String(n / 60) + "h"
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-schedule.html")
  await expect(page.getByRole("button", { name: /^Early standup, Monday/ })).toBeVisible()
  await expect(page.getByRole("gridcell", { name: /November 16, 2026, 1 event: Early standup at 9h/ })).toBeVisible()
})
