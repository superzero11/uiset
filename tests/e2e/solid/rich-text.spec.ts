import { expect, test, type Locator, type Page } from "@playwright/test"
import { richTextTests } from "../rich-text-tests"

// The rich text kit on Solid's page (solid/rich-text.html), with React's browser tests
// (rich-text-tests.ts): the same keys, menus, toolbar, paste, links and agents.

async function choose(page: Page, group: "Skin" | "Theme", option: string) {
  await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option, exact: true }).click()
}

richTextTests({ open: (page) => page.goto("/rich-text.html").then(() => undefined), frame: ".rich-text-stage", choose })

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

const editor = (page: Page) => page.getByRole("textbox", { name: "Release notes" })

test("the rich text page, rendered on the server, hydrates with no errors or warnings, and edits", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/rich-text")
  expect(await response!.text()).toContain('aria-label="Release notes"')
  await expect(editor(page).getByRole("heading", { name: "Release 2.4" })).toBeVisible()
  await editor(page).getByText("Before we ship").click()
  await page.keyboard.type(" now")
  await expect(editor(page).getByRole("heading", { level: 3 })).toHaveText(/Before we ship now/)
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

test("every control on the Solid rich text page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(120_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/rich-text.html")
  await expect(editor(page).getByRole("heading", { name: "Release 2.4" })).toBeVisible()
  const stage = page.locator(".rich-text-stage")
  let pressed = 0
  for (const role of ["tab", "checkbox", "button", "combobox"] as const) {
    const controls = stage.getByRole(role)
    for (let i = 0; i < (await controls.count()); i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = ((await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").trim()
      await control.scrollIntoViewIfNeeded({ timeout: 2000 })
      await control.click({ timeout: 2000 })
      await page.keyboard.press("Escape")
      pressed++
      expect(problems, `after ${role} "${name}"`).toEqual([])
    }
  }
  // 19 on 2026-11-24: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(16)
})
