import { expect, test, type Locator, type Page } from "@playwright/test"
import { calendar, event, schedulerTests } from "../scheduler-tests"

// The scheduler kit on Solid's page (solid/scheduler.html), with React's browser tests
// (scheduler-tests.ts): the same drawing, moving, keys, dialog, month and room bookings.

schedulerTests({
  open: (page, search = "") => page.goto(`/scheduler.html${search}`).then(() => undefined),
  example: (page) => page.locator(".scheduler-stage").first(),
})

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

test("the scheduler page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/scheduler")
  const html = await response!.text()
  expect(html).toContain('aria-roledescription="schedule"')
  expect(html).toContain("Launch rehearsal")
  await event(page, /^Standup, Monday/).focus()
  await page.keyboard.press("ArrowDown")
  await expect(event(page, /^Standup, Monday, November 16, 9:15 AM to 9:45 AM/)).toBeFocused()
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

test("paging, the layouts and moves say nothing on the console", async ({ page }) => {
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/scheduler.html")
  const stage = page.locator(".scheduler-stage").first()
  await stage.getByRole("button", { name: "Next week" }).click()
  await stage.getByRole("button", { name: "Go to today" }).click()
  await stage.getByRole("radio", { name: "Day" }).click()
  await expect(calendar(page).getByRole("group", { name: /^Monday/ })).toHaveCount(1)
  await stage.getByRole("radio", { name: "Month" }).click()
  await expect(stage.getByRole("grid")).toBeVisible()
  await stage.getByRole("button", { name: "Next month" }).click()
  await stage.getByRole("radio", { name: "Week" }).click()
  await stage.getByRole("button", { name: "Go to today" }).click()
  await event(page, /^Design review/).focus()
  await page.keyboard.press("Shift+ArrowDown")
  await page.keyboard.press("ArrowRight")
  await expect(event(page, /^Design review, Tuesday/)).toBeFocused()
  await page.keyboard.press("Delete")
  await page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo", exact: true }).click()
  await expect(event(page, /^Design review, Tuesday/)).toHaveCount(1)
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

async function pressable(control: Locator) {
  return control
    .evaluate((el) => {
      const box = el.getBoundingClientRect()
      const hidden = el.closest("[inert], [aria-hidden='true'], [hidden]")
      const disabled = el.matches(":disabled, [aria-disabled='true'], [data-disabled]")
      return !hidden && !disabled && box.width > 0 && box.height > 0
    })
    .catch(() => false)
}

const nameOf = async (control: Locator) => ((await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").trim().slice(0, 40)

test("every control on the Solid scheduler page, and in its event dialog, can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(150_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/scheduler.html")
  let pressed = 0
  // Both schedules' buttons (toolbars and events: an event opens its dialog, which Escape
  // closes) and the layout radios. Paging is pressed, then undone by Go to today.
  for (const stage of [page.locator(".scheduler-stage").first(), page.locator(".scheduler-stage").last()]) {
    for (const role of ["button", "radio"] as const) {
      const controls = stage.getByRole(role)
      const total = await controls.count()
      for (let i = 0; i < total; i++) {
        const control = controls.nth(i)
        if (!(await pressable(control))) continue
        const name = await nameOf(control)
        await control.scrollIntoViewIfNeeded({ timeout: 2000 })
        await control.click({ timeout: 2000 })
        await page.keyboard.press("Escape")
        await expect(page.getByRole("dialog")).toHaveCount(0)
        pressed++
        expect(problems, `after ${role} "${name}"`).toEqual([])
      }
      // Back to this week's week view, for the next round.
      if (await stage.getByRole("radio", { name: "Week" }).count()) {
        await stage.getByRole("radio", { name: "Week" }).click()
        await stage.getByRole("button", { name: "Go to today" }).click()
      }
    }
  }

  // Inside an event's dialog: every field and button but the ones that close it, which go last.
  await event(page, /^Board prep/).click()
  const dialog = page.getByRole("dialog", { name: "Board prep" })
  await expect(dialog).toBeVisible()
  const closers = new Set(["Save event", "Cancel", "Close", "Delete event"])
  for (const role of ["textbox", "combobox", "button"] as const) {
    const controls = dialog.getByRole(role)
    const total = await controls.count()
    for (let i = 0; i < total; i++) {
      const control = controls.nth(i)
      const name = await nameOf(control)
      if (closers.has(name) || !(await pressable(control))) continue
      await control.click({ timeout: 2000 })
      // An open select's list closes with Escape; the dialog stays.
      if (await page.locator('[data-slot="select-content"]:not([hidden])').count()) await page.keyboard.press("Escape")
      await expect(dialog).toBeVisible()
      pressed++
      expect(problems, `after ${role} "${name}" in the dialog`).toEqual([])
    }
  }
  await dialog.getByRole("button", { name: "Delete event" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep the event" }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(event(page, /^Board prep/)).toBeFocused()
  await event(page, /^Board prep/).click()
  await dialog.getByRole("button", { name: "Save event" }).click()
  await expect(dialog).toBeHidden()
  pressed += 4
  expect(problems).toEqual([])
  // 29 on 2026-11-24: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(24)
})
