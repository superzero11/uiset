import { expect, test, type Locator, type Page } from "@playwright/test"

// Every page of the site, and every control on it a person can switch (tabs, radios and
// segmented controls, switches, checkboxes, pressed toggles): each option, and back off.
// A page fails on an uncaught error, a React error, or its error boundary showing. On
// 2026-11-23 a package manager tab crashed the home page for four days: screenshots and axe
// never press anything. The pages come from the app itself (window.__sitePaths, as the
// prerender reads them), split into parts that run side by side.

const PARTS = 8
const roles = ["tab", "radio", "switch", "checkbox", "button[aria-pressed]"] as const

/** What went wrong on the page so far: thrown errors and React's own reports. */
function watch(page: Page) {
  const problems: string[] = []
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const text = message.text()
    if (/Rendered (more|fewer) hooks|change in the order of Hooks|Minified React error|occurred in the <|error boundary/i.test(text)) problems.push(`React: ${text.slice(0, 300)}`)
  })
  return problems
}

/** A control a person could press now: shown, enabled, and not in a preview that's a picture. */
async function pressable(control: Locator) {
  return control
    .evaluate((el) => {
      const box = el.getBoundingClientRect()
      const hidden = el.closest("[inert], [aria-hidden='true'], [hidden], [data-agent-hidden] [inert]")
      const disabled = el.matches(":disabled, [aria-disabled='true'], [data-disabled]")
      return !hidden && !disabled && box.width > 0 && box.height > 0
    })
    .catch(() => false)
}

async function press(control: Locator) {
  await control.scrollIntoViewIfNeeded({ timeout: 2000 })
  try {
    await control.click({ timeout: 2000 })
  } catch {
    // A radio card's label lies over its radio, so a click lands on the label, as a person's does.
    await control.click({ timeout: 2000, force: true })
  }
}

/** Presses each control in `scope`, by role, checking for problems after each. */
async function sweep(scope: Locator, problems: string[], where: string) {
  let pressed = 0
  const skipped: string[] = []
  for (const role of roles) {
    const controls = role === "button[aria-pressed]" ? scope.locator(role) : scope.getByRole(role)
    for (let i = 0; i < (await controls.count()); i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = await control.evaluate((el) => {
        const by = el.getAttribute("aria-labelledby")
        return (el.getAttribute("aria-label") ?? (by ? document.getElementById(by)?.textContent : null) ?? el.textContent ?? "").trim().slice(0, 40)
      })
      try {
        // A tab or radio is one option of several, each pressed in turn; a switch, checkbox or
        // toggle goes on and back off.
        await press(control)
        if (role !== "tab" && role !== "radio") await press(control)
        pressed++
      } catch (error) {
        skipped.push(`${role} "${name}": ${String(error).split("\n")[0]?.slice(0, 80)}`)
      }
      expect(problems, `after ${role} "${name}" on ${where}`).toEqual([])
    }
  }
  return { pressed, skipped }
}

/** Every page, or the ones in SWEEP_PATHS ("/,/kits") for a spot run. */
async function pagesOf(page: Page) {
  if (process.env.SWEEP_PATHS) return process.env.SWEEP_PATHS.split(",")
  await page.goto("/")
  return page.evaluate(() => (window as unknown as { __sitePaths: () => Promise<string[]> }).__sitePaths())
}

for (let part = 0; part < PARTS; part++) {
  test(`every control on every page, part ${part + 1} of ${PARTS}`, async ({ page }, info) => {
    test.setTimeout(15 * 60_000)
    const problems = watch(page)
    const paths = (await pagesOf(page)).filter((_, index) => index % PARTS === part)
    const report: string[] = []
    for (const path of paths) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      const main = page.locator("#main")
      await expect(main, `${path} draws`).not.toBeEmpty()
      const { pressed, skipped } = await sweep(main, problems, path)
      await expect(page.getByText("This page hit a problem"), `${path} after its controls`).toHaveCount(0)
      expect(problems, path).toEqual([])
      report.push(`${path}: ${pressed} pressed${skipped.length ? `, ${skipped.length} not pressable (${skipped.slice(0, 3).join("; ")})` : ""}`)
    }
    info.annotations.push({ type: "controls", description: report.join("\n") })
  })
}

test("the header's own controls (the theme), every option, on the home page", async ({ page }) => {
  const problems = watch(page)
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const header = page.locator("header").first()
  const { pressed } = await sweep(header, problems, "the header")
  expect(pressed).toBeGreaterThan(0)
  await expect(page.locator("#main")).not.toBeEmpty()
  await expect(page.getByText("This page hit a problem")).toHaveCount(0)
})
