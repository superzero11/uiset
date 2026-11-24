import AxeBuilder from "../axe"
import { expect, test, type Locator, type Page } from "@playwright/test"

// Every component in Solid on one page (solid/components.html), in the examples the React docs
// pages show: axe in every skin and scheme, and every control pressed. Solid 2 reports its
// reactivity mistakes (a prop read once, a write in the wrong place) as console warnings, so
// a warning fails here as an error does.

// The page's examples, counted by the page itself.
for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Solid components page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto(`/components.html?skin=${skin}&theme=${theme}`)
      await expect(page.locator("article.example")).toHaveCount(await examples(page))
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

/** How many examples the page says it has: every Solid example of a React docs example. */
async function examples(page: Page) {
  const count = Number(await page.locator("body").getAttribute("data-examples"))
  expect(count).toBeGreaterThan(70)
  return count
}

function watch(page: Page) {
  const problems: string[] = []
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(`${message.type()}: ${message.text().slice(0, 300)}`)
  })
  return problems
}

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

async function press(control: Locator) {
  await control.scrollIntoViewIfNeeded({ timeout: 2000 })
  try {
    await control.click({ timeout: 2000 })
  } catch {
    // A radio card's label lies over its radio, so a click lands on the label, as a person's does.
    await control.click({ timeout: 2000, force: true })
  }
}

test("every control on the Solid components page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(180_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/components.html")
  await expect(page.locator("article.example")).toHaveCount(await examples(page))
  const cards = page.locator("article.example")
  let pressed = 0
  for (let e = 0; e < (await cards.count()); e++) {
    const example = cards.nth(e)
    const title = await example.locator("h3").first().textContent()
    // Switchable controls each way, then each button, closing what it opens.
    for (const role of ["tab", "radio", "switch", "checkbox", "button"] as const) {
      const controls = example.getByRole(role)
      for (let i = 0; i < (await controls.count()); i++) {
        const control = controls.nth(i)
        if (!(await pressable(control))) continue
        await press(control)
        if (role === "switch" || role === "checkbox") await press(control)
        if (role === "button") await page.keyboard.press("Escape")
        pressed++
        expect(problems, `after a ${role} in ${title}`).toEqual([])
      }
    }
  }
  // 69 on 2026-11-24: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(65)
})
