import { expect, test, type Locator, type Page } from "@playwright/test"
import { dataGridTests } from "../data-grid-tests"

// The data grid kit on Solid's page (solid/data-grid.html), with React's browser tests
// (data-grid-tests.ts): the same keys, editors, menus, toolbar and saved layout.

dataGridTests({ open: (page) => page.goto("/data-grid.html").then(() => undefined), frame: ".grid-stage" })

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

const grid = (page: Page) => page.getByRole("grid", { name: "Orders" })

test("the data grid page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/data-grid")
  expect(await response!.text()).toContain('role="grid"')
  await expect(grid(page)).toHaveAttribute("aria-rowcount", "10001")
  await grid(page).getByRole("columnheader", { name: /Amount/ }).click()
  await expect(grid(page).getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "ascending")
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

test("every control on the Solid data grid page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(150_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/data-grid.html")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(grid(page)).toHaveAttribute("aria-rowcount", "10001")
  const stage = page.locator(".grid-stage")
  let pressed = 0
  // The toolbar, the column headers and their menu buttons, a few rows' checkboxes and cells.
  for (const [role, limit] of [["button", 40], ["combobox", 4], ["columnheader", 10], ["checkbox", 4], ["gridcell", 12]] as const) {
    const controls = stage.getByRole(role)
    const total = Math.min(await controls.count(), limit)
    for (let i = 0; i < total; i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = ((await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").trim().slice(0, 40)
      await control.scrollIntoViewIfNeeded({ timeout: 2000 })
      await control.click({ timeout: 2000 })
      await page.keyboard.press("Escape")
      pressed++
      expect(problems, `after ${role} "${name}"`).toEqual([])
    }
  }
  // 35 on 2026-11-24: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(28)
})
