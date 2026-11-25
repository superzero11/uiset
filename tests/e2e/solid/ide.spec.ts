import { expect, test, type Locator, type Page } from "@playwright/test"
import { editor, file, ide, ideTests, tab } from "../ide-tests"

// The IDE kit on Solid's page (solid/ide.html), with React's browser tests (ide-tests.ts): the
// same tree, tabs, editor, undo, palette, problems, dialogs and file drags.

ideTests({ open: (page, search = "") => page.goto(`/ide.html${search}`).then(() => undefined) })

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

test("the IDE page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/ide")
  const html = await response!.text()
  expect(html).toContain('role="tree"')
  expect(html).toContain("index.ts")
  await file(page, "greet.ts").click()
  await expect(tab(page, "greet.ts")).toHaveAttribute("aria-selected", "true")
  await editor(page, "src/lib/greet.ts").focus()
  await page.keyboard.type("// hi\n")
  await expect(tab(page, /greet\.ts, unsaved/)).toBeVisible()
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

test("typing, the palette, problems and closing tabs say nothing on the console", async ({ page }) => {
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/ide.html")
  await file(page, "config.ts").click()
  await editor(page, "src/config.ts").focus()
  await page.keyboard.type("export const x = 1\n")
  await page.keyboard.press("ControlOrMeta+s")
  await page.keyboard.press("ControlOrMeta+p")
  await page.keyboard.type("greet")
  await page.keyboard.press("Enter")
  await expect(tab(page, "greet.ts")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("ControlOrMeta+Shift+p")
  await page.keyboard.type("problems")
  await page.keyboard.press("Enter")
  await ide(page).getByRole("tab", { name: "Outline" }).click()
  await tab(page, "greet.ts").focus()
  await page.keyboard.press("Delete")
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

test("every control on the Solid IDE page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(150_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/ide.html")
  let pressed = 0
  // Files and folders, then tabs, buttons (a dialog a button opens closes with Escape) and the
  // editor; a press that opens a dialog or menu is closed again before the next.
  for (const role of ["treeitem", "tab", "button", "textbox"] as const) {
    const controls = ide(page).getByRole(role)
    const total = await controls.count()
    for (let i = 0; i < total; i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = await nameOf(control)
      await control.scrollIntoViewIfNeeded({ timeout: 2000 })
      await control.click({ timeout: 2000 })
      if (await page.getByRole("dialog").or(page.getByRole("alertdialog")).or(page.getByRole("menu")).count()) await page.keyboard.press("Escape")
      pressed++
      expect(problems, `after ${role} "${name}"`).toEqual([])
    }
  }
  expect(problems).toEqual([])
  // 23 on 2026-11-25: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(20)
})
