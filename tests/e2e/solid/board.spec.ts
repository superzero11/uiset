import { expect, test, type Locator, type Page } from "@playwright/test"
import { board, boardTests, card } from "../board-tests"

// The board kit on Solid's page (solid/board.html), with React's browser tests (board-tests.ts):
// the same moves, Undo, filters, add form and card dialog.

boardTests({ open: (page) => page.goto("/board.html").then(() => undefined) })

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

test("the board page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/board")
  const html = await response!.text()
  expect(html).toContain('aria-roledescription="board"')
  expect(html).toContain("Rate-limit the public API")
  await card(page, "Keyboard shortcuts sheet").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await expect(board(page).getByRole("listbox", { name: "In progress" }).getByRole("option", { name: "Keyboard shortcuts sheet" })).toBeVisible()
  await expect(card(page, "Keyboard shortcuts sheet")).toBeFocused()
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

// A filter changes the board's options and its cards in one go: Solid warns if a card draws
// twice for it (EFFECT_RELAY_TEAR), as it did while cards took the filter as a prop.
test("searching and filtering by person say nothing on the console", async ({ page }) => {
  const problems = watch(page)
  await page.goto("/board.html")
  await card(page, "Onboarding checklist").focus()
  const search = page.getByRole("searchbox", { name: "Search cards" })
  await search.fill("api")
  await expect(board(page).getByRole("option")).toHaveCount(3)
  await search.fill("")
  await page.getByRole("combobox", { name: "Cards for" }).click()
  await page.getByRole("option", { name: "Margaret Hamilton" }).click()
  await expect(board(page).getByRole("option")).toHaveCount(2)
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

test("every control on the Solid board page, and in its card dialog, can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(120_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/board.html")
  const stage = page.locator(".board-stage")
  let pressed = 0
  // The toolbar, the Add buttons and every card: a card opens its dialog, which Escape closes.
  for (const role of ["button", "combobox", "option", "searchbox"] as const) {
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
  }

  // Inside a card's dialog: every field and button but the ones that close it, which go last.
  const dialog = page.getByRole("dialog", { name: "Onboarding checklist" })
  await card(page, "Onboarding checklist").click()
  await expect(dialog).toBeVisible()
  const closers = new Set(["Save card", "Cancel", "Close", "Delete card"])
  for (const role of ["textbox", "combobox", "checkbox", "button"] as const) {
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
  // Delete asks first; keeping the card leaves the dialog open.
  await dialog.getByRole("button", { name: "Delete card" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep the card" }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(card(page, "Onboarding checklist")).toBeFocused()
  await card(page, "Onboarding checklist").click()
  await dialog.getByRole("button", { name: "Save card" }).click()
  await expect(dialog).toBeHidden()
  pressed += 4
  expect(problems).toEqual([])
  expect(pressed).toBeGreaterThanOrEqual(20)
})
