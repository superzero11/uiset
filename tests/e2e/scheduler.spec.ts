import { expect, test, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

const calendar = (page: Page) => page.getByRole("group", { name: "Team calendar", exact: true })
const track = (page: Page, name: string) => calendar(page).getByRole("group", { name })
const event = (page: Page, name: RegExp) => calendar(page).getByRole("button", { name })
const example = (page: Page) => page.locator("#example-scheduler").locator("xpath=ancestor::section[1]")

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGallery(page, "/gallery")
  await example(page).scrollIntoViewIfNeeded()
})

test("drag down an empty stretch to draw an event", async ({ page }) => {
  const friday = (await track(page, "Friday, November 20").boundingBox())!
  const hour = friday.height / 11
  await page.mouse.move(friday.x + friday.width / 2, friday.y + hour * 1 + 2)
  await page.mouse.down()
  await page.mouse.move(friday.x + friday.width / 2, friday.y + hour * 2.5, { steps: 8 })
  await page.mouse.up()
  await expect(event(page, /^New event, Friday, November 20, 9:00 AM to 10:30 AM/)).toBeVisible()
})

test("drag an event to move it, and its bottom edge to resize it", async ({ page }) => {
  const board = event(page, /^Board prep/)
  const box = (await board.boundingBox())!
  const thursday = (await track(page, "Thursday, November 19").boundingBox())!
  const hour = thursday.height / 11
  await page.mouse.move(box.x + box.width / 2, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 8 + hour, { steps: 8 })
  await page.mouse.up()
  await expect(event(page, /^Board prep, Thursday, November 19, 12:00 PM to 1:00 PM/)).toBeVisible()

  const moved = (await event(page, /^Board prep/).boundingBox())!
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height - 2)
  await page.mouse.down()
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height - 2 + hour, { steps: 8 })
  await page.mouse.up()
  await expect(event(page, /^Board prep, Thursday, November 19, 12:00 PM to 2:00 PM/)).toBeVisible()
})

test("New event opens a form that checks its times", async ({ page }) => {
  await example(page).getByRole("button", { name: "New event" }).click()
  const form = page.getByRole("form", { name: "New event" })
  await form.getByRole("textbox", { name: "Title" }).fill("Retro")
  await form.locator("input[type=time]").first().fill("16:00")
  await form.locator("input[type=time]").last().fill("15:00")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(form.getByText("It has to end after it starts.")).toBeVisible()
  await form.locator("input[type=time]").last().fill("17:00")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(event(page, /^Retro, Monday, November 16, 4:00 PM to 5:00 PM/)).toBeVisible()
})

test("the month shows each day's events; choosing a day opens it", async ({ page }) => {
  await example(page).getByRole("radio", { name: "Month" }).click()
  const month = example(page).getByRole("grid")
  await expect(month).toContainText("Launch rehearsal")
  const day = month.getByRole("gridcell", { name: /November 18/ })
  await expect(day).toHaveAccessibleName(/2 events: Standup at 9:00 AM, Launch rehearsal at 3:00 PM/)
  await day.click()
  await expect(example(page).getByRole("radio", { name: "Day" })).toBeChecked()
  await expect(event(page, /^Launch rehearsal, Wednesday/)).toBeVisible()
})

test("room bookings refuse an overlap", async ({ page }) => {
  const rooms = page.getByRole("group", { name: "Room bookings", exact: true })
  await rooms.scrollIntoViewIfNeeded()
  const standup = rooms.getByRole("button", { name: /^Standup/ })
  await standup.focus()
  await page.keyboard.press("ArrowDown")
  await expect(rooms.getByRole("button", { name: /^Standup, Studio, 12 seats, 9:00 AM/ })).toBeVisible()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await expect(rooms.getByRole("button", { name: /^Standup, Studio, 12 seats, 10:00 AM to 11:00 AM/ })).toHaveCount(0)
})

test("Enter and Space open an event, and Cancel returns focus to it", async ({ page }) => {
  const standup = event(page, /^Standup, Monday/)
  await standup.focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Standup" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(standup).toBeFocused()
  await page.keyboard.press("Space")
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(standup).toBeFocused()
})

test("Delete removes an event and hands focus to the next one", async ({ page }) => {
  await event(page, /^Design review/).focus()
  await page.keyboard.press("Delete")
  await expect(event(page, /^Design review/)).toHaveCount(0)
  await expect(event(page, /^Call with Grace/)).toBeFocused()
})

test("the dialog hands focus back: to the moved event, or a deleted one's neighbor", async ({ page }) => {
  await event(page, /^Board prep/).focus()
  await page.keyboard.press("Enter")
  let dialog = page.getByRole("dialog", { name: "Board prep" })
  await dialog.getByRole("combobox", { name: "When" }).click()
  await page.getByRole("option", { name: "Tuesday, November 17" }).click()
  await dialog.getByRole("button", { name: "Save event" }).click()
  await expect(event(page, /^Board prep, Tuesday, November 17/)).toBeFocused()

  await page.keyboard.press("Enter")
  dialog = page.getByRole("dialog", { name: "Board prep" })
  await dialog.getByRole("button", { name: "Delete event" }).click()
  await page.getByRole("button", { name: "Delete for good" }).click()
  await expect(event(page, /^Board prep/)).toHaveCount(0)
  await expect(event(page, /^Interview: platform/)).toBeFocused()
})

test("the dialog keeps the schedule's hours and steps", async ({ page }) => {
  await example(page).getByRole("button", { name: "New event" }).click()
  const form = page.getByRole("form", { name: "New event" })
  await form.getByRole("textbox", { name: "Title" }).fill("Too early")
  await form.locator("input[type=time]").first().fill("07:00")
  await form.locator("input[type=time]").last().fill("07:30")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(form.getByText("Starts at 8:00 AM or later.")).toBeVisible()
  await form.locator("input[type=time]").first().fill("09:10")
  await form.locator("input[type=time]").last().fill("09:40")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(form.getByText("Times go in steps of 15 minutes.").first()).toBeVisible()
})

test("an end before the start is tied to the Ends field, which takes focus", async ({ page }) => {
  await example(page).getByRole("button", { name: "New event" }).click()
  const form = page.getByRole("form", { name: "New event" })
  await form.getByRole("textbox", { name: "Title" }).fill("Backwards")
  await form.locator("input[type=time]").first().fill("16:00")
  await form.locator("input[type=time]").last().fill("15:00")
  await form.getByRole("button", { name: "Add event" }).click()
  const ends = form.getByRole("textbox", { name: "Ends" }).or(form.locator("input[type=time]").last())
  await expect(ends).toBeFocused()
  await expect(ends).toHaveAttribute("aria-invalid", "true")
  await expect(ends).toHaveAccessibleDescription("It has to end after it starts.")
})

test("choosing a day in the month by keyboard focuses that day's first event", async ({ page }) => {
  await example(page).getByRole("radio", { name: "Month" }).click()
  const day = example(page).getByRole("grid").getByRole("gridcell", { name: /November 18/ })
  await day.focus()
  await page.keyboard.press("Enter")
  await expect(example(page).getByRole("radio", { name: "Day" })).toBeChecked()
  await expect(event(page, /^Standup, Wednesday/)).toBeFocused()
})

test("names stay current after paging weeks", async ({ page }) => {
  await example(page).getByRole("button", { name: "Next week" }).click()
  await example(page).getByRole("button", { name: "Previous week" }).click()
  await expect(event(page, /^Standup, Monday, November 16, 9:00 AM to 9:30 AM, Atlas room$/)).toBeVisible()
})

test("room bookings take a new booking by keyboard, and refuse one that overlaps", async ({ page }) => {
  const rooms = page.getByRole("group", { name: "Room bookings", exact: true })
  const demo = rooms.locator("xpath=..")
  await demo.getByRole("button", { name: "New booking" }).click()
  const form = page.getByRole("form", { name: "New event" })
  await form.getByRole("textbox", { name: "Title" }).fill("1:1")
  await form.locator("input[type=time]").first().fill("09:30")
  await form.locator("input[type=time]").last().fill("10:30")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(form.getByText("That time overlaps another event.")).toBeVisible()
  await form.locator("input[type=time]").first().fill("11:00")
  await form.locator("input[type=time]").last().fill("12:00")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(rooms.getByRole("button", { name: /^1:1, Atlas room, 6 seats, 11:00 AM to 12:00 PM/ })).toBeFocused()
})

test("event edges and today's name clear contrast in every skin and theme", async ({ page }) => {
  test.slow() // one page load per skin and theme
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    for (const theme of ["light", "dark"]) {
      if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" })
      await openGallery(page, `/gallery?skin=${skin}&theme=${theme}`)
      await example(page).scrollIntoViewIfNeeded()
      const ratios = await calendar(page).evaluate((root) => {
        const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
        const rgb = (color: string) => {
          canvas.clearRect(0, 0, 1, 1)
          canvas.fillStyle = color
          canvas.fillRect(0, 0, 1, 1)
          return [...canvas.getImageData(0, 0, 1, 1).data].slice(0, 3)
        }
        const lum = (c: number[]) => {
          const [r, g, b] = c.map((v) => {
            const s = v / 255
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
        }
        const ratio = (a: string, b: string) => {
          const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m)
          return (x! + 0.05) / (y! + 0.05)
        }
        const surface = getComputedStyle(root).backgroundColor
        const edges = [...root.querySelectorAll<HTMLElement>(".schedule-event")].map((el) =>
          ratio(getComputedStyle(el).borderTopColor, surface),
        )
        const today = root.querySelector<HTMLElement>(".schedule-track-name[data-today]")!
        return { edge: Math.min(...edges), today: ratio(getComputedStyle(today).color, getComputedStyle(today.parentElement!).backgroundColor) }
      })
      expect(ratios.edge, `${skin} ${theme} event edge`).toBeGreaterThanOrEqual(3)
      expect(ratios.today, `${skin} ${theme} today`).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } })

  test("a sideways swipe scrolls the week instead of drawing an event, with no errors", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "drives touches through Chrome's DevTools protocol")
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await openGallery(page, "/gallery")
    const week = calendar(page)
    await week.scrollIntoViewIfNeeded()
    const before = await week.evaluate((el) => el.querySelectorAll(".schedule-event").length)
    const box = (await track(page, "Monday, November 16").boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] })
    // A finger's pace: 8px every 30ms, across an empty stretch of Monday afternoon.
    const x = box.x + box.width - 10
    const y = box.y + box.height * 0.6
    await touch("touchStart", x, y)
    for (let i = 1; i <= 20; i++) {
      await touch("touchMove", x - i * 8, y)
      await page.waitForTimeout(30)
    }
    await touch("touchEnd")
    await page.waitForTimeout(300)
    expect(await week.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
    expect(await week.evaluate((el) => el.querySelectorAll(".schedule-event").length)).toBe(before)
    expect(errors).toEqual([])
  })
})
