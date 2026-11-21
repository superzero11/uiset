import { expect, test, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

const phone = (page: Page) => page.locator(".mobile-demo")
const list = (page: Page) => phone(page).getByRole("list", { name: "Messages" })
const row = (page: Page, from: string) => list(page).getByRole("listitem", { name: new RegExp(from) })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGallery(page, "/gallery")
  await phone(page).scrollIntoViewIfNeeded()
})

async function swipe(page: Page, from: string, dx: number) {
  const box = (await row(page, from).boundingBox())!
  const y = box.y + box.height / 2
  const x = dx < 0 ? box.x + box.width - 20 : box.x + 20
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + (i % 2))
  await page.mouse.up()
}

test("a short swipe shows a row's actions; a long one runs the first", async ({ page }) => {
  await swipe(page, "Linus Pauling", -120)
  // Actions sit under every row; only the open row's can be reached.
  await expect(row(page, "Linus Pauling").locator('[data-side="end"]')).not.toHaveAttribute("inert", "")
  await expect(row(page, "Grace Hopper").locator('[data-side="end"]')).toHaveAttribute("inert", "")
  await swipe(page, "Margaret Hamilton", -330)
  await expect(row(page, "Margaret Hamilton")).toHaveCount(0)
  await page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo" }).click()
  await expect(row(page, "Margaret Hamilton")).toBeVisible()
})

test("by keyboard: arrows between rows, Left to the actions, Escape back, Enter opens", { tag: "@engine" }, async ({ page }) => {
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("ArrowDown")
  await expect(row(page, "Ada Lovelace")).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(row(page, "Ada Lovelace").getByRole("button", { name: "Archive" })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(row(page, "Ada Lovelace")).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(row(page, "Ada Lovelace").getByRole("button", { name: "Read", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(row(page, "^Ada Lovelace")).toBeVisible()
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("Enter")
  // The toast's own text (UI SDK's page announcer says it too, for a moment).
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Opened “Compiler notes for Friday”")).toBeVisible()
  await expect(row(page, "^Grace Hopper")).toBeVisible()
})

test("pull down at the top to refresh; the tab bar counts what's new", { tag: "@engine" }, async ({ page }) => {
  await expect(phone(page).getByRole("button", { name: "Inbox, 2 new" })).toHaveAttribute("aria-current", "page")
  const box = (await list(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2, box.y + 20 + i * 18)
  await expect(phone(page).getByText("Release to refresh")).toBeVisible()
  await page.mouse.up()
  await expect(row(page, "Katherine Johnson")).toBeVisible()
  await expect(phone(page).getByRole("button", { name: "Inbox, 3 new" })).toBeVisible()
})

test("a short pull springs back without refreshing; the keyboard has a Refresh button", { tag: "@engine" }, async ({ page }) => {
  const box = (await list(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 50, { steps: 4 })
  await page.mouse.up()
  await expect(row(page, "Katherine Johnson")).toHaveCount(0)
  const refresh = phone(page).getByRole("button", { name: "Refresh" })
  await refresh.focus()
  await expect(refresh).toBeInViewport()
  await page.keyboard.press("Enter")
  await expect(row(page, "Katherine Johnson")).toBeVisible()
})

test("set an alarm on the wheels in a sheet, by keys and by scrolling", { tag: "@engine" }, async ({ page }) => {
  await phone(page).getByRole("button", { name: "Alarms" }).click()
  await phone(page).getByRole("button", { name: "New alarm" }).click()
  const sheet = page.getByRole("dialog", { name: "New alarm" })
  // The sheet reveals its focused element once it comes to rest, which can scroll a wheel
  // (HISTORY.md, UI SDK issue 21); in WebKit that lands a few hundred ms after it opens. Act once
  // the sheet and its wheels have held still for half a second, as a person's tap would.
  const positions = () =>
    sheet.evaluate((el) =>
      [el, ...el.querySelectorAll('[role="listbox"]')].map((n) => `${Math.round(n.getBoundingClientRect().top)}:${Math.round(n.scrollTop)}`).join(","),
    )
  await expect
    .poll(async () => {
      const before = await positions()
      await page.waitForTimeout(500)
      return before === (await positions())
    })
    .toBe(true)
  const hour = sheet.getByRole("listbox", { name: "Alarm time, hour" })
  await hour.getByRole("option", { name: "8" }).focus()
  await page.keyboard.press("ArrowDown")
  await expect(hour.getByRole("option", { name: "9" })).toHaveAttribute("aria-selected", "true")
  await sheet.getByRole("listbox", { name: "Alarm time, AM or PM" }).getByRole("option", { name: "PM" }).click()
  // Scrolling the minutes brings another one to the middle, and that's the value.
  const minutes = sheet.getByRole("listbox", { name: "Alarm time, minute" })
  await minutes.evaluate((el) => el.scrollBy({ top: 36 * 3 }))
  await expect(minutes.getByRole("option", { name: "15" })).toHaveAttribute("aria-selected", "true")
  await sheet.getByRole("button", { name: "Save alarm for 9:15 PM" }).click()
  await expect(phone(page).locator(".mobile-alarm-time", { hasText: "9:15 PM" })).toBeVisible()
})

test("a wheel opens with its value in the band", { tag: "@engine" }, async ({ page }) => {
  await phone(page).getByRole("button", { name: "Alarms" }).click()
  await phone(page).getByRole("button", { name: "New alarm" }).click()
  const hour = page.getByRole("dialog", { name: "New alarm" }).getByRole("listbox", { name: "Alarm time, hour" })
  const chosen = hour.getByRole("option", { name: "8" })
  await expect(chosen).toHaveAttribute("aria-selected", "true")
  const middle = async () => {
    const [list, option] = [(await hour.boundingBox())!, (await chosen.boundingBox())!]
    return Math.abs(list.y + list.height / 2 - (option.y + option.height / 2))
  }
  await expect.poll(middle).toBeLessThan(2)
})

test("a value an agent sets on a wheel stays, while the sheet is still settling", { tag: "@engine" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await phone(page).getByRole("button", { name: "Alarms" }).click()
  await phone(page).getByRole("button", { name: "New alarm" }).click()
  const sheet = page.getByRole("dialog", { name: "New alarm" })
  const result = await page.evaluate(() =>
    (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean }> } }).agent.act({
      steps: [{ ref: "Alarm time, hour", action: "setValue", args: ["3"] }],
    }),
  )
  expect(result.ok).toBe(true)
  // Focus moved with the value, so the sheet coming to rest doesn't scroll back to 8.
  await page.waitForTimeout(1200)
  await expect(sheet.getByRole("button", { name: "Save alarm for 3:00 AM" })).toBeVisible()
  await expect(sheet.getByRole("listbox", { name: "Alarm time, hour" }).getByRole("option", { name: "3", exact: true })).toBeFocused()
})

test("a sheet with two snap points rests at half the screen; its handle takes it to the top", { tag: "@engine" }, async ({ page }) => {
  await phone(page).getByRole("button", { name: "Settings" }).click()
  await phone(page).getByRole("button", { name: "Help" }).click()
  const sheet = page.getByRole("dialog", { name: "Help" })
  await expect(sheet).toHaveAttribute("data-snap-point", "0.5")
  const height = page.viewportSize()!.height
  const top = async () => (await sheet.boundingBox())!.y
  await expect.poll(top).toBeGreaterThan(height * 0.45)
  await expect.poll(top).toBeLessThan(height * 0.55)
  // With reduced motion, a press in the first moments after opening closes the drawer
  // instead (UI SDK, reported upstream), so this waits as a person would.
  await page.waitForTimeout(300)
  await sheet.getByRole("button", { name: "Resize Help" }).click()
  await expect(sheet).toHaveAttribute("data-expanded", "")
  // At its largest it's 85% of the screen, UI SDK's limit for a drawer.
  await expect.poll(top).toBeLessThan(height * 0.2)
})

test("an action hands focus back: to its row, or to the row now in its place", { tag: "@engine" }, async ({ page }) => {
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(row(page, "^Grace Hopper")).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowLeft")
  await expect(row(page, "Linus Pauling").getByRole("button", { name: "Archive" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(row(page, "Linus Pauling")).toHaveCount(0)
  await expect(row(page, "Margaret Hamilton")).toBeFocused()
})

test("past a full swipe, only the swiped side's first action fills the row", { tag: "@engine" }, async ({ page }) => {
  const r = row(page, "Linus Pauling")
  const box = (await r.boundingBox())!
  const [x, y] = [box.x + box.width - 20, box.y + box.height / 2]
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(x - 30 * i, y + (i % 2))
  await expect(r.locator(".swipe-content")).toHaveAttribute("data-full", "")
  const width = async (selector: string) => (await r.locator(selector).boundingBox())!.width
  const archive = (await r.locator('[data-side="end"] .swipe-action').first().boundingBox())!
  const remove = (await r.locator('[data-side="end"] .swipe-action').last().boundingBox())!
  // Archive, the first, sits at the row's edge and stretches; Delete and the other side don't.
  expect(archive.x).toBeGreaterThan(remove.x)
  expect(archive.width).toBeGreaterThan(box.width / 2)
  expect(remove.width).toBeLessThan(100)
  expect(await width('[data-side="start"] .swipe-action')).toBeLessThan(100)
  // Back to the start and let go: nothing runs.
  await page.mouse.move(x, y, { steps: 5 })
  await page.mouse.up()
  await expect(r).toBeVisible()
})

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test("a finger swipes a row aside and pulls the list to refresh", { tag: "@engine" }, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "drives touches through Chrome's DevTools protocol")
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] })
    const drag = async (x: number, y: number, dx: number, dy: number) => {
      await touch("touchStart", x, y)
      for (let i = 1; i <= 15; i++) {
        await touch("touchMove", x + (dx * i) / 15, y + (dy * i) / 15)
        await page.waitForTimeout(16)
      }
      await touch("touchEnd")
      await page.waitForTimeout(250)
    }
    const r = (await row(page, "Linus Pauling").boundingBox())!
    await drag(r.x + r.width - 30, r.y + r.height / 2, -130, 0)
    await expect(row(page, "Linus Pauling").getByRole("button", { name: "Delete" })).toBeInViewport()
    // A tap on the open row closes it, without opening the message.
    await touch("touchStart", r.x + 40, r.y + r.height / 2)
    await touch("touchEnd")
    await expect(row(page, "Linus Pauling").locator('[data-side="end"]')).toHaveAttribute("inert", "")
    await expect(page.getByText("Opened “Lab booking moved”")).toHaveCount(0)
    const l = (await list(page).boundingBox())!
    await drag(l.x + l.width / 2, l.y + 10, 0, 220)
    await expect(row(page, "Katherine Johnson")).toBeVisible()
  })
})

// The skins audit (2026-11-20): in Ink the chosen tab differed from the others by shade alone.
test("in Ink, the chosen tab's name is underlined, not only darker", { tag: "@engine" }, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("uiset-site-skin", "ink"))
  await page.goto("/docs/kits/mobile")
  const label = (name: RegExp) => page.locator(".mobile-tab").filter({ hasText: name }).first().locator(".mobile-tab-label")
  await expect(label(/Inbox/)).toHaveCSS("text-decoration-line", "underline")
  await expect(label(/Settings|Search|Calls|Profile/)).toHaveCSS("text-decoration-line", "none")
})
