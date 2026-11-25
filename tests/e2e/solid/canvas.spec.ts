import { expect, test, type Locator, type Page } from "@playwright/test"
import { canvas, canvasTests, demo, node, tick } from "../canvas-tests"

// The canvas kit on Solid's page (solid/canvas.html), with React's browser tests
// (canvas-tests.ts): the same drags, keys, wires, zoom, minimap, toolbar and inspector.

canvasTests({
  open: (page, search = "") => page.goto(`/canvas.html${search}`).then(() => undefined),
  kit: (page) => page.goto("/canvas.html").then(() => undefined),
})

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

test("the canvas page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/canvas")
  const html = await response!.text()
  expect(html).toContain('aria-roledescription="canvas"')
  expect(html).toContain("Draft answer")
  await node(page, /^User question/).focus()
  await page.keyboard.press("ArrowRight")
  await expect(canvas(page).getByRole("option").and(page.locator(":focus"))).toHaveAccessibleName(/^(Answer template|Search docs)/)
  await page.keyboard.press("Space")
  await expect(page.locator(".canvas-inspector").getByRole("textbox", { name: "Title" })).toBeVisible()
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

test("moving, wiring, zooming, undoing and the inspector say nothing on the console", async ({ page }) => {
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/canvas.html")
  await tick(page)
  await node(page, /^Search docs/).focus()
  await page.keyboard.press("Alt+ArrowDown")
  await page.keyboard.press("Space")
  await page.keyboard.press("c")
  await page.keyboard.press("Escape")
  await page.keyboard.press("+")
  await page.keyboard.press("-")
  await page.keyboard.press("0")
  await demo(page).getByRole("button", { name: "Undo" }).click()
  await demo(page).getByRole("button", { name: "Redo" }).click()
  const inspector = page.locator(".canvas-inspector")
  await inspector.getByRole("textbox", { name: "Notes" }).fill("Top 3 pages")
  await inspector.getByRole("textbox", { name: "Title" }).focus()
  await expect(node(page, /^Search docs/)).toContainText("Top 3 pages")
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
      // A control counted before a press removed it isn't there to wait for.
    }, undefined, { timeout: 1000 })
    .catch(() => false)
}

const nameOf = async (control: Locator) => ((await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").trim().slice(0, 40)

test("every control on the Solid canvas page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(150_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/canvas.html")
  await tick(page)
  let pressed = 0
  // The nodes first (each press selects one, and the inspector shows it), then its fields and
  // buttons, then the toolbar and zoom. Remove and Undo run in turn, so the nodes come back.
  const stage = page.locator(".canvas-stage")
  for (const role of ["option", "textbox", "button"] as const) {
    const controls = stage.getByRole(role)
    const total = await controls.count()
    for (let i = 0; i < total; i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = await nameOf(control)
      await control.scrollIntoViewIfNeeded({ timeout: 2000 })
      await control.click({ timeout: 2000 })
      // A menu opened by Add node closes with Escape.
      if (await page.getByRole("menu").count()) await page.keyboard.press("Escape")
      pressed++
      expect(problems, `after ${role} "${name}"`).toEqual([])
    }
  }
  await expect(canvas(page)).toBeVisible()
  expect(problems).toEqual([])
  // 16 on 2026-11-25: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(14)
})
