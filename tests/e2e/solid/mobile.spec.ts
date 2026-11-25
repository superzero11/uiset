import { expect, test, type Locator, type Page } from "@playwright/test"
import { mobileTests, phone, row } from "../mobile-tests"

// The mobile kit on Solid's page (solid/mobile.html), with React's browser tests
// (mobile-tests.ts): the same swipes, keys, pull to refresh, wheels, sheets and tab bar.

mobileTests({
  open: (page) => page.goto("/mobile.html").then(() => undefined),
  ink: (page) => page.goto("/mobile.html?skin=ink&theme=light").then(() => undefined),
})

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

test("the mobile page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/mobile")
  const html = await response!.text()
  expect(html).toContain('aria-label="Messages"')
  expect(html).toContain("Grace Hopper")
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Opened “Compiler notes for Friday”")).toBeVisible()
  await expect(row(page, "^Grace Hopper")).toBeVisible()
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

test("swipes, the action sheet, an alarm and the help sheet say nothing on the console", async ({ page }) => {
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/mobile.html")
  await row(page, "Ada Lovelace").focus()
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Enter")
  await expect(row(page, "Ada Lovelace")).toHaveCount(0)
  await phone(page).getByRole("button", { name: "Inbox options" }).click()
  await page.getByRole("dialog", { name: "Inbox" }).getByRole("button", { name: "Mark all as read" }).click()
  await expect(phone(page).getByRole("button", { name: "Inbox", exact: true })).toBeVisible()
  // The page is scroll-locked until the sheet has closed, as on React's page.
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await phone(page).getByRole("button", { name: "Alarms" }).click()
  await phone(page).getByRole("button", { name: "New alarm" }).click()
  const sheet = page.getByRole("dialog", { name: "New alarm" })
  await sheet.getByRole("textbox", { name: "Label" }).fill("Swim")
  await sheet.getByRole("button", { name: /^Save alarm for/ }).click()
  await expect(phone(page).getByText("Swim")).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await phone(page).getByRole("button", { name: "Settings" }).click()
  await phone(page).getByRole("button", { name: "Help" }).click()
  await page.waitForTimeout(300)
  await page.getByRole("dialog", { name: "Help" }).getByRole("button", { name: "Resize Help" }).click()
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

async function pressable(control: Locator) {
  return control
    .evaluate(
      (el) => {
        const box = el.getBoundingClientRect()
        const hidden = el.closest("[inert], [aria-hidden='true'], [hidden]")
        const disabled = el.matches(":disabled, [aria-disabled='true'], [data-disabled]")
        return !hidden && !disabled && box.width > 0 && box.height > 0
      },
      undefined,
      // A control counted before a press removed it isn't there to wait for.
      { timeout: 1000 },
    )
    .catch(() => false)
}

const nameOf = async (control: Locator) => ((await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").trim().slice(0, 40)

/** Presses every control `within` shows; a press that opens a dialog or menu is closed again. */
async function pressAll(page: Page, within: Locator, roles: readonly ("button" | "option" | "textbox" | "listitem")[], problems: string[]) {
  let pressed = 0
  for (const role of roles) {
    const controls = within.getByRole(role)
    const total = await controls.count()
    for (let i = 0; i < total; i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = await nameOf(control)
      // The Refresh button and the rows' Actions menus show only on focus, for keyboards and
      // screen readers; they're pressed by key.
      if (await control.evaluate((el) => el.matches(".mobile-refresh-button, [data-swipe-menu]"))) {
        await control.focus()
        await page.keyboard.press("Enter")
      } else {
        await control.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
        await control.click({ timeout: 2000 })
      }
      if (await page.getByRole("dialog").or(page.getByRole("menu")).count()) await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog").or(page.getByRole("menu"))).toHaveCount(0)
      pressed++
      expect(problems, `after ${role} "${name}"`).toEqual([])
    }
  }
  return pressed
}

test("every control on the Solid mobile page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(150_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/mobile.html")
  let pressed = 0
  // Each section in turn: its rows and buttons, then the tab bar's next section.
  for (const section of ["Inbox", "Alarms", "Settings"]) {
    await phone(page).getByRole("navigation", { name: "Sections" }).getByRole("button", { name: new RegExp(`^${section}`) }).click()
    pressed += await pressAll(page, phone(page), ["listitem", "button"], problems)
  }
  // The new-alarm sheet's wheels, label and buttons; Save closes it.
  await phone(page).getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Alarms" }).click()
  await phone(page).getByRole("button", { name: "New alarm" }).click()
  const sheet = page.getByRole("dialog", { name: "New alarm" })
  // A press in a sheet's first moments, with reduced motion, closes it: only a script is that
  // quick (UI SDK issue 20, closed as expected; HISTORY.md). A person's press comes later.
  await page.waitForTimeout(500)
  for (const role of ["option", "textbox"] as const) {
    const controls = sheet.getByRole(role)
    const total = await controls.count()
    for (let i = 0; i < total; i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      await control.click({ timeout: 2000 })
      pressed++
    }
  }
  await sheet.getByRole("button", { name: /^Save alarm for/ }).click()
  await expect(sheet).toHaveCount(0)
  pressed++
  // The page's own skin and theme switches.
  for (const look of ["Blueprint", "Studio", "Phosphor", "Ink", "Base", "Dark", "Light", "System"]) {
    await page.getByRole("radio", { name: look, exact: true }).click()
    pressed++
  }
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
  // 68 on 2026-11-25: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(50)
})
